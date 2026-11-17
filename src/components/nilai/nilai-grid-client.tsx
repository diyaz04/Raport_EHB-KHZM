"use client";

import * as React from "react";
import Link from "next/link";
import {
  LockIcon,
  UnlockIcon,
  CheckIcon,
  AlertCircleIcon,
  Loader2Icon,
  BookOpenIcon,
  BookmarkIcon,
  GraduationCapIcon,
  ShieldAlertIcon,
  ChevronLeftIcon,
  SparklesIcon,
  DownloadIcon,
  UploadIcon,
  AwardIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { notify } from "@/lib/notify";
import {
  saveNilaiCellAction,
  saveCatatanCellAction,
} from "@/app/actions/nilai";
import { generateTemplateNilaiBuffer } from "@/lib/excel/template-nilai";
import { ImportNilaiDialog } from "@/components/nilai/import-nilai-dialog";
import { FinalisasiDialog } from "@/components/nilai/finalisasi-dialog";
import { BukaKunciDialog } from "@/components/nilai/buka-kunci-dialog";
import { CetakMassalDialog } from "@/components/nilai/cetak-massal-dialog";

export interface MarhalahMapelCol {
  id: string;
  urutan: number;
  tipe: "nilai" | "kelengkapan";
  dihitung_total: boolean;
  mapel?: {
    nama: string;
  };
  kitab?: {
    nama: string;
  } | null;
}

export interface SantriGridRow {
  enrollment_id: string;
  santri_id: string;
  nama: string;
  nis: string | null;
  jenis_kelamin: "L" | "P";
  nilaiMap: Record<string, number | null>; // key: marhalah_mapel_id, value: angka
  catatan: {
    akhlak: string | null;
    ketekunan: string | null;
    kerapihan: string | null;
    kebersihan: string | null;
    sakit: number;
    izin: number;
    alpa: number;
    saran_wali_kelas?: string | null;
  };
}

interface NilaiGridClientProps {
  marhalah: {
    id: string;
    nama: string;
    kode: string;
  };
  semester: {
    id: string;
    jenis: "Ganjil" | "Genap";
    tahun_ajaran?: {
      nama: string;
      kode: string;
    };
  };
  isFinal: boolean;
  isAdminDirect: boolean;
  isWaliKelas: boolean;
  allowedMapelIds: string[];
  mapelColumns: MarhalahMapelCol[];
  santriRows: SantriGridRow[];
  backUrl: string;
}

type CellStatus = "idle" | "saving" | "saved" | "error";

export function NilaiGridClient({
  marhalah,
  semester,
  isFinal,
  isAdminDirect,
  isWaliKelas,
  allowedMapelIds,
  mapelColumns,
  santriRows,
  backUrl,
}: NilaiGridClientProps) {
  // Local state untuk grid nilai santri
  const [gridData, setGridData] = React.useState<SantriGridRow[]>(santriRows);
  // Status penyimpanan per sel: key = `${enrollment_id}_${marhalah_mapel_id}` atau `${enrollment_id}_${field}`
  const [cellStatuses, setCellStatuses] = React.useState<Record<string, CellStatus>>({});
  const [isImportDialogOpen, setIsImportDialogOpen] = React.useState(false);
  const [isFinalisasiOpen, setIsFinalisasiOpen] = React.useState(false);
  const [isBukaKunciOpen, setIsBukaKunciOpen] = React.useState(false);

  const canEditAnyKepribadian = !isFinal && (isAdminDirect || isWaliKelas);

  // Hitung jumlah sel kosong mapel bertipe 'nilai'
  const mapelNilaiCols = React.useMemo(
    () => mapelColumns.filter((m) => m.tipe === "nilai"),
    [mapelColumns]
  );

  const totalMissingCells = React.useMemo(() => {
    let count = 0;
    gridData.forEach((row) => {
      mapelNilaiCols.forEach((col) => {
        if (row.nilaiMap[col.id] === null || row.nilaiMap[col.id] === undefined) {
          count++;
        }
      });
    });
    return count;
  }, [gridData, mapelNilaiCols]);

  const isAllNilaiFilled = totalMissingCells === 0 && gridData.length > 0;

  // Unduh Template Excel langsung dari grid
  const handleDownloadTemplate = async () => {
    try {
      const buffer = await generateTemplateNilaiBuffer({
        marhalah,
        semester,
        mapelColumns,
        santriList: gridData,
      });
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const cleanMarhalah = marhalah.nama.replace(/\s+/g, "_");
      a.download = `Template_Nilai_${cleanMarhalah}_${semester.jenis}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      notify.success("Template Excel nilai berhasil diunduh.");
    } catch (err) {
      console.error(err);
      notify.error("Gagal membuat template Excel nilai.");
    }
  };

  // Set status helper
  const updateCellStatus = (key: string, status: CellStatus) => {
    setCellStatuses((prev) => ({ ...prev, [key]: status }));
    if (status === "saved") {
      setTimeout(() => {
        setCellStatuses((prev) => ({ ...prev, [key]: "idle" }));
      }, 2000);
    }
  };

  // Handler simpan Nilai Mapel
  const handleNilaiChange = (
    enrollmentId: string,
    marhalahMapelId: string,
    rawValue: string
  ) => {
    if (isFinal) return;

    const trimmed = rawValue.trim();
    let numVal: number | null = null;

    if (trimmed !== "") {
      const parsed = parseInt(trimmed, 10);
      if (isNaN(parsed) || parsed < 0 || parsed > 100) {
        notify.error("Nilai harus berupa angka bulat antara 0 - 100.");
        return;
      }
      numVal = parsed;
    }

    // Update local state segera
    setGridData((prev) =>
      prev.map((row) => {
        if (row.enrollment_id === enrollmentId) {
          return {
            ...row,
            nilaiMap: {
              ...row.nilaiMap,
              [marhalahMapelId]: numVal,
            },
          };
        }
        return row;
      })
    );

    const cellKey = `nilai_${enrollmentId}_${marhalahMapelId}`;
    updateCellStatus(cellKey, "saving");

    // Simpan ke server
    saveNilaiCellAction({
      enrollment_id: enrollmentId,
      semester_id: semester.id,
      marhalah_mapel_id: marhalahMapelId,
      angka: numVal,
    }).then((res) => {
      if (res.ok) {
        updateCellStatus(cellKey, "saved");
      } else {
        updateCellStatus(cellKey, "error");
        notify.error(res.message);
      }
    });
  };

  // Handler simpan Catatan Kepribadian (Select 4 Predikat)
  const handleKepribadianChange = (
    enrollmentId: string,
    field: "akhlak" | "ketekunan" | "kerapihan" | "kebersihan",
    val: string
  ) => {
    if (!canEditAnyKepribadian) return;

    const finalVal = val === "none" ? null : val;

    setGridData((prev) =>
      prev.map((row) => {
        if (row.enrollment_id === enrollmentId) {
          return {
            ...row,
            catatan: {
              ...row.catatan,
              [field]: finalVal,
            },
          };
        }
        return row;
      })
    );

    const cellKey = `catatan_${enrollmentId}_${field}`;
    updateCellStatus(cellKey, "saving");

    saveCatatanCellAction({
      enrollment_id: enrollmentId,
      semester_id: semester.id,
      field,
      value: finalVal,
    }).then((res) => {
      if (res.ok) {
        updateCellStatus(cellKey, "saved");
      } else {
        updateCellStatus(cellKey, "error");
        notify.error(res.message);
      }
    });
  };

  // Handler simpan Presensi (sakit, izin, alpa)
  const handlePresensiChange = (
    enrollmentId: string,
    field: "sakit" | "izin" | "alpa",
    rawValue: string
  ) => {
    if (!canEditAnyKepribadian) return;

    const parsed = parseInt(rawValue.trim(), 10);
    const count = isNaN(parsed) || parsed < 0 ? 0 : parsed;

    setGridData((prev) =>
      prev.map((row) => {
        if (row.enrollment_id === enrollmentId) {
          return {
            ...row,
            catatan: {
              ...row.catatan,
              [field]: count,
            },
          };
        }
        return row;
      })
    );

    const cellKey = `presensi_${enrollmentId}_${field}`;
    updateCellStatus(cellKey, "saving");

    saveCatatanCellAction({
      enrollment_id: enrollmentId,
      semester_id: semester.id,
      field,
      value: count,
    }).then((res) => {
      if (res.ok) {
        updateCellStatus(cellKey, "saved");
      } else {
        updateCellStatus(cellKey, "error");
        notify.error(res.message);
      }
    });
  };

  return (
    <div className="space-y-4">
      {/* HEADER BAR */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-200 pb-4">
        <div className="flex items-center gap-3">
          <Link href={backUrl}>
            <Button variant="outline" size="sm" className="h-8 w-8 p-0">
              <ChevronLeftIcon className="h-4 w-4" />
              <span className="sr-only">Kembali</span>
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold tracking-tight text-zinc-900">
                Lembar Nilai {marhalah.nama}
              </h2>
              <Badge variant="outline" className="font-mono text-xs">
                {marhalah.kode}
              </Badge>
            </div>
            <div className="text-xs text-zinc-500 mt-0.5">
              Semester {semester.jenis} • TA {semester.tahun_ajaran?.nama ?? "-"}
            </div>
          </div>
        </div>

        {/* ACTIONS & STATUS BADGES */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Tombol Unduh Template & Import Excel */}
          <div className="flex items-center gap-1.5 mr-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDownloadTemplate}
              className="h-8 text-xs border-zinc-300 text-zinc-700 hover:bg-zinc-100"
            >
              <DownloadIcon className="mr-1.5 h-3.5 w-3.5 text-zinc-600" />
              Unduh Template
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isFinal}
              onClick={() => setIsImportDialogOpen(true)}
              className="h-8 text-xs border-emerald-600/40 text-emerald-800 bg-emerald-50/50 hover:bg-emerald-100"
            >
              <UploadIcon className="mr-1.5 h-3.5 w-3.5 text-emerald-700" />
              Import Excel
            </Button>
          </div>

          {/* Status Final / Draft */}
          {isFinal ? (
            <Badge variant="destructive" className="text-xs gap-1 py-1 px-2.5">
              <LockIcon className="h-3 w-3" />
              <span>RAPORT FINAL (Terkunci)</span>
            </Badge>
          ) : (
            <Badge className="bg-emerald-700 text-white text-xs gap-1 py-1 px-2.5">
              <UnlockIcon className="h-3 w-3" />
              <span>DRAFT (Dapat Diedit)</span>
            </Badge>
          )}

          {/* Tombol Finalisasi (Wali Kelas / Admin) */}
          {!isFinal && (isAdminDirect || isWaliKelas) && (
            isAllNilaiFilled ? (
              <Button
                type="button"
                size="sm"
                onClick={() => setIsFinalisasiOpen(true)}
                className="h-8 text-xs bg-emerald-700 hover:bg-emerald-800 text-white gap-1.5 shadow-2xs font-semibold"
              >
                <AwardIcon className="h-3.5 w-3.5" />
                Finalisasi Raport
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                disabled
                variant="outline"
                className="h-8 text-xs text-zinc-400 border-zinc-200 cursor-not-allowed gap-1.5"
                title={`Belum dapat difinalisasi: masih terdapat ${totalMissingCells} sel nilai yang kosong.`}
              >
                <AwardIcon className="h-3.5 w-3.5 text-zinc-300" />
                Finalisasi ({totalMissingCells} Kosong)
              </Button>
            )
          )}

          {/* Tombol Buka Kunci (Khusus Administrator) */}
          {isFinal && isAdminDirect && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setIsBukaKunciOpen(true)}
              className="h-8 text-xs text-destructive border-red-200 bg-red-50 hover:bg-red-100 gap-1.5 font-medium"
            >
              <UnlockIcon className="h-3.5 w-3.5" />
              Buka Kunci
            </Button>
          )}

          {/* Tombol Cetak Raport Kelas (Hanya Status Final) */}
          {isFinal && (
            <CetakMassalDialog
              marhalahId={marhalah.id}
              marhalahNama={marhalah.nama}
              semesterId={semester.id}
              semesterJenis={semester.jenis}
              tahunAjaranNama={semester.tahun_ajaran?.nama ?? "-"}
              isFinal={isFinal}
            />
          )}

          {/* Mode Admin Langsung */}
          {isAdminDirect ? (
            <Badge variant="outline" className="border-amber-400 bg-amber-50 text-amber-900 text-xs gap-1">
              <ShieldAlertIcon className="h-3 w-3 text-amber-600" />
              <span>Mode Admin Langsung (Semua Mapel Terbuka)</span>
            </Badge>
          ) : isWaliKelas ? (
            <Badge variant="outline" className="border-primary/40 bg-emerald-50 text-emerald-800 text-xs gap-1">
              <GraduationCapIcon className="h-3 w-3 text-primary" />
              <span>Wali Kelas</span>
            </Badge>
          ) : (
            <Badge variant="outline" className="text-zinc-600 text-xs gap-1">
              <BookOpenIcon className="h-3 w-3" />
              <span>Guru Pengampu</span>
            </Badge>
          )}
        </div>
      </div>

      {/* PERINGATAN BILA STATUS FINAL */}
      {isFinal && (
        <div className="flex items-center gap-2.5 p-3.5 bg-red-50 border border-red-200 text-red-900 rounded-lg text-xs">
          <LockIcon className="h-4 w-4 shrink-0 text-destructive" />
          <div>
            <strong>Status Raport FINAL:</strong> Seluruh nilai dan catatan semester untuk marhalah ini telah difinalisasi dan dikunci. Tidak ada perubahan nilai yang dapat disimpan.
          </div>
        </div>
      )}

      {/* PETUNJUK INPUT AUTOSAVE */}
      <div className="flex items-center justify-between text-xs text-zinc-500 bg-zinc-50 p-2.5 rounded-md border border-zinc-200">
        <div className="flex items-center gap-2">
          <SparklesIcon className="h-3.5 w-3.5 text-primary" />
          <span>Setiap nilai yang Anda masukkan akan <strong>tersimpan otomatis (autosave)</strong> ke server secara instan.</span>
        </div>
        <div className="hidden sm:flex items-center gap-4 text-[11px]">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-emerald-500"></span> Tersimpan
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-amber-400"></span> Menyimpan...
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-destructive"></span> Gagal
          </span>
        </div>
      </div>

      {/* MATRIX GRID TABLE */}
      <div className="rounded-lg border border-zinc-200 bg-white shadow-2xs overflow-hidden">
        <div className="max-h-[68vh] overflow-auto">
          <Table className="border-collapse">
            <TableHeader className="bg-zinc-50 sticky top-0 z-20 shadow-xs">
              <TableRow>
                {/* STICKY COLUMNS: NO, NIS, NAMA */}
                <TableHead className="w-12 text-center text-xs font-bold text-zinc-700 bg-zinc-100 sticky left-0 z-30 border-r border-zinc-200">
                  No
                </TableHead>
                <TableHead className="w-24 text-xs font-bold text-zinc-700 bg-zinc-100 sticky left-12 z-30 border-r border-zinc-200">
                  NIS
                </TableHead>
                <TableHead className="min-w-[180px] text-xs font-bold text-zinc-700 bg-zinc-100 sticky left-36 z-30 border-r border-zinc-300 shadow-sm">
                  Nama Santri
                </TableHead>

                {/* KOLOM MATA PELAJARAN (1-12) */}
                {mapelColumns.map((col) => {
                  const isAllowed = !isFinal && (isAdminDirect || isWaliKelas || allowedMapelIds.includes(col.id));

                  return (
                    <TableHead
                      key={col.id}
                      className={`min-w-[100px] max-w-[120px] text-center p-2 border-r border-zinc-200 ${
                        isAllowed ? "bg-emerald-50/60" : "bg-zinc-50 opacity-80"
                      }`}
                    >
                      <div className="font-bold text-xs text-zinc-900 truncate">
                        {col.mapel?.nama ?? "-"}
                      </div>
                      {col.kitab?.nama ? (
                        <div className="text-[10px] text-emerald-800 truncate flex items-center justify-center gap-1">
                          <BookmarkIcon className="h-2.5 w-2.5 shrink-0" />
                          <span className="truncate">{col.kitab.nama}</span>
                        </div>
                      ) : null}
                      <div className="mt-0.5">
                        {col.tipe === "nilai" ? (
                          <Badge variant="outline" className="text-[9px] py-0 px-1 border-emerald-300 text-emerald-800">
                            0-100
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[9px] py-0 px-1 border-sky-300 text-sky-800 bg-sky-50">
                            Kelengkapan
                          </Badge>
                        )}
                      </div>
                    </TableHead>
                  );
                })}

                {/* KOLOM KEPRIBADIAN (4 PREDIKAT) */}
                <TableHead className="w-28 text-center text-xs font-bold text-zinc-700 border-r border-zinc-200 bg-zinc-50">
                  Akhlak
                </TableHead>
                <TableHead className="w-28 text-center text-xs font-bold text-zinc-700 border-r border-zinc-200 bg-zinc-50">
                  Ketekunan
                </TableHead>
                <TableHead className="w-28 text-center text-xs font-bold text-zinc-700 border-r border-zinc-200 bg-zinc-50">
                  Kerapihan
                </TableHead>
                <TableHead className="w-28 text-center text-xs font-bold text-zinc-700 border-r border-zinc-200 bg-zinc-50">
                  Kebersihan
                </TableHead>

                {/* KOLOM PRESENSI (SAKIT, IZIN, ALPA) */}
                <TableHead className="w-16 text-center text-xs font-bold text-zinc-700 border-r border-zinc-200 bg-zinc-50">
                  Sakit
                </TableHead>
                <TableHead className="w-16 text-center text-xs font-bold text-zinc-700 border-r border-zinc-200 bg-zinc-50">
                  Izin
                </TableHead>
                <TableHead className="w-16 text-center text-xs font-bold text-zinc-700 bg-zinc-50">
                  Alpa
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {gridData.length > 0 ? (
                gridData.map((row, index) => {
                  const no = index + 1;
                  return (
                    <TableRow key={row.enrollment_id} className="hover:bg-zinc-50/70">
                      {/* STICKY NO */}
                      <TableCell className="text-center font-mono text-xs font-semibold text-zinc-500 bg-white sticky left-0 z-10 border-r border-zinc-200">
                        {no}
                      </TableCell>

                      {/* STICKY NIS */}
                      <TableCell className="font-mono text-xs text-zinc-600 bg-white sticky left-12 z-10 border-r border-zinc-200">
                        {row.nis ? row.nis : "-"}
                      </TableCell>

                      {/* STICKY NAMA SANTRI */}
                      <TableCell className="font-semibold text-xs text-zinc-900 bg-white sticky left-36 z-10 border-r border-zinc-300 shadow-sm whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`inline-block h-2 w-2 rounded-full ${
                              row.jenis_kelamin === "L" ? "bg-sky-400" : "bg-rose-400"
                            }`}
                          />
                          <span>{row.nama}</span>
                        </div>
                      </TableCell>

                      {/* SEL NILAI PER MAPEL */}
                      {mapelColumns.map((col) => {
                        const isKelengkapan = col.tipe === "kelengkapan";
                        const isAllowed =
                          !isFinal &&
                          !isKelengkapan &&
                          (isAdminDirect || isWaliKelas || allowedMapelIds.includes(col.id));

                        const currentVal = row.nilaiMap[col.id];
                        const cellKey = `nilai_${row.enrollment_id}_${col.id}`;
                        const status = cellStatuses[cellKey] || "idle";

                        if (isKelengkapan) {
                          return (
                            <TableCell key={col.id} className="text-center p-1.5 bg-zinc-50 border-r border-zinc-200">
                              <span className="text-[11px] text-zinc-400 italic">Lengkap</span>
                            </TableCell>
                          );
                        }

                        return (
                          <TableCell
                            key={col.id}
                            className={`text-center p-1.5 border-r border-zinc-200 relative ${
                              !isAllowed ? "bg-zinc-50/80" : ""
                            }`}
                          >
                            <div className="relative flex items-center justify-center">
                              <input
                                type="number"
                                min={0}
                                max={100}
                                disabled={!isAllowed}
                                defaultValue={currentVal !== null && currentVal !== undefined ? currentVal : ""}
                                onBlur={(e) => handleNilaiChange(row.enrollment_id, col.id, e.target.value)}
                                className={`h-8 w-16 text-center font-mono font-bold text-xs rounded border transition-all ${
                                  !isAllowed
                                    ? "bg-zinc-100 text-zinc-400 border-zinc-200 cursor-not-allowed"
                                    : status === "saving"
                                    ? "border-amber-400 bg-amber-50/40 text-amber-900"
                                    : status === "saved"
                                    ? "border-emerald-500 bg-emerald-50/50 text-emerald-950 ring-1 ring-emerald-400"
                                    : status === "error"
                                    ? "border-destructive bg-red-50 text-destructive ring-1 ring-destructive"
                                    : "border-zinc-300 text-zinc-900 hover:border-zinc-400 focus:border-primary focus:ring-1 focus:ring-primary"
                                }`}
                              />
                              {/* Status Badge Mini */}
                              {status === "saving" && (
                                <Loader2Icon className="h-3 w-3 animate-spin text-amber-500 absolute -top-1 -right-1" />
                              )}
                              {status === "saved" && (
                                <CheckIcon className="h-3 w-3 text-emerald-600 absolute -top-1 -right-1" />
                              )}
                              {status === "error" && (
                                <AlertCircleIcon className="h-3 w-3 text-destructive absolute -top-1 -right-1" />
                              )}
                            </div>
                          </TableCell>
                        );
                      })}

                      {/* SEL KEPRIBADIAN: AKHLAK */}
                      <TableCell className="p-1 border-r border-zinc-200">
                        <Select
                          disabled={!canEditAnyKepribadian}
                          value={row.catatan.akhlak || "none"}
                          onValueChange={(val) => handleKepribadianChange(row.enrollment_id, "akhlak", val)}
                        >
                          <SelectTrigger className="h-8 text-[11px] px-2 w-full">
                            <SelectValue placeholder="-" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">-</SelectItem>
                            <SelectItem value="Sangat Baik">Sangat Baik</SelectItem>
                            <SelectItem value="Baik">Baik</SelectItem>
                            <SelectItem value="Cukup">Cukup</SelectItem>
                            <SelectItem value="Kurang">Kurang</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>

                      {/* SEL KEPRIBADIAN: KETEKUNAN */}
                      <TableCell className="p-1 border-r border-zinc-200">
                        <Select
                          disabled={!canEditAnyKepribadian}
                          value={row.catatan.ketekunan || "none"}
                          onValueChange={(val) => handleKepribadianChange(row.enrollment_id, "ketekunan", val)}
                        >
                          <SelectTrigger className="h-8 text-[11px] px-2 w-full">
                            <SelectValue placeholder="-" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">-</SelectItem>
                            <SelectItem value="Sangat Baik">Sangat Baik</SelectItem>
                            <SelectItem value="Baik">Baik</SelectItem>
                            <SelectItem value="Cukup">Cukup</SelectItem>
                            <SelectItem value="Kurang">Kurang</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>

                      {/* SEL KEPRIBADIAN: KERAPIHAN */}
                      <TableCell className="p-1 border-r border-zinc-200">
                        <Select
                          disabled={!canEditAnyKepribadian}
                          value={row.catatan.kerapihan || "none"}
                          onValueChange={(val) => handleKepribadianChange(row.enrollment_id, "kerapihan", val)}
                        >
                          <SelectTrigger className="h-8 text-[11px] px-2 w-full">
                            <SelectValue placeholder="-" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">-</SelectItem>
                            <SelectItem value="Sangat Baik">Sangat Baik</SelectItem>
                            <SelectItem value="Baik">Baik</SelectItem>
                            <SelectItem value="Cukup">Cukup</SelectItem>
                            <SelectItem value="Kurang">Kurang</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>

                      {/* SEL KEPRIBADIAN: KEBERSIHAN */}
                      <TableCell className="p-1 border-r border-zinc-200">
                        <Select
                          disabled={!canEditAnyKepribadian}
                          value={row.catatan.kebersihan || "none"}
                          onValueChange={(val) => handleKepribadianChange(row.enrollment_id, "kebersihan", val)}
                        >
                          <SelectTrigger className="h-8 text-[11px] px-2 w-full">
                            <SelectValue placeholder="-" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">-</SelectItem>
                            <SelectItem value="Sangat Baik">Sangat Baik</SelectItem>
                            <SelectItem value="Baik">Baik</SelectItem>
                            <SelectItem value="Cukup">Cukup</SelectItem>
                            <SelectItem value="Kurang">Kurang</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>

                      {/* SEL PRESENSI: SAKIT */}
                      <TableCell className="p-1 border-r border-zinc-200 text-center">
                        <input
                          type="number"
                          min={0}
                          disabled={!canEditAnyKepribadian}
                          defaultValue={row.catatan.sakit}
                          onBlur={(e) => handlePresensiChange(row.enrollment_id, "sakit", e.target.value)}
                          className={`h-8 w-12 text-center font-mono text-xs rounded border ${
                            !canEditAnyKepribadian
                              ? "bg-zinc-100 text-zinc-400 border-zinc-200 cursor-not-allowed"
                              : "border-zinc-300 text-zinc-900 focus:border-primary"
                          }`}
                        />
                      </TableCell>

                      {/* SEL PRESENSI: IZIN */}
                      <TableCell className="p-1 border-r border-zinc-200 text-center">
                        <input
                          type="number"
                          min={0}
                          disabled={!canEditAnyKepribadian}
                          defaultValue={row.catatan.izin}
                          onBlur={(e) => handlePresensiChange(row.enrollment_id, "izin", e.target.value)}
                          className={`h-8 w-12 text-center font-mono text-xs rounded border ${
                            !canEditAnyKepribadian
                              ? "bg-zinc-100 text-zinc-400 border-zinc-200 cursor-not-allowed"
                              : "border-zinc-300 text-zinc-900 focus:border-primary"
                          }`}
                        />
                      </TableCell>

                      {/* SEL PRESENSI: ALPA */}
                      <TableCell className="p-1 text-center">
                        <input
                          type="number"
                          min={0}
                          disabled={!canEditAnyKepribadian}
                          defaultValue={row.catatan.alpa}
                          onBlur={(e) => handlePresensiChange(row.enrollment_id, "alpa", e.target.value)}
                          className={`h-8 w-12 text-center font-mono text-xs rounded border ${
                            !canEditAnyKepribadian
                              ? "bg-zinc-100 text-zinc-400 border-zinc-200 cursor-not-allowed"
                              : "border-zinc-300 text-zinc-900 focus:border-primary"
                          }`}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={3 + mapelColumns.length + 4 + 3}
                    className="h-32 text-center text-xs text-zinc-400"
                  >
                    Tidak ada santri yang terdaftar di marhalah kelas ini untuk tahun ajaran aktif.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* DIALOG IMPORT NILAI EXCEL */}
      <ImportNilaiDialog
        open={isImportDialogOpen}
        onOpenChange={setIsImportDialogOpen}
        marhalah={marhalah}
        semester={semester}
        mapelColumns={mapelColumns}
        santriRows={gridData}
        allowedMapelIds={allowedMapelIds}
        isWaliKelas={isWaliKelas}
        isAdminDirect={isAdminDirect}
        onSuccess={() => {
          // Success callback
        }}
      />

      {/* DIALOG FINALISASI RAPORT & NILAI SERI */}
      <FinalisasiDialog
        open={isFinalisasiOpen}
        onOpenChange={setIsFinalisasiOpen}
        marhalahId={marhalah.id}
        semesterId={semester.id}
        marhalahNama={marhalah.nama}
        semesterJenis={semester.jenis}
        tahunAjaranNama={semester.tahun_ajaran?.nama ?? "-"}
      />

      {/* DIALOG BUKA KUNCI RAPORT (ADMIN ONLY) */}
      <BukaKunciDialog
        open={isBukaKunciOpen}
        onOpenChange={setIsBukaKunciOpen}
        marhalahId={marhalah.id}
        semesterId={semester.id}
        marhalahNama={marhalah.nama}
      />
    </div>
  );
}

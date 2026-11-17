"use client";

import * as React from "react";
import ExcelJS from "exceljs";
import {
  UploadIcon,
  DownloadIcon,
  FileSpreadsheetIcon,
  CheckCircle2Icon,
  XCircleIcon,
  AlertCircleIcon,
  ChevronRightIcon,
  ChevronLeftIcon,
  InfoIcon,
  RefreshCwIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  generateTemplateNilaiBuffer,
  type TemplateMapelItem,
  type TemplateSantriItem,
} from "@/lib/excel/template-nilai";
import {
  importNilaiExcelAction,
  type ImportNilaiPayload,
  type ImportNilaiResult,
} from "@/app/actions/import-nilai";
import type { MarhalahMapelCol, SantriGridRow } from "./nilai-grid-client";

interface ImportNilaiDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
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
  mapelColumns: MarhalahMapelCol[];
  santriRows: SantriGridRow[];
  allowedMapelIds: string[];
  isWaliKelas: boolean;
  isAdminDirect: boolean;
  onSuccess?: () => void;
}

interface ParsedImportRow {
  rowNumber: number;
  enrollment_id: string;
  nis: string | null;
  nama: string;
  nilaiMap: Record<string, number | null>;
  catatan: {
    akhlak: string | null;
    ketekunan: string | null;
    kerapihan: string | null;
    kebersihan: string | null;
    sakit: number | null;
    izin: number | null;
    alpa: number | null;
  };
  errors: string[];
  warnings: string[];
  isValid: boolean;
}

const VALID_PREDIKATS = ["Sangat Baik", "Baik", "Cukup", "Kurang"];

export function ImportNilaiDialog({
  open,
  onOpenChange,
  marhalah,
  semester,
  mapelColumns,
  santriRows,
  allowedMapelIds,
  isWaliKelas,
  isAdminDirect,
  onSuccess,
}: ImportNilaiDialogProps) {
  // Steps: 1: Upload & Opsi, 2: Preview & Validasi, 3: Konfirmasi, 4: Ringkasan
  const [step, setStep] = React.useState<1 | 2 | 3 | 4>(1);
  const [isPending, startTransition] = React.useTransition();

  const [file, setFile] = React.useState<File | null>(null);
  const [timpa, setTimpa] = React.useState<boolean>(false);
  const [parsedRows, setParsedRows] = React.useState<ParsedImportRow[]>([]);
  const [importResult, setImportResult] = React.useState<ImportNilaiResult | null>(null);

  const resetForm = () => {
    setStep(1);
    setFile(null);
    setTimpa(false);
    setParsedRows([]);
    setImportResult(null);
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      resetForm();
    }
    onOpenChange(isOpen);
  };

  // Unduh Template Excel (dengan santri terisi)
  const handleDownloadTemplate = async () => {
    try {
      const templateSantri: TemplateSantriItem[] = santriRows.map((s) => ({
        enrollment_id: s.enrollment_id,
        santri_id: s.santri_id,
        nis: s.nis,
        nama: s.nama,
        jenis_kelamin: s.jenis_kelamin,
        nilaiMap: s.nilaiMap,
        catatan: s.catatan,
      }));

      const templateMapels: TemplateMapelItem[] = mapelColumns.map((m) => ({
        id: m.id,
        urutan: m.urutan,
        tipe: m.tipe,
        dihitung_total: m.dihitung_total,
        mapel: m.mapel,
        kitab: m.kitab,
      }));

      const buffer = await generateTemplateNilaiBuffer({
        marhalah,
        semester,
        mapelColumns: templateMapels,
        santriList: templateSantri,
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  // Parsing file Excel
  const handleParseExcel = async () => {
    if (!file) {
      notify.error("Silakan pilih file Excel terlebih dahulu.");
      return;
    }

    try {
      const buffer = await file.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);

      const sheet = workbook.getWorksheet("Lembar Nilai") || workbook.worksheets[0];
      if (!sheet) {
        notify.error("Lembar kerja 'Lembar Nilai' tidak ditemukan di dalam file Excel.");
        return;
      }

      // Baris 1: Header Label
      const row1 = sheet.getRow(1);
      // Baris 2: Technical keys (jika ada)
      const row2 = sheet.getRow(2);

      const colIndexToKey = new Map<number, string>();
      const colIndexToName = new Map<number, string>();

      // Pemetaan kolom
      row1.eachCell((cell, colNumber) => {
        const val1 = String(cell.value ?? "").trim();
        const val2 = String(row2.getCell(colNumber).value ?? "").trim();

        colIndexToName.set(colNumber, val1);

        // Jika baris 2 memiliki kunci teknis (misal 'enrollment_id', 'mm_<uuid>', 'akhlak', dll)
        if (val2 && (val2 === "enrollment_id" || val2.startsWith("mm_") || val2 === "nis" || val2 === "nama" || val2 === "jk" || ["akhlak", "ketekunan", "kerapihan", "kebersihan", "sakit", "izin", "alpa"].includes(val2))) {
          colIndexToKey.set(colNumber, val2);
        } else {
          // Fallback pemetaan berbasis nama kolom di row 1
          const lower = val1.toLowerCase();
          if (lower.includes("pendaftaran") || lower.includes("enrollment")) {
            colIndexToKey.set(colNumber, "enrollment_id");
          } else if (lower === "nis") {
            colIndexToKey.set(colNumber, "nis");
          } else if (lower.includes("nama")) {
            colIndexToKey.set(colNumber, "nama");
          } else if (lower === "jk" || lower.includes("kelamin")) {
            colIndexToKey.set(colNumber, "jk");
          } else if (lower === "akhlak") {
            colIndexToKey.set(colNumber, "akhlak");
          } else if (lower === "ketekunan") {
            colIndexToKey.set(colNumber, "ketekunan");
          } else if (lower === "kerapihan") {
            colIndexToKey.set(colNumber, "kerapihan");
          } else if (lower === "kebersihan") {
            colIndexToKey.set(colNumber, "kebersihan");
          } else if (lower === "sakit") {
            colIndexToKey.set(colNumber, "sakit");
          } else if (lower === "izin") {
            colIndexToKey.set(colNumber, "izin");
          } else if (lower === "alpa") {
            colIndexToKey.set(colNumber, "alpa");
          } else {
            // Cek apakah cocok dengan mapel
            const matchedMapel = mapelColumns.find((m) => {
              const mName = m.mapel?.nama?.toLowerCase() ?? "";
              return val1.toLowerCase().includes(mName) || val1.startsWith(`[${m.urutan}]`);
            });
            if (matchedMapel) {
              colIndexToKey.set(colNumber, `mm_${matchedMapel.id}`);
            }
          }
        }
      });

      // Tentukan apakah baris data dimulai dari baris 2 atau baris 3
      const firstDataRow = String(row2.getCell(1).value ?? "").startsWith("enrollment_id") ? 3 : 2;

      const santriEnrollmentMap = new Map<string, SantriGridRow>();
      const santriNisMap = new Map<string, SantriGridRow>();
      santriRows.forEach((s) => {
        santriEnrollmentMap.set(s.enrollment_id, s);
        if (s.nis) santriNisMap.set(s.nis.trim().toLowerCase(), s);
      });

      const allowedMapelSet = new Set(allowedMapelIds);
      const canEditKepribadian = isAdminDirect || isWaliKelas;

      const parsedList: ParsedImportRow[] = [];

      for (let r = firstDataRow; r <= sheet.rowCount; r++) {
        const row = sheet.getRow(r);
        // Cek apakah baris kosong
        let isEmpty = true;
        row.eachCell(() => {
          isEmpty = false;
        });
        if (isEmpty) continue;

        let enrollmentIdRaw = "";
        let nisRaw = "";
        let namaRaw = "";

        const nilaiMap: Record<string, number | null> = {};
        const catatan = {
          akhlak: null as string | null,
          ketekunan: null as string | null,
          kerapihan: null as string | null,
          kebersihan: null as string | null,
          sakit: null as number | null,
          izin: null as number | null,
          alpa: null as number | null,
        };

        const errors: string[] = [];
        const warnings: string[] = [];

        row.eachCell((cell, colNumber) => {
          const key = colIndexToKey.get(colNumber);
          const colName = colIndexToName.get(colNumber) || `Kolom ${colNumber}`;
          let cellValue: unknown = cell.value;

          // Tangani jika cell bertipe formula atau rich text
          if (cellValue && typeof cellValue === "object") {
            if ("result" in cellValue) cellValue = (cellValue as { result: unknown }).result;
            else if ("text" in cellValue) cellValue = (cellValue as { text: unknown }).text;
          }

          const valStr = cellValue !== undefined && cellValue !== null ? String(cellValue).trim() : "";

          if (!key) return;

          if (key === "enrollment_id") {
            enrollmentIdRaw = valStr;
          } else if (key === "nis") {
            nisRaw = valStr;
          } else if (key === "nama") {
            namaRaw = valStr;
          } else if (key.startsWith("mm_")) {
            const mmId = key.replace("mm_", "");
            const mapelInfo = mapelColumns.find((m) => m.id === mmId);
            const labelMapel = mapelInfo?.mapel?.nama ?? colName;

            if (valStr !== "") {
              const parsedNum = parseInt(valStr, 10);
              if (isNaN(parsedNum) || parsedNum < 0 || parsedNum > 100) {
                errors.push(`${labelMapel}: Nilai harus angka 0 - 100 (ditemukan: "${valStr}")`);
              } else {
                // Periksa hak akses guru
                if (!isAdminDirect && !isWaliKelas && !allowedMapelSet.has(mmId)) {
                  errors.push(
                    `${labelMapel}: DITOLAK karena di luar wewenang mata pelajaran yang Anda ampu`
                  );
                } else {
                  nilaiMap[mmId] = parsedNum;
                }
              }
            }
          } else if (["akhlak", "ketekunan", "kerapihan", "kebersihan"].includes(key)) {
            if (valStr !== "") {
              if (!canEditKepribadian) {
                errors.push(
                  `${colName}: Pengisian catatan kepribadian hanya diperbolehkan untuk Wali Kelas`
                );
              } else {
                // Cocokkan predikat valid
                const matchedPred = VALID_PREDIKATS.find(
                  (p) => p.toLowerCase() === valStr.toLowerCase()
                );
                if (!matchedPred) {
                  errors.push(
                    `${colName}: Predikat tidak valid (Gunakan: Sangat Baik, Baik, Cukup, Kurang)`
                  );
                } else {
                  catatan[key as "akhlak" | "ketekunan" | "kerapihan" | "kebersihan"] = matchedPred;
                }
              }
            }
          } else if (["sakit", "izin", "alpa"].includes(key)) {
            if (valStr !== "") {
              if (!canEditKepribadian) {
                errors.push(
                  `${colName}: Pengisian presensi hanya diperbolehkan untuk Wali Kelas`
                );
              } else {
                const count = parseInt(valStr, 10);
                if (isNaN(count) || count < 0) {
                  errors.push(`${colName}: Presensi harus berupa angka non-negatif`);
                } else {
                  catatan[key as "sakit" | "izin" | "alpa"] = count;
                }
              }
            }
          }
        });

        // Verifikasi keberadaan santri
        let matchedSantri = santriEnrollmentMap.get(enrollmentIdRaw);
        if (!matchedSantri && nisRaw) {
          matchedSantri = santriNisMap.get(nisRaw.toLowerCase());
        }

        if (!matchedSantri) {
          errors.push(
            `Santri tidak dikenali di marhalah ${marhalah.nama}. Pastikan kolom ID Pendaftaran tidak diubah.`
          );
        }

        const validEnrId = matchedSantri?.enrollment_id || enrollmentIdRaw;
        const validNis = matchedSantri?.nis || nisRaw;
        const validNama = matchedSantri?.nama || namaRaw || `Baris ${r}`;

        parsedList.push({
          rowNumber: r,
          enrollment_id: validEnrId,
          nis: validNis,
          nama: validNama,
          nilaiMap,
          catatan,
          errors,
          warnings,
          isValid: errors.length === 0,
        });
      }

      if (parsedList.length === 0) {
        notify.error("Tidak ada baris data santri yang terbaca di file Excel.");
        return;
      }

      setParsedRows(parsedList);
      setStep(2); // Pindah ke Step Preview & Validasi
      notify.success(`${parsedList.length} baris data santri berhasil dibaca.`);
    } catch (err) {
      console.error(err);
      notify.error("Gagal membaca file Excel. Pastikan format file .xlsx valid.");
    }
  };

  // Hitung ringkasan preview
  const validRowCount = parsedRows.filter((r) => r.isValid).length;
  const errorRowCount = parsedRows.filter((r) => !r.isValid).length;

  let totalNilaiWillSave = 0;
  let totalCatatanWillSave = 0;
  let totalNilaiWillSkip = 0;

  parsedRows
    .filter((r) => r.isValid)
    .forEach((row) => {
      const existingSantri = santriRows.find((s) => s.enrollment_id === row.enrollment_id);
      Object.entries(row.nilaiMap).forEach(([mmId, val]) => {
        if (val !== null && val !== undefined) {
          const oldVal = existingSantri?.nilaiMap[mmId];
          if (!timpa && oldVal !== null && oldVal !== undefined) {
            totalNilaiWillSkip++;
          } else {
            totalNilaiWillSave++;
          }
        }
      });

      if (isWaliKelas || isAdminDirect) {
        const hasCat =
          row.catatan.akhlak ||
          row.catatan.ketekunan ||
          row.catatan.kerapihan ||
          row.catatan.kebersihan ||
          row.catatan.sakit !== null ||
          row.catatan.izin !== null ||
          row.catatan.alpa !== null;
        if (hasCat) totalCatatanWillSave++;
      }
    });

  // Eksekusi Import
  const handleExecuteImport = () => {
    const validRowsToSubmit = parsedRows
      .filter((r) => r.isValid)
      .map((r) => ({
        enrollment_id: r.enrollment_id,
        nilaiMap: r.nilaiMap,
        catatan: r.catatan,
      }));

    if (validRowsToSubmit.length === 0) {
      notify.error("Tidak ada baris santri valid yang dapat diimpor.");
      return;
    }

    const payload: ImportNilaiPayload = {
      marhalah_id: marhalah.id,
      semester_id: semester.id,
      timpa,
      rows: validRowsToSubmit,
    };

    startTransition(async () => {
      const res = await importNilaiExcelAction(payload);
      setImportResult(res);
      setStep(4); // Pindah ke Step Ringkasan

      if (res.ok) {
        notify.success(res.message);
        if (onSuccess) onSuccess();
      } else {
        notify.error(res.message);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[850px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <FileSpreadsheetIcon className="h-5 w-5 text-primary" />
              Import Nilai Excel — {marhalah.nama}
            </DialogTitle>
            <div className="flex items-center gap-1.5 text-xs">
              <span
                className={`rounded px-2 py-0.5 font-medium ${
                  step === 1 ? "bg-primary text-white" : "bg-zinc-100 text-zinc-500"
                }`}
              >
                1. Upload
              </span>
              <ChevronRightIcon className="h-3 w-3 text-zinc-400" />
              <span
                className={`rounded px-2 py-0.5 font-medium ${
                  step === 2 ? "bg-primary text-white" : "bg-zinc-100 text-zinc-500"
                }`}
              >
                2. Validasi
              </span>
              <ChevronRightIcon className="h-3 w-3 text-zinc-400" />
              <span
                className={`rounded px-2 py-0.5 font-medium ${
                  step === 3 ? "bg-primary text-white" : "bg-zinc-100 text-zinc-500"
                }`}
              >
                3. Konfirmasi
              </span>
              <ChevronRightIcon className="h-3 w-3 text-zinc-400" />
              <span
                className={`rounded px-2 py-0.5 font-medium ${
                  step === 4 ? "bg-primary text-white" : "bg-zinc-100 text-zinc-500"
                }`}
              >
                4. Ringkasan
              </span>
            </div>
          </div>
          <DialogDescription className="text-xs">
            {step === 1 && "Unduh template nilai terisi atau unggah file spreadsheet yang sudah dilengkapi."}
            {step === 2 && "Periksa hasil validasi data nilai santri dan pastikan tidak ada baris yang ditolak."}
            {step === 3 && "Tinjau ringkasan nilai dan catatan yang akan disimpan ke database sistem."}
            {step === 4 && "Laporan eksekusi import nilai dan pembaruan catatan semester santri."}
          </DialogDescription>
        </DialogHeader>

        {/* ========================================================================= */}
        {/* STEP 1: UPLOAD & PENGATURAN */}
        {/* ========================================================================= */}
        {step === 1 && (
          <div className="space-y-4 py-2 overflow-y-auto">
            {/* Banner Unduh Template */}
            <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <p className="font-semibold text-sm text-emerald-950">
                    Template Excel Khusus Kelas {marhalah.nama}
                  </p>
                  <p className="text-xs text-emerald-800">
                    Template ini telah memuat {santriRows.length} nama santri aktif dan kolom mata pelajaran semester {semester.jenis}.
                  </p>
                </div>
                <Button
                  onClick={handleDownloadTemplate}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="bg-white border-emerald-300 text-emerald-900 hover:bg-emerald-100 shrink-0"
                >
                  <DownloadIcon className="mr-1.5 h-4 w-4 text-emerald-700" />
                  Unduh Template Excel
                </Button>
              </div>
            </div>

            {/* Unggah File */}
            <div className="space-y-2">
              <Label htmlFor="nilai-excel-file" className="text-sm font-semibold">
                Pilih File Excel Hasil Pengisian (.xlsx)
              </Label>
              <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-zinc-200 p-6 transition-colors hover:border-zinc-300 bg-zinc-50/50">
                <UploadIcon className="h-8 w-8 text-zinc-400 mb-2" />
                <p className="text-sm font-medium text-zinc-700">
                  {file ? file.name : "Klik atau seret file Excel ke sini"}
                </p>
                <p className="text-xs text-zinc-400 mt-1">Hanya mendukung format .xlsx</p>
                <input
                  id="nilai-excel-file"
                  type="file"
                  accept=".xlsx"
                  onChange={handleFileChange}
                  className="mt-3 text-xs text-zinc-500 file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-medium file:bg-zinc-200 hover:file:bg-zinc-300 cursor-pointer"
                />
              </div>
            </div>

            {/* Opsi Timpa Nilai */}
            <div className="rounded-lg border border-zinc-200 bg-white p-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={timpa}
                  onChange={(e) => setTimpa(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-zinc-300 accent-emerald-700 focus:ring-emerald-700"
                />
                <div className="space-y-0.5">
                  <span className="text-sm font-semibold text-zinc-900">
                    Timpa nilai & catatan yang sudah terisi sebelumnya
                  </span>
                  <p className="text-xs text-zinc-500">
                    Bila <strong>tidak dicentang</strong> (rekomendasi), nilai di database yang sudah ada tidak akan diubah/ditimpa; hanya sel kosong yang akan diisi. Bila dicentang, seluruh data di database akan diperbarui dengan data dari file Excel.
                  </p>
                </div>
              </label>
            </div>

            {/* Info Hak Akses Guru */}
            <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-3 text-xs text-blue-900 flex items-start gap-2">
              <InfoIcon className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <strong>Aturan Hak Akses:</strong>{" "}
                {isAdminDirect ? (
                  "Mode Administrator memiliki akses penuh untuk mengimpor seluruh mapel dan catatan kepribadian/presensi."
                ) : isWaliKelas ? (
                  "Sebagai Wali Kelas, Anda berhak mengimpor seluruh nilai mata pelajaran, catatan kepribadian, dan presensi."
                ) : (
                  "Sebagai Guru Pengampu, Anda HANYA diperbolehkan mengimpor nilai untuk mata pelajaran yang Anda ampu. Kolom mapel lain atau catatan kepribadian otomatis akan ditolak oleh sistem."
                )}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 2: PREVIEW & VALIDASI */}
        {/* ========================================================================= */}
        {step === 2 && (
          <div className="space-y-3 py-2 flex-1 flex flex-col min-h-0">
            {/* Status Baris */}
            <div className="grid grid-cols-3 gap-2 shrink-0">
              <div className="rounded-md border border-zinc-200 bg-white p-2.5 text-center">
                <div className="text-xs text-zinc-500">Total Baris Santri</div>
                <div className="text-lg font-bold text-zinc-900">{parsedRows.length}</div>
              </div>
              <div className="rounded-md border border-emerald-200 bg-emerald-50/60 p-2.5 text-center">
                <div className="text-xs text-emerald-700">Baris Valid</div>
                <div className="text-lg font-bold text-emerald-800">{validRowCount}</div>
              </div>
              <div className="rounded-md border border-red-200 bg-red-50/60 p-2.5 text-center">
                <div className="text-xs text-red-700">Baris Error / Ditolak</div>
                <div className="text-lg font-bold text-red-800">{errorRowCount}</div>
              </div>
            </div>

            {errorRowCount > 0 && (
              <div className="rounded-md border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-900 flex items-start gap-2 shrink-0">
                <AlertCircleIcon className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  Terdapat <strong>{errorRowCount} baris</strong> yang memiliki kesalahan atau nilai di luar hak wewenang. Baris yang memiliki error tidak akan dimasukkan ke database sampai diperbaiki.
                </div>
              </div>
            )}

            {/* Tabel Preview */}
            <div className="rounded-md border border-zinc-200 overflow-y-auto flex-1 max-h-[360px]">
              <Table>
                <TableHeader className="bg-zinc-50 sticky top-0 z-10">
                  <TableRow>
                    <TableHead className="w-12 text-center text-xs">No</TableHead>
                    <TableHead className="w-28 text-xs">NIS</TableHead>
                    <TableHead className="text-xs">Nama Santri</TableHead>
                    <TableHead className="text-center text-xs w-28">Nilai Terbaca</TableHead>
                    <TableHead className="text-center text-xs w-24">Catatan</TableHead>
                    <TableHead className="text-right text-xs w-32">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedRows.map((row, idx) => {
                    const nilaiCount = Object.keys(row.nilaiMap).length;
                    const hasCat =
                      row.catatan.akhlak ||
                      row.catatan.ketekunan ||
                      row.catatan.kerapihan ||
                      row.catatan.kebersihan ||
                      row.catatan.sakit !== null ||
                      row.catatan.izin !== null ||
                      row.catatan.alpa !== null;

                    return (
                      <TableRow
                        key={idx}
                        className={row.isValid ? "hover:bg-zinc-50" : "bg-red-50/40 hover:bg-red-50/60"}
                      >
                        <TableCell className="text-center text-xs font-mono text-zinc-500">
                          {idx + 1}
                        </TableCell>
                        <TableCell className="text-xs font-mono text-zinc-700">
                          {row.nis || "-"}
                        </TableCell>
                        <TableCell className="text-xs">
                          <div className="font-semibold text-zinc-900">{row.nama}</div>
                          {row.errors.length > 0 && (
                            <div className="mt-1 space-y-0.5">
                              {row.errors.map((err, errIdx) => (
                                <p key={errIdx} className="text-[11px] text-red-600 font-medium">
                                  • {err}
                                </p>
                              ))}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-center text-xs">
                          <Badge variant="outline" className="text-[11px]">
                            {nilaiCount} Mapel
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center text-xs">
                          {hasCat ? (
                            <Badge variant="outline" className="text-[11px] border-emerald-300 text-emerald-800">
                              Ada
                            </Badge>
                          ) : (
                            <span className="text-zinc-400 text-xs">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right text-xs">
                          {row.isValid ? (
                            <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px]">
                              <CheckCircle2Icon className="mr-1 h-3 w-3" />
                              Valid
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="text-[11px]">
                              <XCircleIcon className="mr-1 h-3 w-3" />
                              Error ({row.errors.length})
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 3: KONFIRMASI */}
        {/* ========================================================================= */}
        {step === 3 && (
          <div className="space-y-4 py-2">
            <div className="rounded-lg border border-zinc-200 bg-white p-5 space-y-4">
              <h3 className="font-bold text-base text-zinc-900">
                Ringkasan Eksekusi Import Nilai
              </h3>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="p-3 bg-zinc-50 rounded-md border border-zinc-200">
                  <div className="text-xs text-zinc-500">Kelas / Marhalah</div>
                  <div className="font-semibold text-zinc-900 mt-0.5">
                    {marhalah.nama} ({marhalah.kode})
                  </div>
                </div>

                <div className="p-3 bg-zinc-50 rounded-md border border-zinc-200">
                  <div className="text-xs text-zinc-500">Semester & TA</div>
                  <div className="font-semibold text-zinc-900 mt-0.5">
                    Semester {semester.jenis} — {semester.tahun_ajaran?.nama ?? "-"}
                  </div>
                </div>

                <div className="p-3 bg-zinc-50 rounded-md border border-zinc-200">
                  <div className="text-xs text-zinc-500">Nilai Mapel yang Akan Disimpan</div>
                  <div className="text-xl font-bold text-emerald-700 mt-0.5">
                    {totalNilaiWillSave} Nilai
                  </div>
                  <div className="text-[11px] text-zinc-400 mt-0.5">
                    {totalNilaiWillSkip > 0
                      ? `${totalNilaiWillSkip} nilai dilewati (sudah ada & tidak timpa)`
                      : "Semua nilai baru"}
                  </div>
                </div>

                <div className="p-3 bg-zinc-50 rounded-md border border-zinc-200">
                  <div className="text-xs text-zinc-500">Catatan Santri yang Diperbarui</div>
                  <div className="text-xl font-bold text-primary mt-0.5">
                    {totalCatatanWillSave} Santri
                  </div>
                  <div className="text-[11px] text-zinc-400 mt-0.5">
                    Kepribadian & Presensi Kehadiran
                  </div>
                </div>
              </div>

              <div className="rounded-md border border-zinc-200 bg-zinc-50/60 p-3 text-xs text-zinc-600 space-y-1">
                <p>
                  • <strong>Opsi Timpa Data:</strong>{" "}
                  {timpa ? (
                    <span className="font-semibold text-amber-700">
                      Aktif (Nilai lama di database akan ditimpa dengan data Excel)
                    </span>
                  ) : (
                    <span className="font-semibold text-emerald-700">
                      Tidak Aktif (Hanya sel kosong yang akan diisi)
                    </span>
                  )}
                </p>
                <p>
                  • <strong>Audit Log:</strong> Aktivitas import ini akan dicatat ke dalam log audit sistem beserta rekam jejak pengguna.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 4: RINGKASAN HASIL */}
        {/* ========================================================================= */}
        {step === 4 && importResult && (
          <div className="space-y-4 py-4 text-center">
            {importResult.ok ? (
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
                <CheckCircle2Icon className="h-8 w-8 text-emerald-600" />
              </div>
            ) : (
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
                <XCircleIcon className="h-8 w-8 text-red-600" />
              </div>
            )}

            <div className="space-y-1">
              <h3 className="text-lg font-bold text-zinc-900">
                {importResult.ok ? "Import Nilai Berhasil!" : "Import Nilai Gagal"}
              </h3>
              <p className="text-xs text-zinc-500 max-w-md mx-auto">{importResult.message}</p>
            </div>

            {importResult.summary && (
              <div className="grid grid-cols-4 gap-2 text-left max-w-lg mx-auto pt-2">
                <div className="p-3 bg-zinc-50 rounded-lg border border-zinc-200 text-center">
                  <div className="text-[11px] text-zinc-500">Diproses</div>
                  <div className="text-base font-bold text-zinc-900">
                    {importResult.summary.totalRows}
                  </div>
                </div>
                <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 text-center">
                  <div className="text-[11px] text-emerald-700">Nilai Disimpan</div>
                  <div className="text-base font-bold text-emerald-800">
                    {importResult.summary.nilaiSaved}
                  </div>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 text-center">
                  <div className="text-[11px] text-blue-700">Catatan Disimpan</div>
                  <div className="text-base font-bold text-blue-800">
                    {importResult.summary.catatanSaved}
                  </div>
                </div>
                <div className="p-3 bg-zinc-50 rounded-lg border border-zinc-200 text-center">
                  <div className="text-[11px] text-zinc-500">Dilewati</div>
                  <div className="text-base font-bold text-zinc-600">
                    {importResult.summary.skippedCount}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="flex items-center justify-between pt-3 border-t border-zinc-100">
          {step === 1 && (
            <>
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                Batal
              </Button>
              <Button type="button" disabled={!file} onClick={handleParseExcel}>
                Lanjut ke Validasi
                <ChevronRightIcon className="ml-1 h-4 w-4" />
              </Button>
            </>
          )}

          {step === 2 && (
            <>
              <Button type="button" variant="outline" onClick={() => setStep(1)}>
                <ChevronLeftIcon className="mr-1 h-4 w-4" />
                Kembali
              </Button>
              <Button
                type="button"
                disabled={validRowCount === 0}
                onClick={() => setStep(3)}
              >
                Lanjut ke Konfirmasi ({validRowCount} Valid)
                <ChevronRightIcon className="ml-1 h-4 w-4" />
              </Button>
            </>
          )}

          {step === 3 && (
            <>
              <Button
                type="button"
                variant="outline"
                disabled={isPending}
                onClick={() => setStep(2)}
              >
                <ChevronLeftIcon className="mr-1 h-4 w-4" />
                Kembali
              </Button>
              <Button
                type="button"
                disabled={isPending || validRowCount === 0}
                onClick={handleExecuteImport}
                className="bg-emerald-700 hover:bg-emerald-800"
              >
                {isPending ? (
                  <>
                    <RefreshCwIcon className="mr-2 h-4 w-4 animate-spin" />
                    Menyimpan Nilai...
                  </>
                ) : (
                  "Konfirmasi & Mulai Simpan"
                )}
              </Button>
            </>
          )}

          {step === 4 && (
            <div className="w-full flex justify-end">
              <Button
                type="button"
                onClick={() => {
                  handleOpenChange(false);
                  window.location.reload();
                }}
              >
                Tutup & Muat Ulang Lembar Nilai
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

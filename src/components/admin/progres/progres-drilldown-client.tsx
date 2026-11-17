"use client";

import * as React from "react";
import Link from "next/link";
import {
  ChevronLeftIcon,
  ShieldAlertIcon,
  UserXIcon,
  CheckCircle2Icon,
  AlertTriangleIcon,
  BookOpenIcon,
  GraduationCapIcon,
  UsersIcon,
  LockIcon,
  UnlockIcon,
  TableIcon,
  AwardIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FinalisasiDialog } from "@/components/nilai/finalisasi-dialog";
import { BukaKunciDialog } from "@/components/nilai/buka-kunci-dialog";
import { CetakMassalDialog } from "@/components/nilai/cetak-massal-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type {
  DrilldownMapelCol,
  DrilldownSantriRow,
} from "@/app/admin/actions/progres";

interface ProgresDrilldownClientProps {
  marhalah: {
    id: string;
    nama: string;
    kode: string;
  };
  semester: {
    id: string;
    jenis: "Ganjil" | "Genap";
    tahun_ajaran: {
      id: string;
      nama: string;
      kode: string;
    };
  };
  waliKelas: {
    id: string;
    nama: string;
  } | null;
  statusRaport: "draft" | "final";
  mapelColumns: DrilldownMapelCol[];
  santriRows: DrilldownSantriRow[];
  totalMapelTanpaPengampu: number;
  totalSelKosong: number;
  backUrl?: string;
}

export function ProgresDrilldownClient({
  marhalah,
  semester,
  waliKelas,
  statusRaport,
  mapelColumns,
  santriRows,
  totalMapelTanpaPengampu,
  totalSelKosong,
  backUrl = "/admin/dashboard",
}: ProgresDrilldownClientProps) {
  const [isFinalisasiOpen, setIsFinalisasiOpen] = React.useState(false);
  const [isBukaKunciOpen, setIsBukaKunciOpen] = React.useState(false);

  const isFinal = statusRaport === "final";
  const totalMapelNilai = mapelColumns.filter((m) => m.tipe === "nilai").length;
  const totalSelNilai = santriRows.length * totalMapelNilai;
  const selTerisi = totalSelNilai - totalSelKosong;
  const persentaseKelengkapan =
    totalSelNilai > 0 ? Math.round((selTerisi / totalSelNilai) * 100) : 0;
  const isAllNilaiFilled = totalSelKosong === 0 && santriRows.length > 0;

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
                Drill-Down Pengisian Nilai — {marhalah.nama}
              </h2>
              <Badge variant="outline" className="font-mono text-xs">
                {marhalah.kode}
              </Badge>
              <Badge variant="secondary" className="text-xs bg-zinc-100 text-zinc-700">
                Hanya Baca
              </Badge>
            </div>
            <div className="text-xs text-zinc-500 mt-0.5 flex flex-wrap items-center gap-2">
              <span>Semester {semester.jenis} • TA {semester.tahun_ajaran.nama}</span>
              <span>•</span>
              <span className="flex items-center gap-1 font-medium text-zinc-700">
                <GraduationCapIcon className="h-3.5 w-3.5 text-primary" />
                Wali Kelas: {waliKelas?.nama ?? "Belum Ditugaskan"}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Final / Draft */}
          {isFinal ? (
            <Badge variant="destructive" className="text-xs gap-1 py-1 px-2.5">
              <LockIcon className="h-3 w-3" />
              <span>RAPORT FINAL (Terkunci)</span>
            </Badge>
          ) : (
            <Badge className="bg-emerald-700 text-white text-xs gap-1 py-1 px-2.5">
              <UnlockIcon className="h-3 w-3" />
              <span>DRAFT (Pengisian Berjalan)</span>
            </Badge>
          )}

          {/* Tombol Finalisasi (Bila Lengkap) */}
          {!isFinal && (
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
                title={`Belum dapat difinalisasi: masih terdapat ${totalSelKosong} sel nilai yang kosong.`}
              >
                <AwardIcon className="h-3.5 w-3.5 text-zinc-300" />
                Finalisasi ({totalSelKosong} Kosong)
              </Button>
            )
          )}

          {/* Tombol Buka Kunci (Bila Final) */}
          {isFinal && (
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
              tahunAjaranNama={semester.tahun_ajaran.nama}
              isFinal={isFinal}
            />
          )}

          {/* Tombol ke Lembar Edit Langsung */}
          <Button asChild size="sm" variant="outline" className="h-8 text-xs">
            <Link href={`/admin/kelas/${marhalah.id}/nilai`}>
              <TableIcon className="mr-1.5 h-3.5 w-3.5 text-primary" />
              Buka Lembar Nilai
            </Link>
          </Button>
        </div>
      </div>

      {/* SUMMARY STATS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-lg border border-zinc-200 bg-white p-3">
          <div className="text-xs text-zinc-500 flex items-center justify-between">
            <span>Santri Terdaftar</span>
            <UsersIcon className="h-3.5 w-3.5 text-zinc-400" />
          </div>
          <div className="text-xl font-bold text-zinc-900 mt-1">{santriRows.length} Santri</div>
        </div>

        <div className="rounded-lg border border-zinc-200 bg-white p-3">
          <div className="text-xs text-zinc-500 flex items-center justify-between">
            <span>Kelengkapan Nilai</span>
            <CheckCircle2Icon className="h-3.5 w-3.5 text-emerald-600" />
          </div>
          <div className="text-xl font-bold text-zinc-900 mt-1">
            {persentaseKelengkapan}%
            <span className="text-xs font-normal text-zinc-400 ml-1.5">
              ({selTerisi}/{totalSelNilai})
            </span>
          </div>
        </div>

        <div className={`rounded-lg border p-3 ${
          totalSelKosong > 0 ? "border-red-200 bg-red-50/50" : "border-emerald-200 bg-emerald-50/50"
        }`}>
          <div className="text-xs flex items-center justify-between">
            <span className={totalSelKosong > 0 ? "text-red-700 font-medium" : "text-emerald-700"}>
              Sel Nilai Kosong
            </span>
            <AlertTriangleIcon className={`h-3.5 w-3.5 ${totalSelKosong > 0 ? "text-red-500" : "text-emerald-600"}`} />
          </div>
          <div className={`text-xl font-bold mt-1 ${totalSelKosong > 0 ? "text-red-800" : "text-emerald-800"}`}>
            {totalSelKosong} Sel
          </div>
        </div>

        <div className={`rounded-lg border p-3 ${
          totalMapelTanpaPengampu > 0 ? "border-amber-200 bg-amber-50/50" : "border-zinc-200 bg-white"
        }`}>
          <div className="text-xs flex items-center justify-between">
            <span className={totalMapelTanpaPengampu > 0 ? "text-amber-800 font-medium" : "text-zinc-500"}>
              Mapel Tanpa Pengampu
            </span>
            <UserXIcon className={`h-3.5 w-3.5 ${totalMapelTanpaPengampu > 0 ? "text-amber-600" : "text-zinc-400"}`} />
          </div>
          <div className={`text-xl font-bold mt-1 ${totalMapelTanpaPengampu > 0 ? "text-amber-900" : "text-zinc-900"}`}>
            {totalMapelTanpaPengampu} Mapel
          </div>
        </div>
      </div>

      {/* PERINGATAN BILA ADA MAPEL TANPA PENGAMPU */}
      {totalMapelTanpaPengampu > 0 && (
        <div className="flex items-start gap-2.5 p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-lg text-xs">
          <ShieldAlertIcon className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-semibold">Perhatian: Ada Mata Pelajaran Tanpa Guru Pengampu</p>
            <p className="text-amber-800">
              Terdapat <strong>{totalMapelTanpaPengampu} mata pelajaran</strong> di marhalah ini yang belum ditugaskan kepada guru pengampu. Silakan tetapkan pengampu melalui menu <em>Guru & Penugasan</em>.
            </p>
          </div>
        </div>
      )}

      {/* PETUNJUK INDIKATOR WARNA */}
      <div className="flex flex-wrap items-center justify-between text-xs text-zinc-500 bg-zinc-50 p-2.5 rounded-md border border-zinc-200 gap-2">
        <div className="flex items-center gap-2">
          <BookOpenIcon className="h-3.5 w-3.5 text-zinc-600" />
          <span>Matriks Santri × Mapel & Catatan Perwalian (Hanya Baca / Mode Monitoring)</span>
        </div>
        <div className="flex items-center gap-3 text-[11px]">
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-5 rounded bg-white border border-zinc-300 inline-block text-center text-[9px] font-mono">85</span>
            <span>Nilai Terisi</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-5 rounded bg-red-100 border border-red-300 inline-block text-center text-[9px] font-bold text-red-700">-</span>
            <span className="text-red-700 font-medium">Sel Kosong (Belum Diisi)</span>
          </span>
          <span className="flex items-center gap-1.5">
            <Badge variant="destructive" className="text-[9px] py-0 px-1">Tanpa Pengampu</Badge>
            <span>Perlu Penugasan</span>
          </span>
        </div>
      </div>

      {/* MATRIKS DRILL-DOWN TABLE */}
      <div className="rounded-lg border border-zinc-200 bg-white shadow-2xs overflow-hidden">
        <div className="max-h-[64vh] overflow-auto">
          <Table className="border-collapse text-xs">
            <TableHeader className="bg-zinc-50 sticky top-0 z-20 shadow-2xs">
              <TableRow className="border-b border-zinc-200">
                <TableHead className="w-10 text-center font-bold sticky left-0 z-30 bg-zinc-50 border-r border-zinc-200">
                  No
                </TableHead>
                <TableHead className="w-24 font-bold sticky left-10 z-30 bg-zinc-50 border-r border-zinc-200">
                  NIS
                </TableHead>
                <TableHead className="w-48 font-bold sticky left-34 z-30 bg-zinc-50 border-r border-zinc-200">
                  Nama Santri
                </TableHead>
                <TableHead className="w-10 text-center font-bold sticky left-82 z-30 bg-zinc-50 border-r border-zinc-200">
                  JK
                </TableHead>

                {/* KOLOM MAPEL DENGAN INFO PENGAMPU */}
                {mapelColumns.map((col) => (
                  <TableHead
                    key={col.id}
                    className={`min-w-[130px] max-w-[170px] text-center border-r border-zinc-200 px-2 py-2 ${
                      !col.has_pengampu ? "bg-red-50/70" : ""
                    }`}
                  >
                    <div className="font-bold text-zinc-900 leading-tight truncate" title={col.nama_mapel}>
                      {col.urutan}. {col.nama_mapel}
                    </div>
                    {col.nama_kitab ? (
                      <div className="text-[10px] text-zinc-500 italic truncate" title={col.nama_kitab}>
                        ({col.nama_kitab})
                      </div>
                    ) : null}

                    {/* BADGE PENGAMPU */}
                    <div className="mt-1">
                      {col.has_pengampu ? (
                        <div
                          className="inline-block px-1.5 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-medium truncate max-w-full"
                          title={`Pengampu: ${col.pengampu_nama}`}
                        >
                          {col.pengampu_nama}
                        </div>
                      ) : (
                        <Badge
                          variant="destructive"
                          className="text-[9px] py-0 px-1 font-semibold uppercase tracking-wider"
                        >
                          Tanpa Pengampu
                        </Badge>
                      )}
                    </div>
                  </TableHead>
                ))}

                {/* HEADER KEPRIBADIAN */}
                <TableHead className="min-w-[90px] text-center border-r border-zinc-200 bg-zinc-100/60 font-semibold">
                  Akhlak
                </TableHead>
                <TableHead className="min-w-[90px] text-center border-r border-zinc-200 bg-zinc-100/60 font-semibold">
                  Ketekunan
                </TableHead>
                <TableHead className="min-w-[90px] text-center border-r border-zinc-200 bg-zinc-100/60 font-semibold">
                  Kerapihan
                </TableHead>
                <TableHead className="min-w-[90px] text-center border-r border-zinc-200 bg-zinc-100/60 font-semibold">
                  Kebersihan
                </TableHead>

                {/* HEADER PRESENSI */}
                <TableHead className="w-12 text-center border-r border-zinc-200 bg-zinc-100/60 font-semibold">
                  S
                </TableHead>
                <TableHead className="w-12 text-center border-r border-zinc-200 bg-zinc-100/60 font-semibold">
                  I
                </TableHead>
                <TableHead className="w-12 text-center border-r border-zinc-200 bg-zinc-100/60 font-semibold">
                  A
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {santriRows.length > 0 ? (
                santriRows.map((row, idx) => (
                  <TableRow key={row.enrollment_id} className="hover:bg-zinc-50/80 border-b border-zinc-100">
                    <TableCell className="p-2 text-center font-mono text-xs text-zinc-500 sticky left-0 z-10 bg-white border-r border-zinc-200">
                      {idx + 1}
                    </TableCell>
                    <TableCell className="p-2 font-mono text-xs text-zinc-700 sticky left-10 z-10 bg-white border-r border-zinc-200">
                      {row.nis || "-"}
                    </TableCell>
                    <TableCell className="p-2 font-semibold text-zinc-900 sticky left-34 z-10 bg-white border-r border-zinc-200">
                      {row.nama}
                    </TableCell>
                    <TableCell className="p-2 text-center font-semibold text-xs sticky left-82 z-10 bg-white border-r border-zinc-200 text-zinc-600">
                      {row.jenis_kelamin}
                    </TableCell>

                    {/* SEL NILAI MAPEL */}
                    {mapelColumns.map((col) => {
                      const val = row.nilaiMap[col.id];
                      const isKosong = val === undefined || val === null;

                      if (isKosong) {
                        return (
                          <TableCell
                            key={col.id}
                            className="p-1.5 text-center font-bold font-mono text-xs bg-red-50 text-red-600 border-r border-zinc-200 border-red-200"
                            title={`Nilai ${col.nama_mapel} untuk ${row.nama} belum diisi`}
                          >
                            <span className="inline-block px-1.5 py-0.5 rounded bg-red-100/80 border border-red-200 text-red-700">
                              -
                            </span>
                          </TableCell>
                        );
                      }

                      return (
                        <TableCell
                          key={col.id}
                          className="p-1.5 text-center font-mono text-xs text-zinc-900 border-r border-zinc-200"
                        >
                          <span className="font-semibold">{val}</span>
                        </TableCell>
                      );
                    })}

                    {/* SEL KEPRIBADIAN */}
                    <TableCell className="p-1.5 text-center border-r border-zinc-200 text-xs">
                      {row.catatan.akhlak ? (
                        <span className="text-zinc-800">{row.catatan.akhlak}</span>
                      ) : (
                        <span className="text-red-500 font-bold bg-red-50 px-1.5 py-0.5 rounded border border-red-200">
                          -
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="p-1.5 text-center border-r border-zinc-200 text-xs">
                      {row.catatan.ketekunan ? (
                        <span className="text-zinc-800">{row.catatan.ketekunan}</span>
                      ) : (
                        <span className="text-red-500 font-bold bg-red-50 px-1.5 py-0.5 rounded border border-red-200">
                          -
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="p-1.5 text-center border-r border-zinc-200 text-xs">
                      {row.catatan.kerapihan ? (
                        <span className="text-zinc-800">{row.catatan.kerapihan}</span>
                      ) : (
                        <span className="text-red-500 font-bold bg-red-50 px-1.5 py-0.5 rounded border border-red-200">
                          -
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="p-1.5 text-center border-r border-zinc-200 text-xs">
                      {row.catatan.kebersihan ? (
                        <span className="text-zinc-800">{row.catatan.kebersihan}</span>
                      ) : (
                        <span className="text-red-500 font-bold bg-red-50 px-1.5 py-0.5 rounded border border-red-200">
                          -
                        </span>
                      )}
                    </TableCell>

                    {/* SEL PRESENSI */}
                    <TableCell className="p-1.5 text-center font-mono text-xs border-r border-zinc-200">
                      {row.catatan.sakit}
                    </TableCell>
                    <TableCell className="p-1.5 text-center font-mono text-xs border-r border-zinc-200">
                      {row.catatan.izin}
                    </TableCell>
                    <TableCell className="p-1.5 text-center font-mono text-xs border-r border-zinc-200">
                      {row.catatan.alpa}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={4 + mapelColumns.length + 4 + 3}
                    className="h-32 text-center text-xs text-zinc-400"
                  >
                    Tidak ada santri yang terdaftar di kelas ini untuk semester aktif.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* DIALOG FINALISASI RAPORT & NILAI SERI */}
      <FinalisasiDialog
        open={isFinalisasiOpen}
        onOpenChange={setIsFinalisasiOpen}
        marhalahId={marhalah.id}
        semesterId={semester.id}
        marhalahNama={marhalah.nama}
        semesterJenis={semester.jenis}
        tahunAjaranNama={semester.tahun_ajaran.nama}
      />

      {/* DIALOG BUKA KUNCI RAPORT */}
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

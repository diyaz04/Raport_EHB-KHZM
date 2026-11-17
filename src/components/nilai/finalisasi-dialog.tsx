"use client";

import * as React from "react";
import {
  LockIcon,
  CheckCircle2Icon,
  AlertTriangleIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  AwardIcon,
  ShieldCheckIcon,
  Loader2Icon,
  HelpCircleIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  checkFinalisasiReadinessAction,
  finalisasiRaportAction,
  type StudentRankCandidate,
  type FinalisasiReadinessResult,
} from "@/app/actions/finalisasi";

interface FinalisasiDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  marhalahId: string;
  semesterId: string;
  marhalahNama: string;
  semesterJenis: string;
  tahunAjaranNama: string;
  onSuccess?: () => void;
}

export function FinalisasiDialog({
  open,
  onOpenChange,
  marhalahId,
  semesterId,
  marhalahNama,
  semesterJenis,
  tahunAjaranNama,
  onSuccess,
}: FinalisasiDialogProps) {
  const [readiness, setReadiness] = React.useState<FinalisasiReadinessResult | null>(null);
  const [orderedStudents, setOrderedStudents] = React.useState<StudentRankCandidate[]>([]);
  const [isPending, startTransition] = React.useTransition();

  const loading = open && readiness === null;

  // Load readiness data when dialog opens
  React.useEffect(() => {
    let ignore = false;
    if (open) {
      checkFinalisasiReadinessAction(marhalahId, semesterId).then((res) => {
        if (!ignore) {
          setReadiness(res);
          setOrderedStudents(res.students);
        }
      });
    }
    return () => {
      ignore = true;
    };
  }, [open, marhalahId, semesterId]);

  const handleDialogChange = (isOpen: boolean) => {
    if (!isOpen) {
      setReadiness(null);
      setOrderedStudents([]);
    }
    onOpenChange(isOpen);
  };

  // Handler tombol Naik / Turun untuk santri yang seri
  const handleMove = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= orderedStudents.length) return;

    const currentStudent = orderedStudents[index];
    const targetStudent = orderedStudents[targetIndex];

    // Hanya izinkan swap jika kedua santri memiliki total nilai yang sama (dalam kelompok seri yang sama)
    if (currentStudent.total_nilai !== targetStudent.total_nilai) {
      notify.error("Hanya santri dengan total nilai seri yang dapat ditukar urutannya.");
      return;
    }

    const updated = [...orderedStudents];
    updated[index] = targetStudent;
    updated[targetIndex] = currentStudent;

    setOrderedStudents(updated);
  };

  // Submit Finalisasi
  const handleFinalisasi = () => {
    if (!readiness?.isReady) {
      notify.error("Tidak dapat memfinalisasi: Nilai santri belum lengkap.");
      return;
    }

    // Bangun daftar peringkat 1..N
    const peringkatList = orderedStudents.map((s, idx) => ({
      enrollment_id: s.enrollment_id,
      peringkat: idx + 1,
    }));

    startTransition(async () => {
      const res = await finalisasiRaportAction({
        marhalah_id: marhalahId,
        semester_id: semesterId,
        peringkatList,
      });

      if (res.ok) {
        notify.success(res.message);
        onOpenChange(false);
        if (onSuccess) onSuccess();
        window.location.reload();
      } else {
        notify.error(res.message);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogContent className="sm:max-w-[780px] max-h-[92vh] flex flex-col p-4 sm:p-6">
        <DialogHeader className="pb-3 border-b border-zinc-100 shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-lg text-zinc-900">
              <AwardIcon className="h-5 w-5 text-primary" />
              Finalisasi Raport — {marhalahNama}
            </DialogTitle>
            <Badge variant="outline" className="text-xs">
              Semester {semesterJenis} • TA {tahunAjaranNama}
            </Badge>
          </div>
          <DialogDescription className="text-xs">
            Pemeriksaan kelengkapan nilai, penentuan urutan peringkat santri, dan penguncian status raport.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-zinc-400 space-y-2">
            <Loader2Icon className="h-6 w-6 animate-spin text-primary" />
            <p className="text-xs">Memeriksa kelengkapan seluruh nilai santri...</p>
          </div>
        ) : !readiness?.isReady ? (
          /* ========================================================================= */
          /* KONDISI BELUM LENGKAP */
          /* ========================================================================= */
          <div className="space-y-4 py-4">
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-950 flex items-start gap-3">
              <AlertTriangleIcon className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
              <div className="space-y-1 text-xs">
                <p className="font-bold text-sm text-red-900">
                  Nilai Santri Belum Lengkap ({readiness?.missingCellsCount} Sel Kosong)
                </p>
                <p className="text-red-800">
                  Raport kelas <strong>{marhalahNama}</strong> belum dapat difinalisasi karena masih terdapat{" "}
                  <strong>{readiness?.missingCellsCount} sel nilai mata pelajaran</strong> yang belum diisi (sel terisi: {readiness?.selTerisi} dari {readiness?.totalSelExpected} sel).
                </p>
                <p className="text-red-700 pt-1">
                  Seluruh nilai santri wajib terisi $100\%$ sebelum raport dapat difinalisasi dan diperingkat.
                </p>
              </div>
            </div>

            <div className="rounded-lg border border-zinc-200 bg-zinc-50/50 p-4 space-y-2 text-xs text-zinc-600">
              <p className="font-semibold text-zinc-800">Langkah Penyelesaian:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Buka lembar nilai atau monitoring drill-down untuk melihat sel-sel yang ditandai merah.</li>
                <li>Lengkapi nilai yang masih kosong melalui input manual autosave atau import Excel.</li>
                <li>Setelah seluruh sel terisi, kembali ke menu ini untuk melakukan finalisasi raport.</li>
              </ul>
            </div>
          </div>
        ) : (
          /* ========================================================================= */
          /* KONDISI SIAP FINALISASI */
          /* ========================================================================= */
          <div className="space-y-4 py-2 flex-1 flex flex-col min-h-0">
            {/* Banner Informasi Status */}
            {readiness.hasTies ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-950 flex items-start gap-2.5 shrink-0">
                <HelpCircleIcon className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5 text-xs">
                  <p className="font-bold text-amber-900">
                    Perhatian: Terdapat Santri dengan Nilai Seri (Total Nilai Sama)
                  </p>
                  <p className="text-amber-800">
                    Sistem mendeteksi santri yang ditandai kuning memiliki total nilai yang sama. Gunakan tombol{" "}
                    <strong>Naik / Turun</strong> untuk menentukan urutan peringkat yang adil (merujuk pada akhlak, ketekunan, atau kehadiran santri).
                  </p>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-emerald-950 flex items-center gap-2.5 shrink-0">
                <CheckCircle2Icon className="h-4 w-4 text-emerald-600 shrink-0" />
                <div className="text-xs">
                  <strong>Seluruh Nilai Lengkap ($100\%$)!</strong> Setiap santri memiliki total nilai yang unik. Seluruh peringkat tersusun otomatis dari urutan 1 s/d {orderedStudents.length}.
                </div>
              </div>
            )}

            {/* Tabel Peringkat Santri */}
            <div className="rounded-md border border-zinc-200 overflow-y-auto flex-1 max-h-[360px]">
              <Table className="text-xs">
                <TableHeader className="bg-zinc-50 sticky top-0 z-10">
                  <TableRow>
                    <TableHead className="w-16 text-center font-bold">Peringkat</TableHead>
                    <TableHead className="w-24">NIS</TableHead>
                    <TableHead className="min-w-[150px]">Nama Santri</TableHead>
                    <TableHead className="w-20 text-center">Total Nilai</TableHead>
                    <TableHead className="w-16 text-center">Rata-rata</TableHead>
                    <TableHead className="w-28 text-center">Kepribadian</TableHead>
                    <TableHead className="w-20 text-center">Presensi</TableHead>
                    <TableHead className="w-24 text-center">Urutan Seri</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {orderedStudents.map((s, idx) => {
                    const rankNum = idx + 1;
                    const canMoveUp =
                      idx > 0 && orderedStudents[idx - 1].total_nilai === s.total_nilai;
                    const canMoveDown =
                      idx < orderedStudents.length - 1 &&
                      orderedStudents[idx + 1].total_nilai === s.total_nilai;

                    return (
                      <TableRow
                        key={s.enrollment_id}
                        className={s.is_seri ? "bg-amber-50/50 hover:bg-amber-50/80" : "hover:bg-zinc-50"}
                      >
                        <TableCell className="text-center font-bold text-zinc-900 font-mono">
                          <Badge
                            variant={rankNum <= 3 ? "default" : "outline"}
                            className={
                              rankNum === 1
                                ? "bg-amber-600 text-white"
                                : rankNum === 2
                                ? "bg-zinc-400 text-white"
                                : rankNum === 3
                                ? "bg-amber-800 text-white"
                                : "text-zinc-600"
                            }
                          >
                            #{rankNum}
                          </Badge>
                        </TableCell>

                        <TableCell className="font-mono text-zinc-600">
                          {s.nis || "-"}
                        </TableCell>

                        <TableCell>
                          <div className="font-semibold text-zinc-900">{s.nama}</div>
                          {s.is_seri && (
                            <Badge
                              variant="outline"
                              className="border-amber-400 text-amber-800 text-[9px] py-0 px-1 mt-0.5"
                            >
                              Nilai Seri ({s.total_nilai})
                            </Badge>
                          )}
                        </TableCell>

                        <TableCell className="text-center font-bold font-mono text-emerald-800">
                          {s.total_nilai}
                        </TableCell>

                        <TableCell className="text-center font-mono text-zinc-700">
                          {s.rata_rata}
                        </TableCell>

                        <TableCell className="text-center text-[11px] text-zinc-600">
                          <div>Akhlak: {s.catatan?.akhlak ?? "-"}</div>
                          <div>Tekun: {s.catatan?.ketekunan ?? "-"}</div>
                        </TableCell>

                        <TableCell className="text-center font-mono text-[11px] text-zinc-600">
                          S:{s.catatan?.sakit ?? 0} I:{s.catatan?.izin ?? 0} A:{s.catatan?.alpa ?? 0}
                        </TableCell>

                        <TableCell className="text-center">
                          {s.is_seri ? (
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                disabled={!canMoveUp || isPending}
                                onClick={() => handleMove(idx, "up")}
                                className="h-6 w-6 p-0 hover:bg-amber-200/60"
                                title="Naikkan urutan peringkat"
                              >
                                <ArrowUpIcon className="h-3.5 w-3.5 text-zinc-700" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                disabled={!canMoveDown || isPending}
                                onClick={() => handleMove(idx, "down")}
                                className="h-6 w-6 p-0 hover:bg-amber-200/60"
                                title="Turunkan urutan peringkat"
                              >
                                <ArrowDownIcon className="h-3.5 w-3.5 text-zinc-700" />
                              </Button>
                            </div>
                          ) : (
                            <span className="text-zinc-400 text-[11px]">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Peringatan Dampak Penguncian */}
            <div className="rounded-md border border-zinc-200 bg-zinc-50 p-2.5 text-[11px] text-zinc-600 space-y-0.5 shrink-0">
              <p className="font-semibold text-zinc-900 flex items-center gap-1.5">
                <LockIcon className="h-3 w-3 text-destructive" />
                Peringatan Efek Penguncian Final:
              </p>
              <p>
                Setelah difinalisasi, status kelas akan berubah menjadi <strong>FINAL (TERKUNCI)</strong>. Seluruh lembar nilai dan catatan santri tidak dapat diedit kembali oleh guru maupun wali kelas. Pembukaan kunci hanya dapat dilakukan oleh Administrator melalui dialog konfirmasi khusus.
              </p>
            </div>
          </div>
        )}

        <DialogFooter className="pt-3 border-t border-zinc-100 flex items-center justify-between">
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={() => onOpenChange(false)}
          >
            Batal
          </Button>

          {readiness?.isReady && (
            <Button
              type="button"
              disabled={isPending}
              onClick={handleFinalisasi}
              className="bg-emerald-700 hover:bg-emerald-800 text-white gap-1.5"
            >
              {isPending ? (
                <>
                  <Loader2Icon className="h-4 w-4 animate-spin" />
                  Memproses Finalisasi...
                </>
              ) : (
                <>
                  <ShieldCheckIcon className="h-4 w-4" />
                  Finalisasi & Kunci Raport
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

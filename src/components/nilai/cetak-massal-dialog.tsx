"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Printer, Download, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import {
  generateClassRaportMassalAction,
  type CetakMassalActionResult,
} from "@/app/actions/cetak-massal";

interface CetakMassalDialogProps {
  marhalahId: string;
  marhalahNama: string;
  semesterId: string;
  semesterJenis: string;
  tahunAjaranNama: string;
  isFinal: boolean;
}

export function CetakMassalDialog({
  marhalahId,
  marhalahNama,
  semesterId,
  semesterJenis,
  tahunAjaranNama,
  isFinal,
}: CetakMassalDialogProps) {
  const [open, setOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<CetakMassalActionResult | null>(null);

  const handleStartGenerate = async () => {
    setProcessing(true);
    setResult(null);

    try {
      const res = await generateClassRaportMassalAction({
        marhalahId,
        semesterId,
      });

      setResult(res);

      if (res.ok) {
        toast.success("Raport massal berhasil dibuat!", {
          description: `Total ${res.totalSantri} santri diproses dalam ${res.durationMs} ms.`,
        });

        // Trigger otomatis unduh browser
        if (res.directUrl || res.downloadUrl) {
          const targetUrl = res.directUrl || res.downloadUrl!;
          const link = document.createElement("a");
          link.href = targetUrl;
          link.setAttribute("download", `Raport_${marhalahNama}.pdf`);
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      } else {
        toast.error("Gagal mencetak raport", {
          description: res.message,
        });
      }
    } catch (err) {
      toast.error("Terjadi kesalahan sistem", {
        description: err instanceof Error ? err.message : "Gagal memproses",
      });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={!isFinal}
          className="border-emerald-600 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 disabled:opacity-50"
          title={
            !isFinal
              ? "Raport kelas ini harus difinalisasi terlebih dahulu sebelum dicetak massal."
              : "Cetak raport seluruh santri dalam satu kelas menjadi satu file PDF."
          }
        >
          <Printer className="w-4 h-4 mr-1.5 text-emerald-600" />
          Cetak Raport Kelas (PDF)
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900">
                Cetak Raport Massal (Satu Kelas)
              </DialogTitle>
              <DialogDescription className="text-xs">
                Mencetak seluruh lembar raport santri kelas ini ke dalam 1 file PDF gabungan resmi.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-3 py-2 text-xs">
          <div className="p-3 bg-slate-50 border rounded-lg space-y-1.5">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Marhalah / Kelas:</span>
              <span className="font-semibold text-slate-800">{marhalahNama}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tahun Ajaran / Semester:</span>
              <span className="font-semibold text-slate-800">
                {tahunAjaranNama} / Semester {semesterJenis.toUpperCase()}
              </span>
            </div>
            <div className="flex justify-between items-center pt-1 border-t">
              <span className="text-muted-foreground">Status Nilai:</span>
              {isFinal ? (
                <Badge className="bg-emerald-600 text-white hover:bg-emerald-700 text-[10px] px-2 py-0.5">
                  FINAL (Terkunci)
                </Badge>
              ) : (
                <Badge variant="outline" className="text-amber-600 border-amber-300 text-[10px]">
                  DRAFT
                </Badge>
              )}
            </div>
          </div>

          {!isFinal ? (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2 text-amber-800">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Raport Belum Difinalisasi</p>
                <p className="text-[11px] mt-0.5 leading-relaxed">
                  Sesuai ketentuan, cetak massal satu kelas hanya diizinkan untuk raport yang statusnya telah <strong>FINAL</strong> dan memiliki ranking terbitan resmi.
                </p>
              </div>
            </div>
          ) : result?.ok ? (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg space-y-2">
              <div className="flex items-center gap-1.5 text-emerald-800 font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Dokumen PDF Siap Diunduh</span>
              </div>
              <div className="text-[11px] text-emerald-700 space-y-1 pl-5">
                <p>• Total Santri: <strong>{result.totalSantri} santri</strong></p>
                <p>• Waktu Generate: <strong>{result.durationMs} ms</strong></p>
                {result.isStorageSaved ? (
                  <p>• Arsip: Tersimpan aman di Supabase Storage</p>
                ) : (
                  <p>• Jalur: Streaming langsung dari server</p>
                )}
              </div>
              <div className="pt-2 flex gap-2">
                <a
                  href={result.directUrl || result.downloadUrl}
                  download={`Raport_${marhalahNama}.pdf`}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded font-medium text-xs transition"
                >
                  <Download className="w-3.5 h-3.5" /> Unduh Dokumen Lagi
                </a>
              </div>
            </div>
          ) : (
            <div className="text-muted-foreground text-[11px] space-y-1">
              <p>• Setiap santri menempati 1 halaman A4 portrait lengkap dengan kop dan logo resmi.</p>
              <p>• Menyertakan QR Code verifikasi unik per santri berstatus sah.</p>
              <p>• Format tabel standar 12 baris dengan nilai angka & terbilang huruf.</p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setOpen(false)}
            disabled={processing}
          >
            Tutup
          </Button>

          {isFinal && !result?.ok && (
            <Button
              type="button"
              size="sm"
              className="bg-emerald-700 hover:bg-emerald-800 text-white"
              onClick={handleStartGenerate}
              disabled={processing}
            >
              {processing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                  Memproses Dokumen...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-1.5" />
                  Mulai Cetak Massal (PDF)
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

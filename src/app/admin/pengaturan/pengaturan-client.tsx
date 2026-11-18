"use client";

import React, { useState, useTransition } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Building2,
  Calendar,
  MapPin,
  UserCheck,
  CheckCircle2,
  Loader2,
  Eye,
  RotateCcw,
  QrCode,
  FileText,
  Globe,
} from "lucide-react";
import {
  updatePengaturanLembagaAction,
  type PengaturanLembagaData,
} from "../actions/pengaturan";

interface PengaturanClientProps {
  initialData: PengaturanLembagaData;
}

export function PengaturanClient({ initialData }: PengaturanClientProps) {
  const [formData, setFormData] = useState<PengaturanLembagaData>(initialData);
  const [isPending, startTransition] = useTransition();

  const handleChange = (field: keyof PengaturanLembagaData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleApplyPreset = (tanggal: string) => {
    setFormData((prev) => ({ ...prev, tanggal_raport: tanggal }));
    toast.info(`Tanggal raport diatur: ${tanggal}`);
  };

  const handleResetDefault = () => {
    setFormData({
      judul_lembaga: "LEMBAGA PENDIDIKAN PONDOK PESANTREN",
      nama_lembaga: "KH ZUMRATUL MUTTAQIN",
      alamat_header: "SUKARAME TASIKMALAYA JAWA BARAT",
      tempat_terbit: "Sukamenak",
      tanggal_raport: "20 Desember 2025",
      nama_pimpinan: "KH. MIMIH SAEFUL MILLAH, S.Pd",
    });
    toast.info("Formulir dikembalikan ke nilai acuan default.");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    startTransition(async () => {
      try {
        const res = await updatePengaturanLembagaAction(formData);
        if (res.ok) {
          toast.success("Berhasil disimpan!", {
            description: "Pengaturan titimangsa dan lembaga raport telah diperbarui.",
          });
          if (res.data) {
            setFormData(res.data);
          }
        } else {
          toast.error("Gagal menyimpan", { description: res.message });
        }
      } catch (err) {
        toast.error("Terjadi kesalahan sistem", {
          description: err instanceof Error ? err.message : "Gagal memproses",
        });
      }
    });
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Halaman */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Pengaturan Titimangsa & Lembaga
            </h1>
            <Badge variant="outline" className="border-emerald-500 text-emerald-700 bg-emerald-50">
              Resmi Raport
            </Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Konfigurasi tempat terbit, tanggal pencetakan raport santri, dan identitas kop surat pesantren.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleResetDefault}
            disabled={isPending}
            className="text-slate-600 hover:text-slate-900"
          >
            <RotateCcw className="w-4 h-4 mr-1.5" />
            Reset Default
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Kolom Kiri: Form Pengaturan (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* CARD 1: TITIMANGSA RAPORT */}
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="pb-3 border-b border-slate-100">
                <CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-emerald-600" />
                  Konfigurasi Titimangsa Raport
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Data yang dicetak pada bagian bawah raport (tempat, tanggal, dan pimpinan).
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                {/* Tempat Terbit */}
                <div className="space-y-1.5">
                  <Label htmlFor="tempat_terbit" className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    Tempat Terbit Raport
                  </Label>
                  <Input
                    id="tempat_terbit"
                    value={formData.tempat_terbit}
                    onChange={(e) => handleChange("tempat_terbit", e.target.value)}
                    placeholder="Contoh: Sukamenak"
                    required
                    className="h-9 text-sm"
                  />
                  <p className="text-[11px] text-slate-400">
                    Akan dicetak sebagai: <span className="italic font-medium text-slate-600">Diberikan di {formData.tempat_terbit || "..."}</span>
                  </p>
                </div>

                {/* Tanggal Terbit Raport */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="tanggal_raport" className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      Tanggal Terbit Raport
                    </Label>
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-slate-400 mr-1">Preset:</span>
                      <button
                        type="button"
                        onClick={() => handleApplyPreset("20 Desember 2025")}
                        className="text-[11px] px-2 py-0.5 rounded bg-slate-100 hover:bg-emerald-100 text-slate-700 hover:text-emerald-800 transition"
                      >
                        Ganjil
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApplyPreset("20 Juni 2026")}
                        className="text-[11px] px-2 py-0.5 rounded bg-slate-100 hover:bg-emerald-100 text-slate-700 hover:text-emerald-800 transition"
                      >
                        Genap
                      </button>
                    </div>
                  </div>
                  <Input
                    id="tanggal_raport"
                    value={formData.tanggal_raport}
                    onChange={(e) => handleChange("tanggal_raport", e.target.value)}
                    placeholder="Contoh: 20 Desember 2025"
                    required
                    className="h-9 text-sm"
                  />
                  <p className="text-[11px] text-slate-400">
                    Akan dicetak sebagai: <span className="italic font-medium text-slate-600">Pada tanggal: {formData.tanggal_raport || "..."}</span>
                  </p>
                </div>

                {/* Nama Pimpinan Pesantren */}
                <div className="space-y-1.5">
                  <Label htmlFor="nama_pimpinan" className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                    Nama Pimpinan Pesantren (Penandatangan)
                  </Label>
                  <Input
                    id="nama_pimpinan"
                    value={formData.nama_pimpinan}
                    onChange={(e) => handleChange("nama_pimpinan", e.target.value)}
                    placeholder="Contoh: KH. MIMIH SAEFUL MILLAH, S.Pd"
                    required
                    className="h-9 text-sm font-medium"
                  />
                  <p className="text-[11px] text-slate-400">
                    Nama lengkap beserta gelar pimpinan pondok pesantren yang tercetak di bawah kolom tanda tangan kanan.
                  </p>
                </div>

                {/* Domain / URL Publik QR Code */}
                <div className="space-y-1.5 pt-2 border-t border-slate-100">
                  <Label htmlFor="domain_url" className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-slate-400" />
                    Domain / URL Publik Verifikasi QR (Opsional)
                  </Label>
                  <Input
                    id="domain_url"
                    value={formData.domain_url || ""}
                    onChange={(e) => handleChange("domain_url", e.target.value)}
                    placeholder="Otomatis mengikuti domain Vercel yang aktif"
                    className="h-9 text-sm"
                  />
                  <p className="text-[11px] text-slate-400">
                    Bila dikosongkan, QR Code otomatis mendeteksi domain Vercel yang sedang Anda akses. Anda juga dapat menentukan domain custom sendiri (misal: <span className="font-mono text-slate-600">https://raport-ehb-khzm.vercel.app</span>).
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* CARD 2: KOP SURAT PESANTREN */}
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="pb-3 border-b border-slate-100">
                <CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-emerald-600" />
                  Identitas Lembaga & Kop Surat
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Teks header kop surat yang tercetak di bagian paling atas raport.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <div className="space-y-1.5">
                  <Label htmlFor="judul_lembaga" className="text-xs font-semibold text-slate-700">
                    Judul Kop Atas
                  </Label>
                  <Input
                    id="judul_lembaga"
                    value={formData.judul_lembaga}
                    onChange={(e) => handleChange("judul_lembaga", e.target.value)}
                    placeholder="LEMBAGA PENDIDIKAN PONDOK PESANTREN"
                    className="h-9 text-sm uppercase"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="nama_lembaga" className="text-xs font-semibold text-slate-700">
                    Nama Pondok Pesantren
                  </Label>
                  <Input
                    id="nama_lembaga"
                    value={formData.nama_lembaga}
                    onChange={(e) => handleChange("nama_lembaga", e.target.value)}
                    placeholder="KH ZUMRATUL MUTTAQIN"
                    className="h-9 text-sm font-bold uppercase"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="alamat_header" className="text-xs font-semibold text-slate-700">
                    Alamat Header / Daerah
                  </Label>
                  <Input
                    id="alamat_header"
                    value={formData.alamat_header}
                    onChange={(e) => handleChange("alamat_header", e.target.value)}
                    placeholder="SUKARAME TASIKMALAYA JAWA BARAT"
                    className="h-9 text-sm uppercase"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Tombol Simpan Desktop */}
            <div className="hidden sm:flex items-center justify-end gap-3">
              <Button
                type="submit"
                disabled={isPending}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-6"
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Simpan Perubahan
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Kolom Kanan: Pratinjau Langsung (Live Preview) (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <Card className="border-slate-200 shadow-sm sticky top-4">
              <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
                <CardTitle className="text-sm font-semibold text-slate-800 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Eye className="w-4 h-4 text-emerald-600" />
                    Pratinjau Hasil Cetak PDF
                  </span>
                  <Badge variant="secondary" className="text-[10px] bg-emerald-100 text-emerald-800 font-normal">
                    Live Preview
                  </Badge>
                </CardTitle>
                <CardDescription className="text-[11px] text-slate-500">
                  Gambaran visual bagaimana titimangsa & kop surat akan terbit di berkas PDF fisik.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 space-y-4 text-[11px]">
                {/* 1. Preview Kop Surat */}
                <div className="border border-slate-300 rounded p-3 bg-white shadow-xs">
                  <div className="flex items-center gap-2.5 pb-2 border-b-2 border-black">
                    <div className="w-10 h-10 rounded-full border border-slate-300 bg-slate-100 flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5 text-slate-500" />
                    </div>
                    <div className="flex-1 text-center">
                      <div className="text-[9px] uppercase tracking-wider text-black">
                        {formData.judul_lembaga || "LEMBAGA PENDIDIKAN PONDOK PESANTREN"}
                      </div>
                      <div className="text-[13px] font-bold uppercase tracking-wider text-black">
                        {formData.nama_lembaga || "KH ZUMRATUL MUTTAQIN"}
                      </div>
                      <div className="text-[8px] uppercase tracking-wider text-black">
                        {formData.alamat_header || "SUKARAME TASIKMALAYA JAWA BARAT"}
                      </div>
                    </div>
                  </div>
                  <div className="text-[9px] text-center text-slate-400 mt-1 italic">
                    (Bagian Header Raport Resmi)
                  </div>
                </div>

                {/* 2. Preview Titimangsa & Tanda Tangan */}
                <div className="border border-slate-300 rounded p-3 bg-white shadow-xs space-y-3">
                  {/* Titimangsa & QR Row */}
                  <div className="flex items-center justify-between pb-2">
                    <div className="flex items-center gap-1.5">
                      <div className="w-8 h-8 border border-slate-400 flex items-center justify-center bg-slate-50">
                        <QrCode className="w-5 h-5 text-slate-700" />
                      </div>
                      <div className="leading-tight">
                        <div className="text-[8px] font-bold text-black">Validasi Rapor Digital</div>
                        <div className="text-[7px] text-slate-500 truncate max-w-[140px]">
                          {formData.domain_url ? formData.domain_url : "https://[domain-vercel]/verifikasi/..."}
                        </div>
                        <div className="text-[7px] font-mono font-bold text-slate-700">ID: ZM-7B2A91D0</div>
                      </div>
                    </div>

                    <div className="text-right leading-tight">
                      <div className="text-[9px] text-black">
                        Diberikan di <span className="font-semibold">{formData.tempat_terbit || "Sukamenak"}</span>
                      </div>
                      <div className="text-[9px] text-black">
                        Pada tanggal: <span className="font-semibold">{formData.tanggal_raport || "20 Desember 2025"}</span>
                      </div>
                    </div>
                  </div>

                  {/* 3 Kolom Tanda Tangan */}
                  <div className="grid grid-cols-3 gap-1 pt-1 text-center border-t border-slate-200">
                    {/* Orang Tua */}
                    <div className="space-y-7">
                      <div className="text-[8px] text-black">Orang Tua/Wali</div>
                      <div className="border-b border-black w-14 mx-auto" />
                    </div>

                    {/* Wali Kelas */}
                    <div className="space-y-6">
                      <div className="text-[8px] text-black">Wali Kelas,</div>
                      <div className="text-[8px] font-bold text-black leading-tight border-b border-black pb-0.5">
                        SINAR KHOTIMATUL H., S.Pd
                      </div>
                    </div>

                    {/* Pimpinan Pesantren */}
                    <div className="space-y-4">
                      <div className="text-[8px] text-black leading-tight">Pimpinan Pesantren,</div>
                      <div className="text-[7px] italic text-emerald-700">[ TTD Resmi Terlampir ]</div>
                      <div className="text-[8px] font-bold text-black leading-tight border-b border-black pb-0.5">
                        {formData.nama_pimpinan || "KH. MIMIH SAEFUL MILLAH, S.Pd"}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Info Note */}
                <div className="rounded bg-emerald-50 border border-emerald-200 p-2.5 text-emerald-900 text-[11px] leading-relaxed">
                  <p className="font-semibold text-emerald-950 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Terkoneksi Otomatis ke Cetak Massal:
                  </p>
                  <p className="text-[10px] text-emerald-800 mt-0.5">
                    Perubahan titimangsa akan langsung diterapkan secara realtime saat Administrator atau Wali Kelas melakukan cetak raport PDF santri.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Tombol Simpan Mobile Sticky */}
            <div className="sm:hidden pt-2">
              <Button
                type="submit"
                disabled={isPending}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium h-10 shadow-md"
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Simpan Perubahan Titimangsa
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

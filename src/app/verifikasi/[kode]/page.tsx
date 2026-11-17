import React from "react";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ShieldAlert,
  Calendar,
  GraduationCap,
  BookOpen,
  ArrowLeft,
  User,
} from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface PageProps {
  params: Promise<{
    kode: string;
  }>;
}

interface VerificationRecord {
  nama_santri: string;
  marhalah: string;
  tahun_ajaran: string;
  semester: string;
  tanggal_terbit: string;
  status: "valid" | "digantikan" | "dicabut" | string;
}

export default async function VerifikasiRaportPage({ params }: PageProps) {
  const { kode } = await params;
  const decodedKode = decodeURIComponent(kode || "").trim();

  let record: VerificationRecord | null = null;
  let hasError = false;

  // 1. Coba panggil RPC publik verifikasi_raport(kode)
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("verifikasi_raport", {
      kode: decodedKode,
    });

    if (error) {
      // Fallback ke admin client jika terjadi kendala koneksi anon
      const admin = createAdminClient();
      const { data: adminData } = await admin.rpc("verifikasi_raport", {
        kode: decodedKode,
      });
      if (adminData && adminData.length > 0) {
        record = adminData[0] as VerificationRecord;
      } else {
        hasError = true;
      }
    } else if (data && data.length > 0) {
      record = data[0] as VerificationRecord;
    }
  } catch {
    hasError = true;
  }

  // Format tanggal terbit Indonesia
  let formattedTanggal = "-";
  if (record?.tanggal_terbit) {
    try {
      const d = new Date(record.tanggal_terbit);
      formattedTanggal = new Intl.DateTimeFormat("id-ID", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZoneName: "short",
      }).format(d);
    } catch {
      formattedTanggal = record.tanggal_terbit;
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex flex-col justify-between py-8 px-4 sm:px-6">
      <div className="max-w-xl w-full mx-auto">
        {/* Header Lembaga */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center mb-3">
            <Image
              src="/logo.png"
              alt="Logo KH Zumratul Muttaqin"
              width={56}
              height={56}
              className="h-14 w-14 object-contain drop-shadow-xs"
              priority
            />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            Verifikasi Keaslian Raport
          </h1>
          <p className="text-sm font-medium text-emerald-800 mt-1">
            Pondok Pesantren K.H. Zumratul Muttaqin
          </p>
        </div>

        {/* Kondisi 1: Kode Tidak Ditemukan / Dokumen Tidak Valid */}
        {!record || hasError ? (
          <Card className="border-red-200 shadow-md overflow-hidden">
            <div className="bg-red-500 h-2 w-full" />
            <CardHeader className="text-center pb-3">
              <div className="mx-auto w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-red-600 mb-2">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <Badge variant="destructive" className="mx-auto text-xs py-1 px-3">
                Dokumen Tidak Ditemukan
              </Badge>
              <h2 className="text-base font-semibold text-slate-800 mt-2">
                Kode Verifikasi Tidak Valid
              </h2>
            </CardHeader>
            <CardContent className="space-y-4 text-center text-sm text-slate-600 pt-0">
              <p>
                Kode verifikasi <code className="font-mono font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-800">{decodedKode}</code> tidak terdaftar pada pangkalan data arsip raport resmi Pondok Pesantren K.H. Zumratul Muttaqin.
              </p>
              <div className="p-3 bg-red-50/70 border border-red-100 rounded-lg text-xs text-red-700 text-left">
                <p className="font-semibold mb-1">Perhatian:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Pastikan Anda memindai kode QR langsung dari lembar fisik/elektronik raport resmi.</li>
                  <li>Raport yang masih berstatus DRAFT belum memiliki kode verifikasi resmi.</li>
                  <li>Jika Anda merasa ini kekeliruan, silakan hubungi bagian sekretariat pesantren.</li>
                </ul>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-2 pt-2 border-t bg-slate-50/50">
              <p className="text-xs text-muted-foreground text-center">
                Diterbitkan oleh sistem raport KH Zumratul Muttaqin
              </p>
              <Link
                href="/login"
                className="inline-flex items-center text-xs text-emerald-700 hover:text-emerald-800 font-medium"
              >
                <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Ke Halaman Utama
              </Link>
            </CardFooter>
          </Card>
        ) : (
          /* Kondisi 2: Dokumen Ditemukan (Valid / Digantikan / Dicabut) */
          <Card className="shadow-lg border-t-4 border-t-emerald-600 overflow-hidden">
            {/* Status Banner */}
            <div
              className={`p-4 text-center border-b ${
                record.status === "valid"
                  ? "bg-emerald-50 text-emerald-900 border-emerald-100"
                  : record.status === "digantikan"
                  ? "bg-amber-50 text-amber-900 border-amber-100"
                  : "bg-red-50 text-red-900 border-red-100"
              }`}
            >
              <div className="flex items-center justify-center gap-2 mb-1">
                {record.status === "valid" && (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span className="text-base font-bold text-emerald-800">
                      STATUS: SAH
                    </span>
                  </>
                )}
                {record.status === "digantikan" && (
                  <>
                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                    <span className="text-base font-bold text-amber-800">
                      STATUS: DIGANTIKAN
                    </span>
                  </>
                )}
                {record.status === "dicabut" && (
                  <>
                    <XCircle className="w-5 h-5 text-red-600" />
                    <span className="text-base font-bold text-red-800">
                      STATUS: DICABUT
                    </span>
                  </>
                )}
              </div>

              <p className="text-xs max-w-md mx-auto">
                {record.status === "valid" &&
                  "Dokumen raport ini sah, resmi, dan terverifikasi di pangkalan data Pondok Pesantren K.H. Zumratul Muttaqin."}
                {record.status === "digantikan" &&
                  "Dokumen raport dengan kode ini telah diterbitkan ulang dengan versi yang lebih baru. Dokumen fisik ini sudah tidak berlaku."}
                {record.status === "dicabut" &&
                  "Keabsahan dokumen raport ini telah dicabut oleh pihak lembaga dan tidak berlaku sebagai dokumen resmi."}
              </p>
            </div>

            <CardContent className="p-6 space-y-4">
              <div className="text-center pb-2 border-b">
                <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                  Nama Santri
                </span>
                <h3 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center justify-center gap-2 mt-1">
                  <User className="w-5 h-5 text-emerald-700" />
                  {record.nama_santri}
                </h3>
              </div>

              {/* Grid Metadata */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex items-start gap-3">
                  <GraduationCap className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Marhalah (Kelas)</p>
                    <p className="font-semibold text-slate-800">{record.marhalah}</p>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex items-start gap-3">
                  <BookOpen className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Semester / Tahun Ajaran</p>
                    <p className="font-semibold text-slate-800">
                      Semester {record.semester.toUpperCase()} · TA {record.tahun_ajaran}
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex items-start gap-3 sm:col-span-2">
                  <Calendar className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground font-medium">Tanggal Diterbitkan</p>
                    <p className="font-semibold text-slate-800">{formattedTanggal}</p>
                  </div>
                </div>
              </div>

              {/* Rincian Kode Unik */}
              <div className="p-3 bg-muted/40 rounded-lg text-center">
                <p className="text-[11px] text-muted-foreground uppercase tracking-widest font-mono">
                  Kode Verifikasi
                </p>
                <p className="text-sm font-mono font-bold tracking-wider text-slate-800 select-all mt-0.5">
                  {decodedKode}
                </p>
              </div>

              <div className="text-[11px] text-muted-foreground text-center italic">
                * Demi kerahasiaan dan privasi santri, rincian nilai per mata pelajaran hanya tercantum pada lembar raport cetak asli.
              </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-2 pt-4 border-t bg-slate-50/60 text-center">
              <p className="text-xs font-medium text-emerald-900">
                Diterbitkan oleh sistem raport KH Zumratul Muttaqin
              </p>
              <p className="text-[10px] text-muted-foreground">
                Sistem EHB & Raport Elektronik Pesantren
              </p>
            </CardFooter>
          </Card>
        )}
      </div>

      {/* Footer Info */}
      <footer className="text-center text-xs text-muted-foreground mt-8">
        &copy; {new Date().getFullYear()} Pondok Pesantren K.H. Zumratul Muttaqin. Hak Cipta Dilindungi.
      </footer>
    </div>
  );
}

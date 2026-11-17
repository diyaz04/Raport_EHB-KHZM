import * as React from "react";
import Link from "next/link";
import {
  BookOpenIcon,
  CheckCircle2Icon,
  UsersIcon,
  TableIcon,
  AlertCircleIcon,
  ArrowRightIcon,
  ShieldAlertIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getEffectiveContext } from "@/lib/auth/context";
import { createAdminClient } from "@/lib/supabase/admin";

interface AssignedClass {
  marhalahId: string;
  nama: string;
  kode: string;
  isWaliKelas: boolean;
  mapelDiampu: string[];
  totalSantri: number;
  statusRaport: "draft" | "final" | "belum_ada";
}

export default async function GuruDashboardPage() {
  const context = await getEffectiveContext();
  const namaGuru = context.effectiveGuruName ?? context.profile?.nama ?? "Bapak/Ibu Guru";
  const activeTeacherId = context.isActingAs ? context.effectiveGuruId : context.user?.id;

  const adminClient = createAdminClient();

  // 1. Ambil semester aktif
  const { data: activeSemester } = await adminClient
    .from("semester")
    .select("id, jenis, aktif, tahun_ajaran_id, tahun_ajaran(nama, kode)")
    .eq("aktif", true)
    .maybeSingle();

  const taNama =
    (activeSemester?.tahun_ajaran as unknown as { nama: string })?.nama ?? "2025/2026";
  const semJenis = activeSemester?.jenis ?? "Ganjil";

  // 2. Ambil penugasan Wali Kelas & Pengampu
  const assignedClasses: AssignedClass[] = [];
  let totalSantriCount = 0;
  let totalMapelCount = 0;

  if (activeSemester && activeTeacherId) {
    // a. Wali kelas
    const { data: waliList } = await adminClient
      .from("guru_marhalah")
      .select("marhalah_id, marhalah(id, nama, kode)")
      .eq("guru_id", activeTeacherId)
      .eq("tahun_ajaran_id", activeSemester.tahun_ajaran_id);

    // b. Pengampu
    const { data: pengampuList } = await adminClient
      .from("pengampu")
      .select(
        "marhalah_mapel(id, marhalah_id, mapel(nama), marhalah(id, nama, kode), semester_id)"
      )
      .eq("guru_id", activeTeacherId);

    // Filter pengampu untuk semester aktif
    interface RawPengampuItem {
      marhalah_mapel: {
        id: string;
        marhalah_id: string;
        semester_id: string;
        mapel: { nama: string } | null;
        marhalah: { id: string; nama: string; kode: string } | null;
      } | null;
    }

    const filteredPengampu = ((pengampuList ?? []) as unknown as RawPengampuItem[]).filter(
      (p) => p.marhalah_mapel && p.marhalah_mapel.semester_id === activeSemester.id
    );

    // Kumpulkan seluruh marhalah_id yang terkait
    const marhalahMap = new Map<
      string,
      {
        nama: string;
        kode: string;
        isWaliKelas: boolean;
        mapelDiampu: string[];
      }
    >();

    // Tambah dari wali kelas
    interface RawWaliItem {
      marhalah_id: string;
      marhalah: { id: string; nama: string; kode: string } | null;
    }
    ((waliList ?? []) as unknown as RawWaliItem[]).forEach((w) => {
      if (w.marhalah) {
        marhalahMap.set(w.marhalah_id, {
          nama: w.marhalah.nama,
          kode: w.marhalah.kode,
          isWaliKelas: true,
          mapelDiampu: [],
        });
      }
    });

    // Tambah dari pengampu
    filteredPengampu.forEach((p) => {
      if (p.marhalah_mapel?.marhalah) {
        const mId = p.marhalah_mapel.marhalah_id;
        const current = marhalahMap.get(mId) || {
          nama: p.marhalah_mapel.marhalah.nama,
          kode: p.marhalah_mapel.marhalah.kode,
          isWaliKelas: false,
          mapelDiampu: [],
        };
        if (p.marhalah_mapel.mapel?.nama) {
          current.mapelDiampu.push(p.marhalah_mapel.mapel.nama);
        }
        marhalahMap.set(mId, current);
      }
    });

    // Jika guru belum ditugaskan di marhalah manapun, namun ada marhalah di database (misal admin testing)
    if (marhalahMap.size === 0) {
      const { data: allMarhalah } = await adminClient
        .from("marhalah")
        .select("id, nama, kode")
        .is("deleted_at", null)
        .order("urutan", { ascending: true })
        .limit(3);

      (allMarhalah ?? []).forEach((m) => {
        marhalahMap.set(m.id, {
          nama: m.nama,
          kode: m.kode,
          isWaliKelas: false,
          mapelDiampu: [],
        });
      });
    }

    // Ambil data santri count & status_raport untuk marhalah-marhalah ini
    const marhalahIds = Array.from(marhalahMap.keys());
    if (marhalahIds.length > 0) {
      const [enrollRes, statusRes] = await Promise.all([
        adminClient
          .from("enrollment")
          .select("id, marhalah_id, santri!inner(deleted_at)")
          .eq("tahun_ajaran_id", activeSemester.tahun_ajaran_id)
          .in("marhalah_id", marhalahIds)
          .is("santri.deleted_at", null),
        adminClient
          .from("status_raport")
          .select("marhalah_id, status")
          .eq("semester_id", activeSemester.id)
          .in("marhalah_id", marhalahIds),
      ]);

      const enrollCounts: Record<string, number> = {};
      (enrollRes.data ?? []).forEach((e) => {
        enrollCounts[e.marhalah_id] = (enrollCounts[e.marhalah_id] || 0) + 1;
      });

      const statusMap: Record<string, "draft" | "final"> = {};
      (statusRes.data ?? []).forEach((s) => {
        statusMap[s.marhalah_id] = s.status as "draft" | "final";
      });

      marhalahMap.forEach((val, mId) => {
        const count = enrollCounts[mId] || 0;
        totalSantriCount += count;
        totalMapelCount += val.mapelDiampu.length;

        assignedClasses.push({
          marhalahId: mId,
          nama: val.nama,
          kode: val.kode,
          isWaliKelas: val.isWaliKelas,
          mapelDiampu: val.mapelDiampu,
          totalSantri: count,
          statusRaport: statusMap[mId] || "draft",
        });
      });
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
          Dashboard Guru
        </h1>
        <p className="text-sm text-zinc-500">
          Ahlan wa sahlan, {namaGuru}. Tahun Ajaran {taNama} — Semester {semJenis}.
        </p>
      </div>

      {context.isActingAs ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-4 text-sm text-amber-900 flex items-start gap-3">
          <ShieldAlertIcon className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Mode Bertindak Aktif:</p>
            <p className="text-xs text-amber-800 mt-0.5">
              Anda sedang mengakses panel ini sebagai Administrator atas nama <strong>{namaGuru}</strong>.
              Setiap pengisian nilai akan tercatat di log audit dengan mode <code className="bg-amber-100 px-1 py-0.5 rounded font-mono text-[11px]">act_as</code>.
            </p>
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-zinc-200 bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-zinc-600">Total Kelas Ditugaskan</CardTitle>
            <UsersIcon className="h-4 w-4 text-zinc-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-zinc-900">{assignedClasses.length} Marhalah</div>
            <p className="text-xs text-zinc-500 mt-1">
              {totalSantriCount} santri terdaftar
            </p>
          </CardContent>
        </Card>

        <Card className="border-zinc-200 bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-zinc-600">Mapel Diampu</CardTitle>
            <BookOpenIcon className="h-4 w-4 text-zinc-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-zinc-900">{totalMapelCount} Mata Pelajaran</div>
            <p className="text-xs text-zinc-500 mt-1">Semester {semJenis}</p>
          </CardContent>
        </Card>

        <Card className="border-zinc-200 bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-zinc-600">Status Periode</CardTitle>
            <CheckCircle2Icon className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-700">Aktif</div>
            <p className="text-xs text-zinc-500 mt-1">Pengisian nilai sedang dibuka</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-zinc-200 bg-white">
        <CardHeader>
          <CardTitle>Lembar Pengisian Nilai & Catatan</CardTitle>
          <CardDescription>
            Pilih kelas untuk membuka matriks lembar nilai santri, catatan kepribadian, dan presensi.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {assignedClasses.length === 0 ? (
            <div className="text-center py-8 border border-dashed rounded-lg text-zinc-500">
              <AlertCircleIcon className="mx-auto h-8 w-8 text-zinc-400 mb-2" />
              <p className="font-medium text-zinc-700">Belum Ada Penugasan Kelas</p>
              <p className="text-xs text-zinc-400 mt-1">
                Akun Anda belum ditugaskan sebagai Wali Kelas atau Pengampu pada semester aktif ini.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {assignedClasses.map((cls) => (
                <div
                  key={cls.marhalahId}
                  className="flex flex-col justify-between rounded-lg border border-zinc-200 p-4 transition-colors hover:border-zinc-300 hover:bg-zinc-50/50"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-zinc-900">{cls.nama}</span>
                      {cls.statusRaport === "final" ? (
                        <Badge variant="secondary" className="bg-zinc-100 text-zinc-700 text-xs">
                          Final (Terkunci)
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-emerald-600/30 text-emerald-800 text-xs">
                          Draft (Terbuka)
                        </Badge>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      {cls.isWaliKelas ? (
                        <Badge className="bg-primary hover:bg-primary/90 text-white text-[11px]">
                          Wali Kelas
                        </Badge>
                      ) : null}
                      {cls.mapelDiampu.length > 0 ? (
                        <span className="text-xs text-zinc-600">
                          Pengampu: <strong>{cls.mapelDiampu.join(", ")}</strong>
                        </span>
                      ) : !cls.isWaliKelas ? (
                        <span className="text-xs text-zinc-400 italic">Akses perwalian / pengampu</span>
                      ) : null}
                    </div>

                    <p className="text-xs text-zinc-500">
                      {cls.totalSantri} Santri terdaftar di kelas ini
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-zinc-100 flex items-center justify-end">
                    <Button asChild size="sm" className="h-8">
                      <Link href={`/guru/nilai/${cls.marhalahId}`}>
                        <TableIcon className="mr-1.5 h-3.5 w-3.5" />
                        Buka Lembar Nilai
                        <ArrowRightIcon className="ml-1 h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

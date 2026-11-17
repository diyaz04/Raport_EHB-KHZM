import * as React from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AlertCircleIcon, ChevronLeftIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getEffectiveContext } from "@/lib/auth/context";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  NilaiGridClient,
  type MarhalahMapelCol,
  type SantriGridRow,
} from "@/components/nilai/nilai-grid-client";

interface PageProps {
  params: Promise<{ marhalahId: string }>;
}

export default async function GuruNilaiPage({ params }: PageProps) {
  const { marhalahId } = await params;

  const context = await getEffectiveContext();
  if (!context.user || !context.profile) {
    redirect("/login");
  }

  // Jika admin mengakses rute guru tanpa mode act_as, arahkan ke rute admin langsung
  if (context.profile.role === "admin" && !context.isActingAs) {
    redirect(`/admin/kelas/${marhalahId}/nilai`);
  }

  const activeTeacherId = context.isActingAs ? context.effectiveGuruId : context.user.id;
  if (!activeTeacherId) {
    redirect("/login");
  }

  const adminClient = createAdminClient();

  // 1. Ambil semester aktif & tahun ajaran aktif
  const { data: activeSemester } = await adminClient
    .from("semester")
    .select("id, jenis, aktif, tahun_ajaran_id, tahun_ajaran(id, nama, kode, aktif)")
    .eq("aktif", true)
    .maybeSingle();

  if (!activeSemester) {
    return (
      <div className="mx-auto max-w-2xl py-12 text-center">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-900 shadow-sm">
          <AlertCircleIcon className="mx-auto h-8 w-8 text-amber-600 mb-2" />
          <h2 className="text-lg font-bold">Tidak Ada Semester Aktif</h2>
          <p className="mt-1 text-sm text-amber-800">
            Saat ini belum ada Semester yang diaktifkan di sistem. Silakan hubungi Administrator.
          </p>
          <div className="mt-4">
            <Button asChild variant="outline" size="sm">
              <Link href="/guru/dashboard">
                <ChevronLeftIcon className="mr-1 h-4 w-4" />
                Kembali ke Dashboard
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // 2. Ambil data marhalah
  const { data: marhalah } = await adminClient
    .from("marhalah")
    .select("id, nama, kode, urutan")
    .eq("id", marhalahId)
    .is("deleted_at", null)
    .maybeSingle();

  if (!marhalah) {
    notFound();
  }

  // 3. Periksa status kunci raport (draft / final)
  const { data: statusData } = await adminClient
    .from("status_raport")
    .select("status")
    .eq("marhalah_id", marhalahId)
    .eq("semester_id", activeSemester.id)
    .maybeSingle();

  const isFinal = statusData?.status === "final";

  // 4. Periksa apakah guru adalah Wali Kelas
  const { data: waliData } = await adminClient
    .from("guru_marhalah")
    .select("id")
    .eq("guru_id", activeTeacherId)
    .eq("marhalah_id", marhalahId)
    .eq("tahun_ajaran_id", activeSemester.tahun_ajaran_id)
    .maybeSingle();

  const isWaliKelas = Boolean(waliData);

  // 5. Ambil daftar mata pelajaran marhalah di semester ini
  const { data: mmList } = await adminClient
    .from("marhalah_mapel")
    .select("id, urutan, tipe, dihitung_total, mapel(nama), kitab(nama)")
    .eq("marhalah_id", marhalahId)
    .eq("semester_id", activeSemester.id)
    .order("urutan", { ascending: true });

  const mapelColumns = (mmList ?? []) as unknown as MarhalahMapelCol[];

  // 6. Tentukan mapel yang diizinkan untuk diinput guru ini
  let allowedMapelIds: string[] = [];
  if (isWaliKelas) {
    // Wali kelas dapat mengisi semua mapel di kelasnya
    allowedMapelIds = mapelColumns.map((m) => m.id);
  } else {
    // Pengampu hanya dapat mengisi mapel yang ditugaskan kepadanya
    const columnIds = mapelColumns.map((m) => m.id);
    if (columnIds.length > 0) {
      const { data: pengampuList } = await adminClient
        .from("pengampu")
        .select("marhalah_mapel_id")
        .eq("guru_id", activeTeacherId)
        .in("marhalah_mapel_id", columnIds);

      allowedMapelIds = (pengampuList ?? []).map((p) => p.marhalah_mapel_id);
    }
  }

  // 7. Jika bukan wali kelas dan tidak mengampu mapel apa pun di marhalah ini
  if (!isWaliKelas && allowedMapelIds.length === 0) {
    return (
      <div className="mx-auto max-w-2xl py-12 text-center">
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-900 shadow-sm">
          <AlertCircleIcon className="mx-auto h-8 w-8 text-red-600 mb-2" />
          <h2 className="text-lg font-bold">Akses Dibatasi</h2>
          <p className="mt-1 text-sm text-red-800">
            Anda tidak tercatat sebagai Wali Kelas maupun Guru Pengampu mata pelajaran di marhalah{" "}
            <strong>{marhalah.nama}</strong> pada semester ini.
          </p>
          <div className="mt-4">
            <Button asChild variant="outline" size="sm">
              <Link href="/guru/dashboard">
                <ChevronLeftIcon className="mr-1 h-4 w-4" />
                Kembali ke Dashboard
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // 8. Ambil santri yang terdaftar (enrollment aktif) di marhalah & TA ini
  const { data: enrollments } = await adminClient
    .from("enrollment")
    .select("id, santri_id, santri(id, nis, nama, jenis_kelamin, deleted_at)")
    .eq("marhalah_id", marhalahId)
    .eq("tahun_ajaran_id", activeSemester.tahun_ajaran_id);

  interface RawEnrollment {
    id: string;
    santri_id: string;
    santri: {
      id: string;
      nis: string | null;
      nama: string;
      jenis_kelamin: "L" | "P" | null;
      deleted_at: string | null;
    } | null;
  }

  const activeEnrollments = ((enrollments ?? []) as unknown as RawEnrollment[])
    .filter((e) => e.santri && !e.santri.deleted_at)
    .sort((a, b) => (a.santri?.nama ?? "").localeCompare(b.santri?.nama ?? "", "id"));

  const enrollmentIds = activeEnrollments.map((e) => e.id);

  // 9. Ambil nilai yang sudah tersimpan
  const { data: existingNilai } =
    enrollmentIds.length > 0
      ? await adminClient
          .from("nilai")
          .select("enrollment_id, marhalah_mapel_id, angka")
          .eq("semester_id", activeSemester.id)
          .in("enrollment_id", enrollmentIds)
      : { data: [] };

  // 10. Ambil catatan kepribadian & presensi yang sudah tersimpan
  const { data: existingCatatan } =
    enrollmentIds.length > 0
      ? await adminClient
          .from("catatan_semester")
          .select(
            "enrollment_id, akhlak, ketekunan, kerapihan, kebersihan, sakit, izin, alpa, saran_wali_kelas"
          )
          .eq("semester_id", activeSemester.id)
          .in("enrollment_id", enrollmentIds)
      : { data: [] };

  interface RawCatatan {
    enrollment_id: string;
    akhlak: string | null;
    ketekunan: string | null;
    kerapihan: string | null;
    kebersihan: string | null;
    sakit: number;
    izin: number;
    alpa: number;
    saran_wali_kelas?: string | null;
  }

  // 11. Rakit santriRows untuk grid
  const santriRows: SantriGridRow[] = activeEnrollments.map((enr) => {
    const nilaiMap: Record<string, number | null> = {};
    (existingNilai ?? [])
      .filter((n) => n.enrollment_id === enr.id)
      .forEach((n) => {
        nilaiMap[n.marhalah_mapel_id] = n.angka;
      });

    const cat = (existingCatatan as unknown as RawCatatan[] | null)?.find(
      (c) => c.enrollment_id === enr.id
    );

    return {
      enrollment_id: enr.id,
      santri_id: enr.santri!.id,
      nama: enr.santri!.nama,
      nis: enr.santri!.nis,
      jenis_kelamin: enr.santri!.jenis_kelamin === "P" ? "P" : "L",
      nilaiMap,
      catatan: {
        akhlak: cat?.akhlak ?? null,
        ketekunan: cat?.ketekunan ?? null,
        kerapihan: cat?.kerapihan ?? null,
        kebersihan: cat?.kebersihan ?? null,
        sakit: cat?.sakit ?? 0,
        izin: cat?.izin ?? 0,
        alpa: cat?.alpa ?? 0,
        saran_wali_kelas: cat?.saran_wali_kelas ?? null,
      },
    };
  });

  const taRecord = activeSemester.tahun_ajaran as unknown as { nama: string; kode: string } | null;

  return (
    <NilaiGridClient
      marhalah={{
        id: marhalah.id,
        nama: marhalah.nama,
        kode: marhalah.kode,
      }}
      semester={{
        id: activeSemester.id,
        jenis: activeSemester.jenis as "Ganjil" | "Genap",
        tahun_ajaran: taRecord ?? undefined,
      }}
      isFinal={isFinal}
      isAdminDirect={false}
      isWaliKelas={isWaliKelas}
      allowedMapelIds={allowedMapelIds}
      mapelColumns={mapelColumns}
      santriRows={santriRows}
      backUrl="/guru/dashboard"
    />
  );
}

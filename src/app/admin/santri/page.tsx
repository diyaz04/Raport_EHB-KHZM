import * as React from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  SantriClient,
  type SantriRecord,
  type MarhalahOption,
  type TahunAjaranOption,
} from "./santri-client";
import { type EnrollmentRaw } from "@/components/admin/naik-kelas-dialog";

export default async function SantriPage() {
  let santriList: SantriRecord[] = [];
  let marhalahList: MarhalahOption[] = [];
  let tahunAjaranList: TahunAjaranOption[] = [];
  let allEnrollmentsList: EnrollmentRaw[] = [];
  let activeTaId: string | null = null;

  try {
    const adminClient = createAdminClient();

    // 1. Ambil Tahun Ajaran & Marhalah
    const [taRes, marhalahRes] = await Promise.all([
      adminClient
        .from("tahun_ajaran")
        .select("id, nama, kode, aktif")
        .order("kode", { ascending: false }),
      adminClient
        .from("marhalah")
        .select("id, nama, kode, urutan")
        .is("deleted_at", null)
        .order("urutan", { ascending: true }),
    ]);

    tahunAjaranList = taRes.data ?? [];
    marhalahList = marhalahRes.data ?? [];

    const activeTa = tahunAjaranList.find((ta) => ta.aktif) ?? tahunAjaranList[0];
    activeTaId = activeTa?.id ?? null;

    // 2. Ambil seluruh data Santri dan Enrollment (dengan relasi santri & marhalah)
    const [santriRes, allEnrollRes] = await Promise.all([
      adminClient
        .from("santri")
        .select("id, nis, nama, jenis_kelamin, deleted_at, created_at")
        .order("nama", { ascending: true }),
      adminClient
        .from("enrollment")
        .select("id, santri_id, marhalah_id, tahun_ajaran_id, marhalah(id, nama, kode), santri(id, nama, nis, jenis_kelamin, deleted_at)"),
    ]);

    interface EnrollmentInfo {
      id: string;
      marhalah_id: string;
      tahun_ajaran_id: string;
      marhalah?: {
        id: string;
        nama: string;
        kode: string;
      };
    }

    const rawSantri = santriRes.data ?? [];
    const allEnrollData = allEnrollRes.data ?? [];
    allEnrollmentsList = allEnrollData as unknown as EnrollmentRaw[];

    // Map enrollment untuk tahun ajaran aktif
    const activeEnrollments = (allEnrollData as unknown as (EnrollmentInfo & { santri_id: string })[])
      .filter((e) => e.tahun_ajaran_id === activeTaId);

    const enrollMap = new Map<string, EnrollmentInfo>();
    for (const e of activeEnrollments) {
      enrollMap.set(e.santri_id, {
        id: e.id,
        marhalah_id: e.marhalah_id,
        tahun_ajaran_id: e.tahun_ajaran_id,
        marhalah: e.marhalah,
      });
    }

    santriList = rawSantri.map((s) => ({
      id: s.id,
      nis: s.nis,
      nama: s.nama,
      jenis_kelamin: s.jenis_kelamin as "L" | "P",
      deleted_at: s.deleted_at,
      created_at: s.created_at,
      enrollment: enrollMap.get(s.id) || null,
    }));
  } catch {
    santriList = [];
    marhalahList = [];
    tahunAjaranList = [];
    allEnrollmentsList = [];
    activeTaId = null;
  }

  return (
    <SantriClient
      initialData={santriList}
      marhalahList={marhalahList}
      tahunAjaranList={tahunAjaranList}
      allEnrollments={allEnrollmentsList}
      activeTahunAjaranId={activeTaId}
    />
  );
}

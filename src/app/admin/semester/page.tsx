import * as React from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import { SemesterClient, type SemesterRecord, type TahunAjaranOption } from "./semester-client";

export default async function SemesterPage() {
  let semesters: SemesterRecord[] = [];
  let tahunAjarans: TahunAjaranOption[] = [];

  try {
    const adminClient = createAdminClient();

    const [semRes, taRes] = await Promise.all([
      adminClient
        .from("semester")
        .select("id, tahun_ajaran_id, jenis, aktif, tahun_ajaran(nama, kode)")
        .order("created_at", { ascending: false }),
      adminClient
        .from("tahun_ajaran")
        .select("id, nama, kode")
        .order("kode", { ascending: false }),
    ]);

    semesters = (semRes.data as unknown as SemesterRecord[]) ?? [];
    tahunAjarans = taRes.data ?? [];
  } catch {
    semesters = [];
    tahunAjarans = [];
  }

  return (
    <SemesterClient
      initialData={semesters}
      tahunAjaranList={tahunAjarans}
    />
  );
}

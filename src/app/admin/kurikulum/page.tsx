import * as React from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  KurikulumClient,
  type MarhalahOption,
  type SemesterOption,
  type SimpleItemOption,
  type MarhalahMapelRecord,
} from "./kurikulum-client";

export default async function KurikulumPage() {
  let marhalahList: MarhalahOption[] = [];
  let semesterList: SemesterOption[] = [];
  let mapelList: SimpleItemOption[] = [];
  let kitabList: SimpleItemOption[] = [];
  let marhalahMapelItems: MarhalahMapelRecord[] = [];

  try {
    const adminClient = createAdminClient();

    const [marhalahRes, semesterRes, mapelRes, kitabRes, mmRes] = await Promise.all([
      adminClient
        .from("marhalah")
        .select("id, nama, kode, urutan")
        .is("deleted_at", null)
        .order("urutan", { ascending: true }),
      adminClient
        .from("semester")
        .select("id, tahun_ajaran_id, jenis, aktif, tahun_ajaran(nama, kode)")
        .order("created_at", { ascending: false }),
      adminClient
        .from("mapel")
        .select("id, nama")
        .order("nama", { ascending: true }),
      adminClient
        .from("kitab")
        .select("id, nama")
        .order("nama", { ascending: true }),
      adminClient
        .from("marhalah_mapel")
        .select("id, marhalah_id, semester_id, mapel_id, kitab_id, urutan, tipe, dihitung_total, mapel(nama), kitab(nama)")
        .order("urutan", { ascending: true }),
    ]);

    marhalahList = marhalahRes.data ?? [];
    semesterList = (semesterRes.data as unknown as SemesterOption[]) ?? [];
    mapelList = mapelRes.data ?? [];
    kitabList = kitabRes.data ?? [];
    marhalahMapelItems = (mmRes.data as unknown as MarhalahMapelRecord[]) ?? [];
  } catch {
    marhalahList = [];
    semesterList = [];
    mapelList = [];
    kitabList = [];
    marhalahMapelItems = [];
  }

  return (
    <KurikulumClient
      marhalahList={marhalahList}
      semesterList={semesterList}
      mapelList={mapelList}
      kitabList={kitabList}
      initialData={marhalahMapelItems}
    />
  );
}

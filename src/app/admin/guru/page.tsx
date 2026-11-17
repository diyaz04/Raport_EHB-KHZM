import * as React from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  GuruClient,
  type GuruRecord,
  type MarhalahOption,
  type TahunAjaranOption,
  type SemesterOption,
  type WaliKelasRecord,
  type MarhalahMapelOption,
} from "./guru-client";

export default async function GuruPage() {
  let guruList: GuruRecord[] = [];
  let marhalahList: MarhalahOption[] = [];
  let tahunAjaranList: TahunAjaranOption[] = [];
  let semesterList: SemesterOption[] = [];
  let waliKelasList: WaliKelasRecord[] = [];
  let marhalahMapelList: MarhalahMapelOption[] = [];
  let activeTaId: string | null = null;

  try {
    const adminClient = createAdminClient();

    // 1. Ambil data TA, Semester, Marhalah
    const [taRes, semRes, marhalahRes] = await Promise.all([
      adminClient
        .from("tahun_ajaran")
        .select("id, nama, kode, aktif")
        .order("kode", { ascending: false }),
      adminClient
        .from("semester")
        .select("id, tahun_ajaran_id, jenis, aktif, tahun_ajaran(nama, kode)")
        .order("created_at", { ascending: false }),
      adminClient
        .from("marhalah")
        .select("id, nama, kode, urutan")
        .is("deleted_at", null)
        .order("urutan", { ascending: true }),
    ]);

    tahunAjaranList = taRes.data ?? [];
    semesterList = (semRes.data as unknown as SemesterOption[]) ?? [];
    marhalahList = marhalahRes.data ?? [];

    const activeTa = tahunAjaranList.find((t) => t.aktif) ?? tahunAjaranList[0];
    activeTaId = activeTa?.id ?? null;

    // 2. Ambil data Guru dari profiles + email dari auth.admin.listUsers()
    const [profilesRes, usersRes] = await Promise.all([
      adminClient
        .from("profiles")
        .select("id, nama, aktif, created_at")
        .eq("role", "guru")
        .order("nama", { ascending: true }),
      adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    ]);

    const emailMap = new Map<string, string>();
    if (usersRes.data?.users) {
      usersRes.data.users.forEach((u) => {
        if (u.email) emailMap.set(u.id, u.email);
      });
    }

    // 3. Ambil penugasan Wali Kelas & Pengampu
    const [wkRes, mmRes, pengampuRes] = await Promise.all([
      adminClient
        .from("guru_marhalah")
        .select("id, guru_id, marhalah_id, tahun_ajaran_id, guru:profiles(nama), marhalah(nama, kode)"),
      adminClient
        .from("marhalah_mapel")
        .select("id, marhalah_id, semester_id, mapel_id, kitab_id, urutan, tipe, mapel(nama), kitab(nama)")
        .order("urutan", { ascending: true }),
      adminClient
        .from("pengampu")
        .select("id, guru_id, marhalah_mapel_id, guru:profiles(nama)"),
    ]);

    const rawWk = wkRes.data ?? [];
    waliKelasList = rawWk as unknown as WaliKelasRecord[];

    // Map pengampu per marhalah_mapel_id
    const pengampuMap = new Map<string, { id: string; guru_id: string; guru?: { nama: string } }>();
    const countMapelPerGuru = new Map<string, number>();

    if (pengampuRes.data) {
      pengampuRes.data.forEach((p) => {
        pengampuMap.set(p.marhalah_mapel_id, {
          id: p.id,
          guru_id: p.guru_id,
          guru: (p.guru as unknown as { nama: string }) ?? undefined,
        });

        countMapelPerGuru.set(
          p.guru_id,
          (countMapelPerGuru.get(p.guru_id) ?? 0) + 1
        );
      });
    }

    // Pasangkan pengampu ke marhalah_mapel
    const rawMm = mmRes.data ?? [];
    marhalahMapelList = rawMm.map((item) => ({
      ...item,
      pengampu: pengampuMap.get(item.id) || null,
    })) as unknown as MarhalahMapelOption[];

    // Map penugasan wali kelas per guru_id
    const waliPerGuru = new Map<string, string[]>();
    rawWk.forEach((wk) => {
      const marhalahObj = wk.marhalah as unknown as { nama: string; kode: string } | null;
      if (marhalahObj) {
        const list = waliPerGuru.get(wk.guru_id) ?? [];
        list.push(`${marhalahObj.nama} (${marhalahObj.kode})`);
        waliPerGuru.set(wk.guru_id, list);
      }
    });

    // Gabungkan data profil guru
    const rawProfiles = profilesRes.data ?? [];
    guruList = rawProfiles.map((p) => ({
      id: p.id,
      nama: p.nama,
      email: emailMap.get(p.id) || "-",
      aktif: p.aktif,
      waliKelasDi: waliPerGuru.get(p.id) || [],
      jumlahMapelPengampu: countMapelPerGuru.get(p.id) || 0,
      created_at: p.created_at,
    }));
  } catch {
    guruList = [];
    marhalahList = [];
    tahunAjaranList = [];
    semesterList = [];
    waliKelasList = [];
    marhalahMapelList = [];
    activeTaId = null;
  }

  return (
    <GuruClient
      guruList={guruList}
      marhalahList={marhalahList}
      tahunAjaranList={tahunAjaranList}
      semesterList={semesterList}
      waliKelasList={waliKelasList}
      marhalahMapelList={marhalahMapelList}
      activeTaId={activeTaId}
    />
  );
}

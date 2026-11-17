import * as React from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import { EhbListClient, type EhbListItem } from "./ehb-list-client";

export default async function EhbPage() {
  const adminClient = createAdminClient();

  // 1. Fetch EHB records
  const { data: ehbData, error: ehbError } = await adminClient
    .from("ehb")
    .select(`
      id,
      nama,
      tahun_ajaran_id,
      semester_id,
      tanggal_mulai,
      tanggal_selesai,
      status,
      tahun_ajaran:tahun_ajaran_id(id, nama),
      semester:semester_id(id, jenis)
    `)
    .order("tanggal_mulai", { ascending: false });

  if (ehbError) {
    console.error("Gagal mengambil data EHB:", ehbError);
  }

  // 2. Fetch Tahun Ajaran & Semester for dialog dropdowns
  const { data: taData } = await adminClient
    .from("tahun_ajaran")
    .select("id, nama, aktif")
    .order("kode", { ascending: false });

  const { data: semData } = await adminClient
    .from("semester")
    .select("id, jenis, tahun_ajaran_id, aktif")
    .order("jenis", { ascending: true });

  // 3. Fetch counts of ruangan, sesi, jadwal for each EHB
  const ehbIds = (ehbData ?? []).map((e) => e.id);

  const ruanganCounts: Record<string, number> = {};
  const sesiCounts: Record<string, number> = {};
  const jadwalCounts: Record<string, number> = {};

  if (ehbIds.length > 0) {
    // Ruangan counts
    const { data: ruanganData } = await adminClient
      .from("ehb_ruangan")
      .select("id, ehb_id")
      .in("ehb_id", ehbIds);

    if (ruanganData) {
      for (const r of ruanganData) {
        ruanganCounts[r.ehb_id] = (ruanganCounts[r.ehb_id] || 0) + 1;
      }
    }

    // Sesi counts
    const { data: sesiData } = await adminClient
      .from("ehb_sesi")
      .select("id, ehb_id")
      .in("ehb_id", ehbIds);

    if (sesiData) {
      const sesiIds: string[] = [];
      const sesiToEhb: Record<string, string> = {};
      for (const s of sesiData) {
        sesiCounts[s.ehb_id] = (sesiCounts[s.ehb_id] || 0) + 1;
        sesiIds.push(s.id);
        sesiToEhb[s.id] = s.ehb_id;
      }

      // Jadwal counts via sesi_id
      if (sesiIds.length > 0) {
        const { data: jadwalData } = await adminClient
          .from("ehb_jadwal")
          .select("id, sesi_id")
          .in("sesi_id", sesiIds);

        if (jadwalData) {
          for (const j of jadwalData) {
            const ehbId = sesiToEhb[j.sesi_id];
            if (ehbId) {
              jadwalCounts[ehbId] = (jadwalCounts[ehbId] || 0) + 1;
            }
          }
        }
      }
    }
  }

  // Format ehb items
  const ehbList: EhbListItem[] = (ehbData ?? []).map((item) => {
    // Handle Supabase join types
    const rawTa = item.tahun_ajaran as unknown as
      | { id: string; nama: string }
      | Array<{ id: string; nama: string }>
      | null;
    const rawSem = item.semester as unknown as
      | { id: string; jenis: string }
      | Array<{ id: string; jenis: string }>
      | null;

    const ta = Array.isArray(rawTa) ? rawTa[0] : rawTa;
    const sem = Array.isArray(rawSem) ? rawSem[0] : rawSem;

    return {
      id: item.id,
      nama: item.nama,
      tahun_ajaran_id: item.tahun_ajaran_id,
      semester_id: item.semester_id,
      tanggal_mulai: item.tanggal_mulai,
      tanggal_selesai: item.tanggal_selesai,
      status: item.status as "draft" | "dikunci",
      tahun_ajaran: ta ?? undefined,
      semester: sem ?? undefined,
      totalRuangan: ruanganCounts[item.id] || 0,
      totalSesi: sesiCounts[item.id] || 0,
      totalJadwal: jadwalCounts[item.id] || 0,
    };
  });

  return (
    <EhbListClient
      ehbList={ehbList}
      tahunAjaranList={taData ?? []}
      semesterList={semData ?? []}
    />
  );
}

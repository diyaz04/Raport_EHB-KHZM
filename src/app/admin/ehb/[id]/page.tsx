import * as React from "react";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  EhbDetailClient,
  type EhbDetail,
  type EhbRuanganItem,
  type EhbSesiItem,
  type EhbJadwalItem,
  type MarhalahOption,
  type MarhalahMapelOption,
  type EhbPesertaItem,
} from "./ehb-detail-client";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

interface RawJadwalRecord {
  id: string;
  sesi_id: string;
  marhalah_id: string;
  marhalah_mapel_id: string;
  marhalah?: { id: string; nama: string; urutan?: number } | Array<{ id: string; nama: string; urutan?: number }>;
  marhalah_mapel?: {
    id: string;
    urutan?: number;
    tipe?: string;
    mapel?: { id: string; nama: string } | Array<{ id: string; nama: string }>;
    kitab?: { id: string; nama: string } | Array<{ id: string; nama: string }> | null;
  } | Array<{
    id: string;
    urutan?: number;
    tipe?: string;
    mapel?: { id: string; nama: string } | Array<{ id: string; nama: string }>;
    kitab?: { id: string; nama: string } | Array<{ id: string; nama: string }> | null;
  }>;
}

interface RawMarhalahMapelRecord {
  id: string;
  marhalah_id: string;
  semester_id: string;
  mapel_id: string;
  kitab_id: string | null;
  urutan?: number;
  tipe?: string;
  mapel?: { id: string; nama: string } | Array<{ id: string; nama: string }>;
  kitab?: { id: string; nama: string } | Array<{ id: string; nama: string }> | null;
}

interface RawPesertaRecord {
  id: string;
  ehb_id: string;
  enrollment_id: string;
  no_peserta: string;
  ruangan_id: string | null;
  no_urut: number | null;
  enrollment?: {
    id: string;
    marhalah_id: string;
    marhalah?: { id: string; nama: string; kode?: string; urutan?: number } | Array<{ id: string; nama: string; kode?: string; urutan?: number }>;
    santri?: { id: string; nis?: string | null; nama: string; jenis_kelamin?: string | null } | Array<{ id: string; nis?: string | null; nama: string; jenis_kelamin?: string | null }>;
  } | Array<{
    id: string;
    marhalah_id: string;
    marhalah?: { id: string; nama: string; kode?: string; urutan?: number } | Array<{ id: string; nama: string; kode?: string; urutan?: number }>;
    santri?: { id: string; nis?: string | null; nama: string; jenis_kelamin?: string | null } | Array<{ id: string; nis?: string | null; nama: string; jenis_kelamin?: string | null }>;
  }>;
  ruangan?: { id: string; nama: string } | Array<{ id: string; nama: string }> | null;
}

export default async function EhbDetailPage({ params }: PageProps) {
  const { id } = await params;
  const adminClient = createAdminClient();

  // 1. Fetch EHB Detail
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
      format_nomor_peserta,
      tahun_ajaran:tahun_ajaran_id(id, nama),
      semester:semester_id(id, jenis)
    `)
    .eq("id", id)
    .single();

  if (ehbError || !ehbData) {
    notFound();
  }

  // Format EHB
  const rawTa = ehbData.tahun_ajaran as unknown as
    | { id: string; nama: string }
    | Array<{ id: string; nama: string }>
    | null;
  const rawSem = ehbData.semester as unknown as
    | { id: string; jenis: string }
    | Array<{ id: string; jenis: string }>
    | null;

  const ehb: EhbDetail = {
    id: ehbData.id,
    nama: ehbData.nama,
    tahun_ajaran_id: ehbData.tahun_ajaran_id,
    semester_id: ehbData.semester_id,
    tanggal_mulai: ehbData.tanggal_mulai,
    tanggal_selesai: ehbData.tanggal_selesai,
    status: ehbData.status as "draft" | "dikunci",
    format_nomor_peserta:
      (ehbData as unknown as { format_nomor_peserta?: string }).format_nomor_peserta ||
      "{kode TA}-{kode marhalah}-{urut 3 digit}",
    tahun_ajaran: (Array.isArray(rawTa) ? rawTa[0] : rawTa) ?? undefined,
    semester: (Array.isArray(rawSem) ? rawSem[0] : rawSem) ?? undefined,
  };

  // 2. Fetch Ruangan
  const { data: ruanganData } = await adminClient
    .from("ehb_ruangan")
    .select("id, ehb_id, nama, kapasitas")
    .eq("ehb_id", id)
    .order("nama", { ascending: true });

  const ruanganList: EhbRuanganItem[] = (ruanganData ?? []).map((r) => ({
    id: r.id,
    ehb_id: r.ehb_id,
    nama: r.nama,
    kapasitas: r.kapasitas,
  }));

  // 3. Fetch Sesi
  const { data: sesiData } = await adminClient
    .from("ehb_sesi")
    .select("id, ehb_id, tanggal, jam_mulai, jam_selesai")
    .eq("ehb_id", id)
    .order("tanggal", { ascending: true })
    .order("jam_mulai", { ascending: true });

  const sesiList: EhbSesiItem[] = (sesiData ?? []).map((s) => ({
    id: s.id,
    ehb_id: s.ehb_id,
    tanggal: s.tanggal,
    jam_mulai: s.jam_mulai,
    jam_selesai: s.jam_selesai,
  }));

  const sesiIds = sesiList.map((s) => s.id);

  // 4. Fetch Jadwal if sesi exists
  let jadwalList: EhbJadwalItem[] = [];
  if (sesiIds.length > 0) {
    const { data: jadwalData } = await adminClient
      .from("ehb_jadwal")
      .select(`
        id,
        sesi_id,
        marhalah_id,
        marhalah_mapel_id,
        marhalah:marhalah_id(id, nama, urutan),
        marhalah_mapel:marhalah_mapel_id(
          id,
          urutan,
          tipe,
          mapel:mapel_id(id, nama),
          kitab:kitab_id(id, nama)
        )
      `)
      .in("sesi_id", sesiIds);

    if (jadwalData) {
      jadwalList = (jadwalData as unknown as RawJadwalRecord[]).map((j) => {
        const rawM = j.marhalah;
        const rawMm = j.marhalah_mapel;
        const marhalah = Array.isArray(rawM) ? rawM[0] : rawM;
        const marhalah_mapel = Array.isArray(rawMm) ? rawMm[0] : rawMm;

        let mapelObj: { id: string; nama: string } | undefined = undefined;
        let kitabObj: { id: string; nama: string } | null = null;

        if (marhalah_mapel) {
          const rawMapel = marhalah_mapel.mapel;
          mapelObj = (Array.isArray(rawMapel) ? rawMapel[0] : rawMapel) ?? undefined;
          const rawKitab = marhalah_mapel.kitab;
          kitabObj = (Array.isArray(rawKitab) ? rawKitab[0] : rawKitab) ?? null;
        }

        return {
          id: j.id,
          sesi_id: j.sesi_id,
          marhalah_id: j.marhalah_id,
          marhalah_mapel_id: j.marhalah_mapel_id,
          marhalah: marhalah ?? undefined,
          marhalah_mapel: marhalah_mapel
            ? {
                id: marhalah_mapel.id,
                urutan: marhalah_mapel.urutan,
                tipe: marhalah_mapel.tipe,
                mapel: mapelObj,
                kitab: kitabObj,
              }
            : undefined,
        };
      });
    }
  }

  // 5. Fetch Marhalah Options
  const { data: marhalahData } = await adminClient
    .from("marhalah")
    .select("id, nama, urutan")
    .is("deleted_at", null)
    .order("urutan", { ascending: true });

  const marhalahList: MarhalahOption[] = (marhalahData ?? []).map((m) => ({
    id: m.id,
    nama: m.nama,
    urutan: m.urutan,
  }));

  // 6. Fetch Marhalah Mapel Options (filtered by the semester of this EHB)
  const { data: mmData } = await adminClient
    .from("marhalah_mapel")
    .select(`
      id,
      marhalah_id,
      semester_id,
      mapel_id,
      kitab_id,
      urutan,
      tipe,
      mapel:mapel_id(id, nama),
      kitab:kitab_id(id, nama)
    `)
    .eq("semester_id", ehb.semester_id)
    .order("urutan", { ascending: true });

  const marhalahMapelList: MarhalahMapelOption[] = (
    (mmData as unknown as RawMarhalahMapelRecord[]) ?? []
  ).map((mm) => {
    const rawMapel = mm.mapel;
    const rawKitab = mm.kitab;
    const mapel = Array.isArray(rawMapel) ? rawMapel[0] : rawMapel;
    const kitab = Array.isArray(rawKitab) ? rawKitab[0] : rawKitab;

    return {
      id: mm.id,
      marhalah_id: mm.marhalah_id,
      semester_id: mm.semester_id,
      mapel_id: mm.mapel_id,
      kitab_id: mm.kitab_id,
      mapelNama: mapel?.nama ?? "Tanpa Nama Mapel",
      kitabNama: kitab?.nama ?? null,
      urutan: mm.urutan,
      tipe: mm.tipe,
    };
  });

  // 7. Fetch Peserta EHB
  const { data: pesertaData } = await adminClient
    .from("ehb_peserta")
    .select(`
      id,
      ehb_id,
      enrollment_id,
      no_peserta,
      ruangan_id,
      no_urut,
      enrollment:enrollment_id(
        id,
        marhalah_id,
        marhalah:marhalah_id(id, nama, kode, urutan),
        santri:santri_id(id, nis, nama, jenis_kelamin)
      ),
      ruangan:ruangan_id(id, nama)
    `)
    .eq("ehb_id", id)
    .order("no_peserta", { ascending: true });

  const pesertaList: EhbPesertaItem[] = (
    (pesertaData as unknown as RawPesertaRecord[]) ?? []
  ).map((p) => {
    const rawE = p.enrollment;
    const enrollment = Array.isArray(rawE) ? rawE[0] : rawE;
    const rawM = enrollment?.marhalah;
    const marhalah = Array.isArray(rawM) ? rawM[0] : rawM;
    const rawS = enrollment?.santri;
    const santri = Array.isArray(rawS) ? rawS[0] : rawS;
    const rawR = p.ruangan;
    const ruangan = Array.isArray(rawR) ? rawR[0] : rawR;

    return {
      id: p.id,
      ehb_id: p.ehb_id,
      enrollment_id: p.enrollment_id,
      no_peserta: p.no_peserta,
      ruangan_id: p.ruangan_id,
      no_urut: p.no_urut,
      santriNama: santri?.nama ?? "Tanpa Nama",
      santriNis: santri?.nis ?? null,
      santriGender: santri?.jenis_kelamin ?? null,
      marhalahId: enrollment?.marhalah_id ?? "",
      marhalahNama: marhalah?.nama ?? "Marhalah",
      marhalahKode: marhalah?.kode,
      marhalahUrutan: marhalah?.urutan,
      ruanganNama: ruangan?.nama ?? null,
    };
  });

  // 8. Total Santri Aktif Terdaftar pada TA EHB
  const { count: totalActiveEnrollments } = await adminClient
    .from("enrollment")
    .select("id, santri!inner(deleted_at)", { count: "exact", head: true })
    .eq("tahun_ajaran_id", ehb.tahun_ajaran_id)
    .is("santri.deleted_at", null);

  return (
    <EhbDetailClient
      ehb={ehb}
      ruanganList={ruanganList}
      sesiList={sesiList}
      jadwalList={jadwalList}
      marhalahList={marhalahList}
      marhalahMapelList={marhalahMapelList}
      pesertaList={pesertaList}
      totalActiveEnrollments={totalActiveEnrollments || 0}
    />
  );
}

"use server";

import { getEffectiveContext } from "@/lib/auth/context";
import { createAdminClient } from "@/lib/supabase/admin";

export interface ProgresKelasRecord {
  marhalah_id: string;
  nama_marhalah: string;
  kode_marhalah: string;
  urutan_marhalah: number;
  semester_id: string;
  semester_jenis: "Ganjil" | "Genap";
  tahun_ajaran_id: string;
  nama_tahun_ajaran: string;
  jumlah_santri: number;
  total_mapel_nilai: number;
  total_sel_nilai: number;
  sel_nilai_terisi: number;
  catatan_terisi: number;
  status_raport: "draft" | "final";
  difinalisasi_oleh: string | null;
  difinalisasi_pada: string | null;
  wali_kelas_nama?: string | null;
  mapel_tanpa_pengampu_count: number;
}

export interface DrilldownMapelCol {
  id: string;
  urutan: number;
  tipe: "nilai" | "kelengkapan";
  nama_mapel: string;
  nama_kitab: string | null;
  pengampu_id: string | null;
  pengampu_nama: string | null;
  has_pengampu: boolean;
}

export interface DrilldownSantriRow {
  enrollment_id: string;
  santri_id: string;
  nis: string | null;
  nama: string;
  jenis_kelamin: "L" | "P";
  nilaiMap: Record<string, number | null>;
  catatan: {
    akhlak: string | null;
    ketekunan: string | null;
    kerapihan: string | null;
    kebersihan: string | null;
    sakit: number;
    izin: number;
    alpa: number;
  };
}

export interface DrilldownDataResult {
  ok: boolean;
  message?: string;
  marhalah?: {
    id: string;
    nama: string;
    kode: string;
  };
  semester?: {
    id: string;
    jenis: "Ganjil" | "Genap";
    tahun_ajaran: {
      id: string;
      nama: string;
      kode: string;
    };
  };
  wali_kelas?: {
    id: string;
    nama: string;
  } | null;
  status_raport?: "draft" | "final";
  mapelColumns?: DrilldownMapelCol[];
  santriRows?: DrilldownSantriRow[];
  totalMapelTanpaPengampu?: number;
  totalSelKosong?: number;
}

// ==============================================================================
// 1. AMBIL DAFTAR PROGRES KELAS (DARI v_progres_kelas DENGAN FALLBACK)
// ==============================================================================
export async function getProgresKelasListAction(
  tahunAjaranId?: string,
  semesterId?: string
): Promise<ProgresKelasRecord[]> {
  const context = await getEffectiveContext();
  if (!context.user || context.profile?.role !== "admin") {
    return [];
  }

  const adminClient = createAdminClient();

  let records: ProgresKelasRecord[] = [];

  // 1. Coba query dari view v_progres_kelas
  try {
    let query = adminClient.from("v_progres_kelas").select("*");

    if (tahunAjaranId && tahunAjaranId !== "all") {
      query = query.eq("tahun_ajaran_id", tahunAjaranId);
    }
    if (semesterId && semesterId !== "all") {
      query = query.eq("semester_id", semesterId);
    }

    const { data, error } = await query.order("urutan_marhalah", { ascending: true });

    if (!error && data && data.length > 0) {
      records = data as unknown as ProgresKelasRecord[];
    }
  } catch (err) {
    console.warn("Query v_progres_kelas gagal, menjalankan fallback manual:", err);
  }

  // 2. Jika view kosong / gagal (misal DB belum di-apply view), gunakan fallback kalkulasi manual
  if (records.length === 0) {
    records = await calculateProgresFallback(adminClient, tahunAjaranId, semesterId);
  }

  // 3. Perkaryakan dengan data Wali Kelas & jumlah mapel tanpa pengampu
  try {
    const marhalahIds = records.map((r) => r.marhalah_id);
    const semIds = records.map((r) => r.semester_id);
    const taIds = records.map((r) => r.tahun_ajaran_id);

    if (marhalahIds.length > 0) {
      const [waliRes, mmRes, pengampuRes] = await Promise.all([
        adminClient
          .from("guru_marhalah")
          .select("marhalah_id, tahun_ajaran_id, profiles(id, nama)")
          .in("marhalah_id", marhalahIds)
          .in("tahun_ajaran_id", taIds),
        adminClient
          .from("marhalah_mapel")
          .select("id, marhalah_id, semester_id")
          .in("marhalah_id", marhalahIds)
          .in("semester_id", semIds),
        adminClient
          .from("pengampu")
          .select("marhalah_mapel_id"),
      ]);

      interface WaliItem {
        marhalah_id: string;
        tahun_ajaran_id: string;
        profiles: { id: string; nama: string } | null;
      }
      const waliMap = new Map<string, string>();
      ((waliRes.data ?? []) as unknown as WaliItem[]).forEach((w) => {
        if (w.profiles?.nama) {
          waliMap.set(`${w.marhalah_id}_${w.tahun_ajaran_id}`, w.profiles.nama);
        }
      });

      const pengampuMmIds = new Set((pengampuRes.data ?? []).map((p) => p.marhalah_mapel_id));

      // Hitung mapel tanpa pengampu per (marhalah_id, semester_id)
      const unassignedMap = new Map<string, number>();
      (mmRes.data ?? []).forEach((mm) => {
        const key = `${mm.marhalah_id}_${mm.semester_id}`;
        if (!pengampuMmIds.has(mm.id)) {
          unassignedMap.set(key, (unassignedMap.get(key) || 0) + 1);
        }
      });

      records = records.map((r) => {
        const waliKey = `${r.marhalah_id}_${r.tahun_ajaran_id}`;
        const unassignedKey = `${r.marhalah_id}_${r.semester_id}`;
        return {
          ...r,
          wali_kelas_nama: waliMap.get(waliKey) ?? null,
          mapel_tanpa_pengampu_count: unassignedMap.get(unassignedKey) ?? 0,
        };
      });
    }
  } catch (err) {
    console.error("Gagal memperkaya data wali kelas / pengampu:", err);
  }

  return records;
}

// Fallback kalkulasi manual bila view v_progres_kelas belum dibuat di remote DB
async function calculateProgresFallback(
  adminClient: ReturnType<typeof createAdminClient>,
  tahunAjaranId?: string,
  semesterId?: string
): Promise<ProgresKelasRecord[]> {
  try {
    let semQuery = adminClient
      .from("semester")
      .select("id, jenis, aktif, tahun_ajaran_id, tahun_ajaran(id, nama, kode)");

    if (semesterId && semesterId !== "all") {
      semQuery = semQuery.eq("id", semesterId);
    } else if (tahunAjaranId && tahunAjaranId !== "all") {
      semQuery = semQuery.eq("tahun_ajaran_id", tahunAjaranId);
    }

    const { data: semList } = await semQuery;
    if (!semList || semList.length === 0) return [];

    const { data: marhalahList } = await adminClient
      .from("marhalah")
      .select("id, nama, kode, urutan")
      .is("deleted_at", null)
      .order("urutan", { ascending: true });

    if (!marhalahList || marhalahList.length === 0) return [];

    const result: ProgresKelasRecord[] = [];

    for (const sem of semList) {
      const ta = sem.tahun_ajaran as unknown as { id: string; nama: string; kode: string };
      for (const m of marhalahList) {
        // Santri count
        const { count: santriCount } = await adminClient
          .from("enrollment")
          .select("id, santri!inner(deleted_at)", { count: "exact", head: true })
          .eq("marhalah_id", m.id)
          .eq("tahun_ajaran_id", sem.tahun_ajaran_id)
          .is("santri.deleted_at", null);

        // Mapel count (tipe = nilai)
        const { count: mapelCount } = await adminClient
          .from("marhalah_mapel")
          .select("id", { count: "exact", head: true })
          .eq("marhalah_id", m.id)
          .eq("semester_id", sem.id)
          .eq("tipe", "nilai");

        const jmlSantri = santriCount ?? 0;
        const jmlMapel = mapelCount ?? 0;
        const totalSel = jmlSantri * jmlMapel;

        // Nilai terisi
        let selTerisi = 0;
        if (totalSel > 0) {
          const { count: nFilled } = await adminClient
            .from("nilai")
            .select("id, enrollment!inner(marhalah_id), marhalah_mapel!inner(tipe)", {
              count: "exact",
              head: true,
            })
            .eq("semester_id", sem.id)
            .eq("enrollment.marhalah_id", m.id)
            .eq("marhalah_mapel.tipe", "nilai")
            .not("angka", "is", null);
          selTerisi = nFilled ?? 0;
        }

        // Catatan terisi
        let catTerisi = 0;
        if (jmlSantri > 0) {
          const { count: cFilled } = await adminClient
            .from("catatan_semester")
            .select("id, enrollment!inner(marhalah_id)", { count: "exact", head: true })
            .eq("semester_id", sem.id)
            .eq("enrollment.marhalah_id", m.id);
          catTerisi = cFilled ?? 0;
        }

        // Status raport
        const { data: srData } = await adminClient
          .from("status_raport")
          .select("status, difinalisasi_oleh, difinalisasi_pada")
          .eq("marhalah_id", m.id)
          .eq("semester_id", sem.id)
          .maybeSingle();

        result.push({
          marhalah_id: m.id,
          nama_marhalah: m.nama,
          kode_marhalah: m.kode,
          urutan_marhalah: m.urutan,
          semester_id: sem.id,
          semester_jenis: sem.jenis as "Ganjil" | "Genap",
          tahun_ajaran_id: sem.tahun_ajaran_id,
          nama_tahun_ajaran: ta?.nama ?? "-",
          jumlah_santri: jmlSantri,
          total_mapel_nilai: jmlMapel,
          total_sel_nilai: totalSel,
          sel_nilai_terisi: selTerisi,
          catatan_terisi: catTerisi,
          status_raport: (srData?.status as "draft" | "final") || "draft",
          difinalisasi_oleh: srData?.difinalisasi_oleh ?? null,
          difinalisasi_pada: srData?.difinalisasi_pada ?? null,
          mapel_tanpa_pengampu_count: 0,
        });
      }
    }

    return result;
  } catch (err) {
    console.error("calculateProgresFallback error:", err);
    return [];
  }
}

// ==============================================================================
// 2. AMBIL DATA DRILL-DOWN PER KELAS (HANYA BACA)
// ==============================================================================
export async function getProgresDrilldownData(
  marhalahId: string,
  semesterId: string
): Promise<DrilldownDataResult> {
  const context = await getEffectiveContext();
  if (!context.user || context.profile?.role !== "admin") {
    return { ok: false, message: "Akses ditolak: Hanya administrator yang berwenang." };
  }

  const adminClient = createAdminClient();

  // 1. Ambil Marhalah
  const { data: marhalah, error: mErr } = await adminClient
    .from("marhalah")
    .select("id, nama, kode")
    .eq("id", marhalahId)
    .single();

  if (mErr || !marhalah) {
    return { ok: false, message: "Marhalah tidak ditemukan." };
  }

  // 2. Ambil Semester & Tahun Ajaran
  const { data: semester, error: sErr } = await adminClient
    .from("semester")
    .select("id, jenis, tahun_ajaran_id, tahun_ajaran(id, nama, kode)")
    .eq("id", semesterId)
    .single();

  if (sErr || !semester) {
    return { ok: false, message: "Semester tidak ditemukan." };
  }

  const taRecord = semester.tahun_ajaran as unknown as { id: string; nama: string; kode: string };

  // 3. Ambil Wali Kelas
  const { data: waliData } = await adminClient
    .from("guru_marhalah")
    .select("id, guru_id, profiles(id, nama)")
    .eq("marhalah_id", marhalahId)
    .eq("tahun_ajaran_id", semester.tahun_ajaran_id)
    .maybeSingle();

  interface RawWaliProfile {
    profiles: { id: string; nama: string } | null;
  }
  const waliProfile = (waliData as unknown as RawWaliProfile)?.profiles;

  // 4. Ambil Status Raport
  const { data: statusData } = await adminClient
    .from("status_raport")
    .select("status")
    .eq("marhalah_id", marhalahId)
    .eq("semester_id", semesterId)
    .maybeSingle();

  const statusRaport = (statusData?.status as "draft" | "final") || "draft";

  // 5. Ambil Marhalah Mapel & Pengampu
  const { data: mmList } = await adminClient
    .from("marhalah_mapel")
    .select("id, urutan, tipe, mapel(nama), kitab(nama)")
    .eq("marhalah_id", marhalahId)
    .eq("semester_id", semesterId)
    .order("urutan", { ascending: true });

  const mmIds = (mmList ?? []).map((m) => m.id);

  const { data: pengampuList } = mmIds.length > 0
    ? await adminClient
        .from("pengampu")
        .select("marhalah_mapel_id, guru_id, profiles(id, nama)")
        .in("marhalah_mapel_id", mmIds)
    : { data: [] };

  interface RawPengampuItem {
    marhalah_mapel_id: string;
    guru_id: string;
    profiles: { id: string; nama: string } | null;
  }

  const pengampuMap = new Map<string, { id: string; nama: string }>();
  ((pengampuList ?? []) as unknown as RawPengampuItem[]).forEach((p) => {
    if (p.profiles) {
      pengampuMap.set(p.marhalah_mapel_id, {
        id: p.guru_id,
        nama: p.profiles.nama,
      });
    }
  });

  let totalMapelTanpaPengampu = 0;

  interface RawMmRecord {
    id: string;
    urutan: number;
    tipe: "nilai" | "kelengkapan";
    mapel: { nama: string } | null;
    kitab: { nama: string } | null;
  }

  const mapelColumns: DrilldownMapelCol[] = ((mmList ?? []) as unknown as RawMmRecord[]).map((m) => {
    const pengampuInfo = pengampuMap.get(m.id);
    const hasPengampu = Boolean(pengampuInfo);
    if (!hasPengampu && m.tipe === "nilai") {
      totalMapelTanpaPengampu++;
    }

    return {
      id: m.id,
      urutan: m.urutan,
      tipe: m.tipe,
      nama_mapel: m.mapel?.nama ?? `Mapel ${m.urutan}`,
      nama_kitab: m.kitab?.nama ?? null,
      pengampu_id: pengampuInfo?.id ?? null,
      pengampu_nama: pengampuInfo?.nama ?? null,
      has_pengampu: hasPengampu,
    };
  });

  // 6. Ambil Santri Enrolled Aktif
  const { data: enrollments } = await adminClient
    .from("enrollment")
    .select("id, santri_id, santri(id, nis, nama, jenis_kelamin, deleted_at)")
    .eq("marhalah_id", marhalahId)
    .eq("tahun_ajaran_id", semester.tahun_ajaran_id);

  interface RawEnrollItem {
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

  const activeEnrollments = ((enrollments ?? []) as unknown as RawEnrollItem[])
    .filter((e) => e.santri && !e.santri.deleted_at)
    .sort((a, b) => (a.santri?.nama ?? "").localeCompare(b.santri?.nama ?? "", "id"));

  const enrollmentIds = activeEnrollments.map((e) => e.id);

  // 7. Ambil Nilai Existing
  const { data: existingNilai } = enrollmentIds.length > 0
    ? await adminClient
        .from("nilai")
        .select("enrollment_id, marhalah_mapel_id, angka")
        .eq("semester_id", semesterId)
        .in("enrollment_id", enrollmentIds)
    : { data: [] };

  // 8. Ambil Catatan Existing
  const { data: existingCatatan } = enrollmentIds.length > 0
    ? await adminClient
        .from("catatan_semester")
        .select("enrollment_id, akhlak, ketekunan, kerapihan, kebersihan, sakit, izin, alpa")
        .eq("semester_id", semesterId)
        .in("enrollment_id", enrollmentIds)
    : { data: [] };

  interface RawCatatanItem {
    enrollment_id: string;
    akhlak: string | null;
    ketekunan: string | null;
    kerapihan: string | null;
    kebersihan: string | null;
    sakit: number;
    izin: number;
    alpa: number;
  }

  let totalSelKosong = 0;

  const santriRows: DrilldownSantriRow[] = activeEnrollments.map((enr) => {
    const nilaiMap: Record<string, number | null> = {};
    (existingNilai ?? [])
      .filter((n) => n.enrollment_id === enr.id)
      .forEach((n) => {
        nilaiMap[n.marhalah_mapel_id] = n.angka;
      });

    // Hitung sel kosong untuk mapel bertipe 'nilai'
    mapelColumns.forEach((col) => {
      if (col.tipe === "nilai") {
        const val = nilaiMap[col.id];
        if (val === undefined || val === null) {
          totalSelKosong++;
        }
      }
    });

    const cat = (existingCatatan as unknown as RawCatatanItem[] | null)?.find(
      (c) => c.enrollment_id === enr.id
    );

    return {
      enrollment_id: enr.id,
      santri_id: enr.santri!.id,
      nis: enr.santri!.nis,
      nama: enr.santri!.nama,
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
      },
    };
  });

  return {
    ok: true,
    marhalah: {
      id: marhalah.id,
      nama: marhalah.nama,
      kode: marhalah.kode,
    },
    semester: {
      id: semester.id,
      jenis: semester.jenis as "Ganjil" | "Genap",
      tahun_ajaran: taRecord,
    },
    wali_kelas: waliProfile ? { id: waliProfile.id, nama: waliProfile.nama } : null,
    status_raport: statusRaport,
    mapelColumns,
    santriRows,
    totalMapelTanpaPengampu,
    totalSelKosong,
  };
}

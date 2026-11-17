"use server";

import { revalidatePath } from "next/cache";
import { getEffectiveContext } from "@/lib/auth/context";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  finalisasiRaportSchema,
  type FinalisasiRaportInput,
} from "@/lib/validations/finalisasi";

export interface StudentRankCandidate {
  enrollment_id: string;
  santri_id: string;
  nama: string;
  nis: string | null;
  total_nilai: number;
  rata_rata: number;
  rank_sementara: number;
  is_seri: boolean;
  tie_group_id?: number | null;
  catatan?: {
    akhlak: string | null;
    ketekunan: string | null;
    kerapihan: string | null;
    kebersihan: string | null;
    sakit: number;
    izin: number;
    alpa: number;
  };
}

export interface FinalisasiReadinessResult {
  ok: boolean;
  message?: string;
  isReady: boolean;
  totalSantri: number;
  totalMapelNilai: number;
  totalSelExpected: number;
  selTerisi: number;
  missingCellsCount: number;
  hasTies: boolean;
  students: StudentRankCandidate[];
}

export interface ActionResult {
  ok: boolean;
  message: string;
}

// ==============================================================================
// 1. CEK KESIAPAN FINALISASI & DETEKSI NILAI SERI
// ==============================================================================
export async function checkFinalisasiReadinessAction(
  marhalahId: string,
  semesterId: string
): Promise<FinalisasiReadinessResult> {
  const context = await getEffectiveContext();
  if (!context.user || !context.profile) {
    return {
      ok: false,
      message: "Sesi telah berakhir. Silakan login kembali.",
      isReady: false,
      totalSantri: 0,
      totalMapelNilai: 0,
      totalSelExpected: 0,
      selTerisi: 0,
      missingCellsCount: 0,
      hasTies: false,
      students: [],
    };
  }

  const adminClient = createAdminClient();

  // 1. Ambil semester & TA
  const { data: semesterData, error: semErr } = await adminClient
    .from("semester")
    .select("id, jenis, tahun_ajaran_id")
    .eq("id", semesterId)
    .single();

  if (semErr || !semesterData) {
    return {
      ok: false,
      message: "Data semester tidak ditemukan.",
      isReady: false,
      totalSantri: 0,
      totalMapelNilai: 0,
      totalSelExpected: 0,
      selTerisi: 0,
      missingCellsCount: 0,
      hasTies: false,
      students: [],
    };
  }

  const tahunAjaranId = semesterData.tahun_ajaran_id;

  // 2. Verifikasi Wewenang (Hanya Admin atau Wali Kelas)
  const isAdmin = context.profile.role === "admin";
  const activeTeacherId = context.isActingAs ? context.effectiveGuruId : context.user.id;

  let isWaliKelas = false;
  if (!isAdmin) {
    const { data: waliData } = await adminClient
      .from("guru_marhalah")
      .select("id")
      .eq("guru_id", activeTeacherId)
      .eq("marhalah_id", marhalahId)
      .eq("tahun_ajaran_id", tahunAjaranId)
      .maybeSingle();

    isWaliKelas = Boolean(waliData);

    if (!isWaliKelas) {
      return {
        ok: false,
        message: "Akses ditolak: Hanya Wali Kelas atau Administrator yang dapat memfinalisasi raport.",
        isReady: false,
        totalSantri: 0,
        totalMapelNilai: 0,
        totalSelExpected: 0,
        selTerisi: 0,
        missingCellsCount: 0,
        hasTies: false,
        students: [],
      };
    }
  }

  // 3. Ambil Santri Enrolled Aktif
  const { data: enrollments } = await adminClient
    .from("enrollment")
    .select("id, santri_id, santri(id, nis, nama, jenis_kelamin, deleted_at)")
    .eq("marhalah_id", marhalahId)
    .eq("tahun_ajaran_id", tahunAjaranId);

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
    .filter((e) => e.santri && !e.santri.deleted_at);

  const enrollmentIds = activeEnrollments.map((e) => e.id);

  if (enrollmentIds.length === 0) {
    return {
      ok: false,
      message: "Tidak ada santri aktif di kelas ini.",
      isReady: false,
      totalSantri: 0,
      totalMapelNilai: 0,
      totalSelExpected: 0,
      selTerisi: 0,
      missingCellsCount: 0,
      hasTies: false,
      students: [],
    };
  }

  // 4. Ambil Mapel dengan tipe = 'nilai'
  const { data: mapels } = await adminClient
    .from("marhalah_mapel")
    .select("id, urutan, tipe, dihitung_total, mapel(nama)")
    .eq("marhalah_id", marhalahId)
    .eq("semester_id", semesterId)
    .eq("tipe", "nilai");

  const totalMapelNilai = (mapels ?? []).length;
  const totalSelExpected = activeEnrollments.length * totalMapelNilai;

  if (totalMapelNilai === 0) {
    return {
      ok: false,
      message: "Kurikulum belum memiliki mata pelajaran bertipe nilai.",
      isReady: false,
      totalSantri: activeEnrollments.length,
      totalMapelNilai: 0,
      totalSelExpected: 0,
      selTerisi: 0,
      missingCellsCount: 0,
      hasTies: false,
      students: [],
    };
  }

  // 5. Ambil Nilai yang Terisi
  const { data: existingNilai } = await adminClient
    .from("nilai")
    .select("enrollment_id, marhalah_mapel_id, angka")
    .eq("semester_id", semesterId)
    .in("enrollment_id", enrollmentIds)
    .not("angka", "is", null);

  const nilaiMap = new Map<string, number>();
  (existingNilai ?? []).forEach((n) => {
    nilaiMap.set(`${n.enrollment_id}_${n.marhalah_mapel_id}`, n.angka);
  });

  // Hitung jumlah sel yang terisi untuk mapel tipe 'nilai'
  let selTerisi = 0;
  for (const enr of activeEnrollments) {
    for (const m of mapels ?? []) {
      if (nilaiMap.has(`${enr.id}_${m.id}`)) {
        selTerisi++;
      }
    }
  }

  const missingCellsCount = totalSelExpected - selTerisi;
  const isReady = missingCellsCount === 0;

  // 6. Ambil Catatan Semester Santri untuk referensi pemecah seri
  const { data: catatanList } = await adminClient
    .from("catatan_semester")
    .select("enrollment_id, akhlak, ketekunan, kerapihan, kebersihan, sakit, izin, alpa")
    .eq("semester_id", semesterId)
    .in("enrollment_id", enrollmentIds);

  interface RawCatatanRecord {
    enrollment_id: string;
    akhlak: string | null;
    ketekunan: string | null;
    kerapihan: string | null;
    kebersihan: string | null;
    sakit: number;
    izin: number;
    alpa: number;
  }

  const catatanMap = new Map<string, RawCatatanRecord>();
  ((catatanList ?? []) as unknown as RawCatatanRecord[]).forEach((c) => {
    catatanMap.set(c.enrollment_id, c);
  });

  // 7. Hitung Total Nilai & Rata-rata per Santri
  const mapelDihitungTotal = (mapels ?? []).filter((m) => m.dihitung_total);
  const countDihitung = mapelDihitungTotal.length || 1;

  const studentCandidates: Omit<StudentRankCandidate, "rank_sementara" | "is_seri" | "tie_group_id">[] =
    activeEnrollments.map((enr) => {
      let total = 0;
      mapelDihitungTotal.forEach((m) => {
        const val = nilaiMap.get(`${enr.id}_${m.id}`);
        if (val !== undefined && val !== null) {
          total += val;
        }
      });

      const rataRata = Math.round(total / countDihitung);
      const cat = catatanMap.get(enr.id);

      return {
        enrollment_id: enr.id,
        santri_id: enr.santri!.id,
        nama: enr.santri!.nama,
        nis: enr.santri!.nis,
        total_nilai: total,
        rata_rata: rataRata,
        catatan: cat
          ? {
              akhlak: cat.akhlak ?? null,
              ketekunan: cat.ketekunan ?? null,
              kerapihan: cat.kerapihan ?? null,
              kebersihan: cat.kebersihan ?? null,
              sakit: cat.sakit ?? 0,
              izin: cat.izin ?? 0,
              alpa: cat.alpa ?? 0,
            }
          : undefined,
      };
    });

  // Urutkan kandidat berdasarkan total nilai menurun (descending)
  studentCandidates.sort((a, b) => b.total_nilai - a.total_nilai);

  // 8. Tentukan Rank Sementara & Deteksi Nilai Seri
  // Hitung frekuensi per total nilai
  const scoreFrequency = new Map<number, number>();
  studentCandidates.forEach((s) => {
    scoreFrequency.set(s.total_nilai, (scoreFrequency.get(s.total_nilai) || 0) + 1);
  });

  let currentRank = 1;
  let hasTies = false;
  let tieGroupIdCounter = 1;
  const scoreToTieGroupId = new Map<number, number>();

  const students: StudentRankCandidate[] = studentCandidates.map((s, idx) => {
    if (idx > 0 && s.total_nilai < studentCandidates[idx - 1].total_nilai) {
      currentRank = idx + 1;
    }

    const freq = scoreFrequency.get(s.total_nilai) || 1;
    const isSeri = freq > 1;

    let tieGroupId: number | null = null;
    if (isSeri) {
      hasTies = true;
      if (!scoreToTieGroupId.has(s.total_nilai)) {
        scoreToTieGroupId.set(s.total_nilai, tieGroupIdCounter++);
      }
      tieGroupId = scoreToTieGroupId.get(s.total_nilai)!;
    }

    return {
      ...s,
      rank_sementara: currentRank,
      is_seri: isSeri,
      tie_group_id: tieGroupId,
    };
  });

  return {
    ok: true,
    isReady,
    totalSantri: activeEnrollments.length,
    totalMapelNilai,
    totalSelExpected,
    selTerisi,
    missingCellsCount,
    hasTies,
    students,
  };
}

// ==============================================================================
// 2. FINALISASI RAPORT (SIMPAN PERINGKAT FINAL & KUNCI STATUS FINAL)
// ==============================================================================
export async function finalisasiRaportAction(
  input: FinalisasiRaportInput
): Promise<ActionResult> {
  const context = await getEffectiveContext();
  if (!context.user || !context.profile) {
    return { ok: false, message: "Sesi telah berakhir. Silakan login kembali." };
  }

  const parsed = finalisasiRaportSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Data peringkat tidak valid." };
  }

  const { marhalah_id, semester_id, peringkatList } = parsed.data;

  // Verifikasi keunikan peringkat 1..N
  const rankNumbers = peringkatList.map((p) => p.peringkat);
  const rankSet = new Set(rankNumbers);
  if (rankSet.size !== peringkatList.length) {
    return {
      ok: false,
      message: "Setiap santri harus memiliki peringkat unik (tidak boleh ada nomor peringkat ganda).",
    };
  }

  const adminClient = createAdminClient();

  // 1. Ambil semester
  const { data: semData, error: semErr } = await adminClient
    .from("semester")
    .select("id, jenis, tahun_ajaran_id")
    .eq("id", semester_id)
    .single();

  if (semErr || !semData) {
    return { ok: false, message: "Data semester tidak ditemukan." };
  }

  // 2. Verifikasi Wewenang
  const isAdmin = context.profile.role === "admin";
  const activeTeacherId = context.isActingAs ? context.effectiveGuruId : context.user.id;

  if (!isAdmin) {
    const { data: waliData } = await adminClient
      .from("guru_marhalah")
      .select("id")
      .eq("guru_id", activeTeacherId)
      .eq("marhalah_id", marhalah_id)
      .eq("tahun_ajaran_id", semData.tahun_ajaran_id)
      .maybeSingle();

    if (!waliData) {
      return {
        ok: false,
        message: "Akses ditolak: Hanya Wali Kelas atau Administrator yang dapat memfinalisasi raport.",
      };
    }
  }

  // 3. Verifikasi ulang kelengkapan nilai di server
  const readiness = await checkFinalisasiReadinessAction(marhalah_id, semester_id);
  if (!readiness.isReady) {
    return {
      ok: false,
      message: `Finalisasi ditolak: Masih terdapat ${readiness.missingCellsCount} sel nilai yang belum diisi.`,
    };
  }

  // 4. Tentukan Mode Audit
  let auditMode: "langsung" | "admin_langsung" | "act_as" = "langsung";
  let atasNamaId: string | null = null;

  if (isAdmin) {
    if (context.isActingAs && context.effectiveGuruId) {
      auditMode = "act_as";
      atasNamaId = context.effectiveGuruId;
    } else {
      auditMode = "admin_langsung";
    }
  } else {
    auditMode = "langsung";
  }

  const nowIso = new Date().toISOString();

  // 5. Simpan ke peringkat_final
  const peringkatPayloads = peringkatList.map((p) => ({
    enrollment_id: p.enrollment_id,
    semester_id: semester_id,
    peringkat: p.peringkat,
    updated_at: nowIso,
  }));

  const { error: rankErr } = await adminClient
    .from("peringkat_final")
    .upsert(peringkatPayloads, {
      onConflict: "enrollment_id,semester_id",
    });

  if (rankErr) {
    return { ok: false, message: `Gagal menyimpan peringkat final: ${rankErr.message}` };
  }

  // 6. Update status_raport menjadi 'final'
  const { data: statusRecord, error: statusErr } = await adminClient
    .from("status_raport")
    .upsert(
      {
        marhalah_id,
        semester_id,
        status: "final",
        difinalisasi_oleh: context.user.id,
        difinalisasi_pada: nowIso,
        updated_at: nowIso,
      },
      {
        onConflict: "marhalah_id,semester_id",
      }
    )
    .select("id")
    .single();

  if (statusErr || !statusRecord) {
    return { ok: false, message: `Gagal memperbarui status raport: ${statusErr?.message}` };
  }

  // 7. Catat ke audit_log
  await adminClient.from("audit_log").insert({
    tabel: "status_raport",
    record_id: statusRecord.id,
    aksi: "finalisasi",
    data_lama: { status: "draft" },
    data_baru: {
      status: "final",
      total_santri: peringkatList.length,
      difinalisasi_pada: nowIso,
    },
    user_id: context.user.id,
    mode: auditMode,
    atas_nama: atasNamaId,
    waktu: nowIso,
  });

  revalidatePath(`/guru/nilai/${marhalah_id}`);
  revalidatePath(`/admin/kelas/${marhalah_id}/nilai`);
  revalidatePath(`/admin/kelas/${marhalah_id}/progres`);
  revalidatePath("/admin/dashboard");

  return {
    ok: true,
    message: "Raport berhasil difinalisasi! Status kelas kini TERKUNCI dan peringkat final telah tersimpan.",
  };
}

// ==============================================================================
// 3. BUKA KUNCI RAPORT (HANYA ADMINISTRATOR)
// ==============================================================================
export async function bukaKunciRaportAction(
  marhalahId: string,
  semesterId: string
): Promise<ActionResult> {
  const context = await getEffectiveContext();
  if (!context.user || context.profile?.role !== "admin") {
    return {
      ok: false,
      message: "Akses ditolak: Hanya Administrator yang berwenang membuka kunci raport.",
    };
  }

  const adminClient = createAdminClient();

  // 1. Ambil status_raport saat ini
  const { data: statusData } = await adminClient
    .from("status_raport")
    .select("id, status")
    .eq("marhalah_id", marhalahId)
    .eq("semester_id", semesterId)
    .maybeSingle();

  if (!statusData || statusData.status !== "final") {
    return { ok: false, message: "Raport kelas ini tidak sedang dalam status final / terkunci." };
  }

  // 2. Ambil seluruh enrollment IDs di marhalah ini
  const { data: enrollments } = await adminClient
    .from("enrollment")
    .select("id")
    .eq("marhalah_id", marhalahId);

  const enrollmentIds = (enrollments ?? []).map((e) => e.id);

  // 3. Hapus data peringkat_final untuk kelas & semester ini
  if (enrollmentIds.length > 0) {
    const { error: delRankErr } = await adminClient
      .from("peringkat_final")
      .delete()
      .eq("semester_id", semesterId)
      .in("enrollment_id", enrollmentIds);

    if (delRankErr) {
      return { ok: false, message: `Gagal menghapus peringkat final: ${delRankErr.message}` };
    }
  }

  const nowIso = new Date().toISOString();

  // 4. Ubah status_raport kembali ke 'draft'
  const { error: updErr } = await adminClient
    .from("status_raport")
    .update({
      status: "draft",
      difinalisasi_oleh: null,
      difinalisasi_pada: null,
      updated_at: nowIso,
    })
    .eq("id", statusData.id);

  if (updErr) {
    return { ok: false, message: `Gagal membuka status kunci: ${updErr.message}` };
  }

  // 5. Catat ke audit_log
  await adminClient.from("audit_log").insert({
    tabel: "status_raport",
    record_id: statusData.id,
    aksi: "buka_kunci",
    data_lama: { status: "final" },
    data_baru: { status: "draft", alasan: "Kunci raport dibuka oleh administrator" },
    user_id: context.user.id,
    mode: "admin_langsung",
    atas_nama: null,
    waktu: nowIso,
  });

  revalidatePath(`/guru/nilai/${marhalahId}`);
  revalidatePath(`/admin/kelas/${marhalahId}/nilai`);
  revalidatePath(`/admin/kelas/${marhalahId}/progres`);
  revalidatePath("/admin/dashboard");

  return {
    ok: true,
    message: "Kunci raport berhasil dibuka! Status kembali DRAFT dan lembar nilai dapat diedit kembali.",
  };
}

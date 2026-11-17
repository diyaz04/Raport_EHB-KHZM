"use server";

import { revalidatePath } from "next/cache";
import { getEffectiveContext } from "@/lib/auth/context";
import { createAdminClient } from "@/lib/supabase/admin";

export interface ImportNilaiRowItem {
  enrollment_id: string;
  nilaiMap: Record<string, number | null>;
  catatan?: {
    akhlak?: string | null;
    ketekunan?: string | null;
    kerapihan?: string | null;
    kebersihan?: string | null;
    sakit?: number | null;
    izin?: number | null;
    alpa?: number | null;
  };
}

export interface ImportNilaiPayload {
  marhalah_id: string;
  semester_id: string;
  timpa: boolean;
  rows: ImportNilaiRowItem[];
}

export interface ImportNilaiResult {
  ok: boolean;
  message: string;
  summary?: {
    totalRows: number;
    nilaiSaved: number;
    catatanSaved: number;
    skippedCount: number;
    rejectedCount: number;
  };
}

const VALID_PREDIKATS = new Set(["Sangat Baik", "Baik", "Cukup", "Kurang"]);

export async function importNilaiExcelAction(
  payload: ImportNilaiPayload
): Promise<ImportNilaiResult> {
  const context = await getEffectiveContext();
  if (!context.user || !context.profile) {
    return { ok: false, message: "Sesi telah berakhir. Silakan login kembali." };
  }

  const { marhalah_id, semester_id, timpa, rows } = payload;
  if (!marhalah_id || !semester_id) {
    return { ok: false, message: "Parameter marhalah atau semester tidak valid." };
  }

  if (!rows || rows.length === 0) {
    return { ok: false, message: "Tidak ada baris data nilai yang dikirim untuk diimpor." };
  }

  const adminClient = createAdminClient();

  // 1. Ambil info semester & tahun ajaran
  const { data: semData, error: semErr } = await adminClient
    .from("semester")
    .select("id, jenis, tahun_ajaran_id")
    .eq("id", semester_id)
    .single();

  if (semErr || !semData) {
    return { ok: false, message: "Data semester tidak ditemukan." };
  }

  const tahunAjaranId = semData.tahun_ajaran_id;

  // 2. Periksa Kunci Status Final (status_raport)
  const { data: statusData } = await adminClient
    .from("status_raport")
    .select("status")
    .eq("marhalah_id", marhalah_id)
    .eq("semester_id", semester_id)
    .maybeSingle();

  if (statusData?.status === "final") {
    return {
      ok: false,
      message: "Raport kelas ini berstatus FINAL dan terkunci. Import nilai ditolak.",
    };
  }

  // 3. Tentukan Mode Audit & Hak Akses
  let auditMode: "langsung" | "admin_langsung" | "act_as" = "langsung";
  let atasNamaId: string | null = null;
  const isAdmin = context.profile.role === "admin";

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

  const activeTeacherId = context.isActingAs ? context.effectiveGuruId : context.user.id;

  // 4. Periksa Wewenang Guru (Wali Kelas / Pengampu)
  let isWaliKelas = false;
  const allowedMapelSet = new Set<string>();

  if (auditMode === "admin_langsung") {
    isWaliKelas = true;
  } else {
    // Cek Wali Kelas
    const { data: waliData } = await adminClient
      .from("guru_marhalah")
      .select("id")
      .eq("guru_id", activeTeacherId)
      .eq("marhalah_id", marhalah_id)
      .eq("tahun_ajaran_id", tahunAjaranId)
      .maybeSingle();

    isWaliKelas = Boolean(waliData);

    if (isWaliKelas) {
      // Wali kelas berhak atas semua mapel di kelasnya
      const { data: allMm } = await adminClient
        .from("marhalah_mapel")
        .select("id")
        .eq("marhalah_id", marhalah_id)
        .eq("semester_id", semester_id);
      (allMm ?? []).forEach((m) => allowedMapelSet.add(m.id));
    } else {
      // Guru Pengampu hanya berhak atas mapel yang diampunya
      const { data: pengampuList } = await adminClient
        .from("pengampu")
        .select("marhalah_mapel_id, marhalah_mapel!inner(marhalah_id, semester_id)")
        .eq("guru_id", activeTeacherId)
        .eq("marhalah_mapel.marhalah_id", marhalah_id)
        .eq("marhalah_mapel.semester_id", semester_id);

      (pengampuList ?? []).forEach((p) => allowedMapelSet.add(p.marhalah_mapel_id));

      if (allowedMapelSet.size === 0) {
        return {
          ok: false,
          message:
            "Akses ditolak: Anda tidak memiliki penugasan Wali Kelas maupun Pengampu di marhalah ini.",
        };
      }
    }
  }

  // 5. Validasi Enrollment IDs yang sah di kelas & TA ini
  const enrollmentIds = rows.map((r) => r.enrollment_id);
  const { data: validEnrollments } = await adminClient
    .from("enrollment")
    .select("id, santri_id")
    .eq("marhalah_id", marhalah_id)
    .eq("tahun_ajaran_id", tahunAjaranId)
    .in("id", enrollmentIds);

  const validEnrollmentSet = new Set((validEnrollments ?? []).map((e) => e.id));

  // 6. Ambil Data Nilai Existing
  const { data: existingNilaiList } = await adminClient
    .from("nilai")
    .select("id, enrollment_id, marhalah_mapel_id, angka")
    .eq("semester_id", semester_id)
    .in("enrollment_id", enrollmentIds);

  // Key: `${enrollment_id}_${marhalah_mapel_id}`
  const existingNilaiMap = new Map<string, { id: string; angka: number | null }>();
  (existingNilaiList ?? []).forEach((n) => {
    existingNilaiMap.set(`${n.enrollment_id}_${n.marhalah_mapel_id}`, {
      id: n.id,
      angka: n.angka,
    });
  });

  // 7. Ambil Data Catatan Existing
  const { data: existingCatatanList } = await adminClient
    .from("catatan_semester")
    .select("*")
    .eq("semester_id", semester_id)
    .in("enrollment_id", enrollmentIds);

  const existingCatatanMap = new Map<string, Record<string, unknown>>();
  (existingCatatanList ?? []).forEach((c) => {
    existingCatatanMap.set(c.enrollment_id, c as Record<string, unknown>);
  });

  // 8. Eksekusi Pemrosesan Baris Nilai & Catatan
  let nilaiSavedCount = 0;
  let catatanSavedCount = 0;
  let skippedCount = 0;
  let rejectedCount = 0;

  const nowIso = new Date().toISOString();

  for (const row of rows) {
    if (!validEnrollmentSet.has(row.enrollment_id)) {
      rejectedCount++;
      continue;
    }

    // A. PROSES NILAI MAPEL
    for (const [marhalahMapelId, rawAngka] of Object.entries(row.nilaiMap)) {
      if (rawAngka === null || rawAngka === undefined) {
        continue;
      }

      // Validasi angka 0-100
      const angka = typeof rawAngka === "number" ? Math.round(rawAngka) : parseInt(String(rawAngka), 10);
      if (isNaN(angka) || angka < 0 || angka > 100) {
        rejectedCount++;
        continue;
      }

      // Validasi hak guru atas mapel ini
      if (!isWaliKelas && !allowedMapelSet.has(marhalahMapelId)) {
        rejectedCount++;
        continue;
      }

      const cellKey = `${row.enrollment_id}_${marhalahMapelId}`;
      const existing = existingNilaiMap.get(cellKey);

      // Cek aturan opsi 'timpa'
      if (!timpa && existing && existing.angka !== null && existing.angka !== undefined) {
        skippedCount++;
        continue;
      }

      // Simpan Nilai (Upsert)
      const { data: savedNilai, error: saveErr } = await adminClient
        .from("nilai")
        .upsert(
          {
            enrollment_id: row.enrollment_id,
            semester_id: semester_id,
            marhalah_mapel_id: marhalahMapelId,
            angka: angka,
            updated_at: nowIso,
          },
          { onConflict: "enrollment_id,marhalah_mapel_id" }
        )
        .select("id")
        .single();

      if (!saveErr && savedNilai) {
        nilaiSavedCount++;

        // Audit Log
        await adminClient.from("audit_log").insert({
          tabel: "nilai",
          record_id: savedNilai.id,
          aksi: existing ? "update" : "insert",
          data_lama: existing ? { angka: existing.angka } : null,
          data_baru: { angka: angka, via: "import_excel" },
          user_id: context.user.id,
          mode: auditMode,
          atas_nama: atasNamaId,
          waktu: nowIso,
        });
      }
    }

    // B. PROSES CATATAN KEPRIBADIAN & PRESENSI (HANYA JIKA WALI KELAS / ADMIN DIRECT)
    if (isWaliKelas && row.catatan) {
      const oldCat = existingCatatanMap.get(row.enrollment_id);
      const catatanPayload: Record<string, unknown> = {
        enrollment_id: row.enrollment_id,
        semester_id: semester_id,
        updated_at: nowIso,
      };

      let hasCatatanChange = false;

      // 1. Kepribadian
      const kepribadianFields = ["akhlak", "ketekunan", "kerapihan", "kebersihan"] as const;
      for (const field of kepribadianFields) {
        const rawVal = row.catatan[field];
        if (rawVal !== undefined && rawVal !== null && rawVal.trim() !== "") {
          const cleanVal = rawVal.trim();
          if (VALID_PREDIKATS.has(cleanVal)) {
            const oldVal = oldCat?.[field];
            if (!timpa && oldVal !== null && oldVal !== undefined && String(oldVal).trim() !== "") {
              // lewati jika sudah terisi dan tidak timpa
            } else {
              catatanPayload[field] = cleanVal;
              hasCatatanChange = true;
            }
          }
        }
      }

      // 2. Presensi
      const presensiFields = ["sakit", "izin", "alpa"] as const;
      for (const field of presensiFields) {
        const rawVal = row.catatan[field];
        if (rawVal !== undefined && rawVal !== null) {
          const count = typeof rawVal === "number" ? Math.round(rawVal) : parseInt(String(rawVal), 10);
          if (!isNaN(count) && count >= 0) {
            const oldVal = oldCat?.[field];
            if (!timpa && oldVal !== null && oldVal !== undefined && Number(oldVal) > 0) {
              // lewati jika sudah ada catatan dan tidak timpa
            } else {
              catatanPayload[field] = count;
              hasCatatanChange = true;
            }
          }
        }
      }

      if (hasCatatanChange) {
        const { data: savedCatatan, error: catErr } = await adminClient
          .from("catatan_semester")
          .upsert(catatanPayload, { onConflict: "enrollment_id,semester_id" })
          .select("id")
          .single();

        if (!catErr && savedCatatan) {
          catatanSavedCount++;

          await adminClient.from("audit_log").insert({
            tabel: "catatan_semester",
            record_id: savedCatatan.id,
            aksi: oldCat ? "update" : "insert",
            data_lama: oldCat ? oldCat : null,
            data_baru: { ...catatanPayload, via: "import_excel" },
            user_id: context.user.id,
            mode: auditMode,
            atas_nama: atasNamaId,
            waktu: nowIso,
          });
        }
      }
    }
  }

  revalidatePath(`/guru/nilai/${marhalah_id}`);
  revalidatePath(`/admin/kelas/${marhalah_id}/nilai`);

  return {
    ok: true,
    message: `Import nilai berhasil: ${nilaiSavedCount} nilai mata pelajaran disimpan, ${catatanSavedCount} catatan kepribadian & presensi diperbarui.`,
    summary: {
      totalRows: rows.length,
      nilaiSaved: nilaiSavedCount,
      catatanSaved: catatanSavedCount,
      skippedCount,
      rejectedCount,
    },
  };
}

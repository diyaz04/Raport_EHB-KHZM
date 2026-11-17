"use server";

import { getEffectiveContext } from "@/lib/auth/context";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  saveNilaiSchema,
  saveCatatanSchema,
  type SaveNilaiInput,
  type SaveCatatanInput,
} from "@/lib/validations/nilai";

export interface SaveCellResult {
  ok: boolean;
  message: string;
}

// ==============================================================================
// 1. AUTOSAVE PER SEL NILAI (DENGAN AUDIT LOG & KUNCI STATUS FINAL)
// ==============================================================================
export async function saveNilaiCellAction(data: SaveNilaiInput): Promise<SaveCellResult> {
  const context = await getEffectiveContext();
  if (!context.user || !context.profile) {
    return { ok: false, message: "Sesi telah berakhir. Silakan login kembali." };
  }

  const parsed = saveNilaiSchema.safeParse(data);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Nilai tidak valid." };
  }

  const adminClient = createAdminClient();

  // 1. Ambil informasi marhalah_id dan tahun_ajaran_id dari marhalah_mapel
  const { data: mmData, error: mmErr } = await adminClient
    .from("marhalah_mapel")
    .select("marhalah_id, semester_id, semester(tahun_ajaran_id)")
    .eq("id", parsed.data.marhalah_mapel_id)
    .single();

  if (mmErr || !mmData) {
    return { ok: false, message: "Data mata pelajaran kurikulum tidak ditemukan." };
  }

  const marhalahId = mmData.marhalah_id;
  const tahunAjaranId = (mmData.semester as unknown as { tahun_ajaran_id: string })?.tahun_ajaran_id;

  // 2. Periksa Kunci Status Final (status_raport)
  const { data: statusData } = await adminClient
    .from("status_raport")
    .select("status")
    .eq("marhalah_id", marhalahId)
    .eq("semester_id", parsed.data.semester_id)
    .maybeSingle();

  if (statusData?.status === "final") {
    return {
      ok: false,
      message: "Raport kelas ini berstatus FINAL dan terkunci. Nilai tidak dapat diubah.",
    };
  }

  // 3. Tentukan Mode Audit & Hak Akses
  let auditMode: "langsung" | "admin_langsung" | "act_as" = "langsung";
  let atasNamaId: string | null = null;

  if (context.profile.role === "admin") {
    if (context.isActingAs && context.effectiveGuruId) {
      auditMode = "act_as";
      atasNamaId = context.effectiveGuruId;
    } else {
      auditMode = "admin_langsung";
    }
  } else {
    auditMode = "langsung";
  }

  // 4. Verifikasi wewenang guru (jika bukan mode admin_langsung)
  if (auditMode !== "admin_langsung") {
    const activeTeacherId = context.isActingAs ? context.effectiveGuruId : context.user.id;

    // Cek apakah guru adalah wali kelas di marhalah & TA ini
    const { data: waliData } = await adminClient
      .from("guru_marhalah")
      .select("id")
      .eq("guru_id", activeTeacherId)
      .eq("marhalah_id", marhalahId)
      .eq("tahun_ajaran_id", tahunAjaranId)
      .maybeSingle();

    const isWaliKelas = Boolean(waliData);

    // Cek apakah guru adalah pengampu mapel ini
    const { data: pengampuData } = await adminClient
      .from("pengampu")
      .select("id")
      .eq("guru_id", activeTeacherId)
      .eq("marhalah_mapel_id", parsed.data.marhalah_mapel_id)
      .maybeSingle();

    const isPengampu = Boolean(pengampuData);

    if (!isWaliKelas && !isPengampu) {
      return {
        ok: false,
        message: "Akses ditolak: Anda tidak memiliki wewenang mengisi nilai mata pelajaran ini.",
      };
    }
  }

  // 5. Ambil data lama untuk audit_log
  const { data: oldNilai } = await adminClient
    .from("nilai")
    .select("id, angka")
    .eq("enrollment_id", parsed.data.enrollment_id)
    .eq("marhalah_mapel_id", parsed.data.marhalah_mapel_id)
    .maybeSingle();

  // 6. Upsert ke tabel nilai
  const { data: upsertedNilai, error: upsertErr } = await adminClient
    .from("nilai")
    .upsert(
      {
        enrollment_id: parsed.data.enrollment_id,
        semester_id: parsed.data.semester_id,
        marhalah_mapel_id: parsed.data.marhalah_mapel_id,
        angka: parsed.data.angka,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "enrollment_id,marhalah_mapel_id",
      }
    )
    .select("id")
    .single();

  if (upsertErr || !upsertedNilai) {
    return { ok: false, message: `Gagal menyimpan nilai: ${upsertErr?.message}` };
  }

  // 7. Rekam ke audit_log
  await adminClient.from("audit_log").insert({
    tabel: "nilai",
    record_id: upsertedNilai.id,
    aksi: oldNilai ? "update" : "insert",
    data_lama: oldNilai ? { angka: oldNilai.angka } : null,
    data_baru: { angka: parsed.data.angka },
    user_id: context.user.id,
    mode: auditMode,
    atas_nama: atasNamaId,
    waktu: new Date().toISOString(),
  });

  return { ok: true, message: "Nilai tersimpan." };
}

// ==============================================================================
// 2. AUTOSAVE PER SEL CATATAN SEMESTER (KEPRIBADIAN & PRESENSI)
// ==============================================================================
export async function saveCatatanCellAction(data: SaveCatatanInput): Promise<SaveCellResult> {
  const context = await getEffectiveContext();
  if (!context.user || !context.profile) {
    return { ok: false, message: "Sesi telah berakhir. Silakan login kembali." };
  }

  const parsed = saveCatatanSchema.safeParse(data);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Data tidak valid." };
  }

  const adminClient = createAdminClient();

  // 1. Ambil marhalah_id dan tahun_ajaran_id dari enrollment
  const { data: enrollData, error: enrollErr } = await adminClient
    .from("enrollment")
    .select("marhalah_id, tahun_ajaran_id")
    .eq("id", parsed.data.enrollment_id)
    .single();

  if (enrollErr || !enrollData) {
    return { ok: false, message: "Data enrollment santri tidak ditemukan." };
  }

  const marhalahId = enrollData.marhalah_id;
  const tahunAjaranId = enrollData.tahun_ajaran_id;

  // 2. Periksa Kunci Status Final (status_raport)
  const { data: statusData } = await adminClient
    .from("status_raport")
    .select("status")
    .eq("marhalah_id", marhalahId)
    .eq("semester_id", parsed.data.semester_id)
    .maybeSingle();

  if (statusData?.status === "final") {
    return {
      ok: false,
      message: "Raport kelas ini berstatus FINAL dan terkunci. Catatan tidak dapat diubah.",
    };
  }

  // 3. Tentukan Mode Audit & Hak Akses (Hanya Admin atau Wali Kelas)
  let auditMode: "langsung" | "admin_langsung" | "act_as" = "langsung";
  let atasNamaId: string | null = null;

  if (context.profile.role === "admin") {
    if (context.isActingAs && context.effectiveGuruId) {
      auditMode = "act_as";
      atasNamaId = context.effectiveGuruId;
    } else {
      auditMode = "admin_langsung";
    }
  } else {
    auditMode = "langsung";
  }

  if (auditMode !== "admin_langsung") {
    const activeTeacherId = context.isActingAs ? context.effectiveGuruId : context.user.id;

    const { data: waliData } = await adminClient
      .from("guru_marhalah")
      .select("id")
      .eq("guru_id", activeTeacherId)
      .eq("marhalah_id", marhalahId)
      .eq("tahun_ajaran_id", tahunAjaranId)
      .maybeSingle();

    if (!waliData) {
      return {
        ok: false,
        message: "Akses ditolak: Hanya wali kelas atau admin yang berwenang mengisi kepribadian & presensi.",
      };
    }
  }

  // 4. Ambil data lama untuk audit_log
  const { data: oldCatatan } = await adminClient
    .from("catatan_semester")
    .select("*")
    .eq("enrollment_id", parsed.data.enrollment_id)
    .eq("semester_id", parsed.data.semester_id)
    .maybeSingle();

  // 5. Siapkan payload upsert
  const updatePayload: Record<string, unknown> = {
    enrollment_id: parsed.data.enrollment_id,
    semester_id: parsed.data.semester_id,
    [parsed.data.field]: parsed.data.value,
    updated_at: new Date().toISOString(),
  };

  const { data: upsertedCatatan, error: upsertErr } = await adminClient
    .from("catatan_semester")
    .upsert(updatePayload, {
      onConflict: "enrollment_id,semester_id",
    })
    .select("id")
    .single();

  if (upsertErr || !upsertedCatatan) {
    return { ok: false, message: `Gagal menyimpan catatan: ${upsertErr?.message}` };
  }

  // 6. Rekam ke audit_log
  await adminClient.from("audit_log").insert({
    tabel: "catatan_semester",
    record_id: upsertedCatatan.id,
    aksi: oldCatatan ? "update" : "insert",
    data_lama: oldCatatan ? { [parsed.data.field]: (oldCatatan as Record<string, unknown>)[parsed.data.field] } : null,
    data_baru: { [parsed.data.field]: parsed.data.value },
    user_id: context.user.id,
    mode: auditMode,
    atas_nama: atasNamaId,
    waktu: new Date().toISOString(),
  });

  return { ok: true, message: "Catatan tersimpan." };
}

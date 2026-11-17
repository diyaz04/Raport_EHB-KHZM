"use server";

import { revalidatePath } from "next/cache";
import { getEffectiveContext } from "@/lib/auth/context";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  ehbSchema,
  ehbRuanganSchema,
  ehbSesiSchema,
  ehbJadwalSchema,
  type EhbFormInput,
  type EhbRuanganFormInput,
  type EhbSesiFormInput,
  type EhbJadwalFormInput,
} from "@/lib/validations/ehb";

export interface ActionResult {
  ok: boolean;
  message: string;
}

async function verifyAdminAuth() {
  const context = await getEffectiveContext();
  if (!context.user || !context.profile || context.profile.role !== "admin") {
    throw new Error("Akses ditolak. Tindakan ini hanya dapat dilakukan oleh Administrator.");
  }
  return context;
}

// ==============================================================================
// 1. MANAJEMEN EVENT EHB (CREATE, UPDATE, DELETE)
// ==============================================================================

export async function createEhbAction(input: EhbFormInput): Promise<ActionResult> {
  try {
    const context = await verifyAdminAuth();
    const validated = ehbSchema.parse(input);
    const admin = createAdminClient();

    const { data, error } = await admin
      .from("ehb")
      .insert({
        nama: validated.nama,
        tahun_ajaran_id: validated.tahun_ajaran_id,
        semester_id: validated.semester_id,
        tanggal_mulai: validated.tanggal_mulai,
        tanggal_selesai: validated.tanggal_selesai,
        status: validated.status,
      })
      .select()
      .single();

    if (error || !data) {
      return { ok: false, message: error?.message || "Gagal membuat event EHB." };
    }

    await admin.from("audit_log").insert({
      tabel: "ehb",
      record_id: data.id,
      aksi: "CREATE_EHB",
      perubahan: validated,
      user_id: context.user!.id,
      atas_nama: context.effectiveGuruId ?? null,
    });

    revalidatePath("/admin/ehb");
    return { ok: true, message: `Event EHB "${validated.nama}" berhasil dibuat.` };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Terjadi kesalahan sistem." };
  }
}

export async function updateEhbAction(
  id: string,
  input: EhbFormInput
): Promise<ActionResult> {
  try {
    const context = await verifyAdminAuth();
    const validated = ehbSchema.parse(input);
    const admin = createAdminClient();

    const { error } = await admin
      .from("ehb")
      .update({
        nama: validated.nama,
        tahun_ajaran_id: validated.tahun_ajaran_id,
        semester_id: validated.semester_id,
        tanggal_mulai: validated.tanggal_mulai,
        tanggal_selesai: validated.tanggal_selesai,
        status: validated.status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      return { ok: false, message: error.message };
    }

    await admin.from("audit_log").insert({
      tabel: "ehb",
      record_id: id,
      aksi: "UPDATE_EHB",
      perubahan: validated,
      user_id: context.user!.id,
      atas_nama: context.effectiveGuruId ?? null,
    });

    revalidatePath("/admin/ehb");
    revalidatePath(`/admin/ehb/${id}`);
    return { ok: true, message: "Data event EHB berhasil diperbarui." };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Terjadi kesalahan sistem." };
  }
}

export async function deleteEhbAction(id: string): Promise<ActionResult> {
  try {
    const context = await verifyAdminAuth();
    const admin = createAdminClient();

    const { data: existing } = await admin.from("ehb").select("nama").eq("id", id).single();

    const { error } = await admin.from("ehb").delete().eq("id", id);

    if (error) {
      return { ok: false, message: error.message };
    }

    await admin.from("audit_log").insert({
      tabel: "ehb",
      record_id: id,
      aksi: "DELETE_EHB",
      perubahan: { nama: existing?.nama },
      user_id: context.user!.id,
      atas_nama: context.effectiveGuruId ?? null,
    });

    revalidatePath("/admin/ehb");
    return { ok: true, message: "Event EHB berhasil dihapus." };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Terjadi kesalahan sistem." };
  }
}

// ==============================================================================
// 2. MANAJEMEN RUANGAN EHB (ehb_ruangan)
// ==============================================================================

export async function createEhbRuanganAction(
  input: EhbRuanganFormInput
): Promise<ActionResult> {
  try {
    const context = await verifyAdminAuth();
    const validated = ehbRuanganSchema.parse(input);
    const admin = createAdminClient();

    // Pastikan EHB tidak dikunci
    const { data: ehb } = await admin.from("ehb").select("status").eq("id", validated.ehb_id).single();
    if (ehb?.status === "dikunci") {
      return { ok: false, message: "Event EHB ini berstatus DIKUNCI. Tidak dapat menambah ruangan." };
    }

    const { data, error } = await admin
      .from("ehb_ruangan")
      .insert({
        ehb_id: validated.ehb_id,
        nama: validated.nama,
        kapasitas: validated.kapasitas,
      })
      .select()
      .single();

    if (error || !data) {
      if (error?.code === "23505") {
        return { ok: false, message: `Ruangan dengan nama "${validated.nama}" sudah ada pada EHB ini.` };
      }
      return { ok: false, message: error?.message || "Gagal menambah ruangan." };
    }

    await admin.from("audit_log").insert({
      tabel: "ehb_ruangan",
      record_id: data.id,
      aksi: "CREATE_RUANGAN",
      perubahan: validated,
      user_id: context.user!.id,
      atas_nama: context.effectiveGuruId ?? null,
    });

    revalidatePath(`/admin/ehb/${validated.ehb_id}`);
    return { ok: true, message: `Ruangan "${validated.nama}" berhasil ditambahkan.` };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Terjadi kesalahan sistem." };
  }
}

export async function updateEhbRuanganAction(
  id: string,
  input: EhbRuanganFormInput
): Promise<ActionResult> {
  try {
    const context = await verifyAdminAuth();
    const validated = ehbRuanganSchema.parse(input);
    const admin = createAdminClient();

    const { data: ehb } = await admin.from("ehb").select("status").eq("id", validated.ehb_id).single();
    if (ehb?.status === "dikunci") {
      return { ok: false, message: "Event EHB ini berstatus DIKUNCI. Tidak dapat mengubah ruangan." };
    }

    const { error } = await admin
      .from("ehb_ruangan")
      .update({
        nama: validated.nama,
        kapasitas: validated.kapasitas,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      return { ok: false, message: error.message };
    }

    await admin.from("audit_log").insert({
      tabel: "ehb_ruangan",
      record_id: id,
      aksi: "UPDATE_RUANGAN",
      perubahan: validated,
      user_id: context.user!.id,
      atas_nama: context.effectiveGuruId ?? null,
    });

    revalidatePath(`/admin/ehb/${validated.ehb_id}`);
    return { ok: true, message: "Data ruangan berhasil diperbarui." };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Terjadi kesalahan sistem." };
  }
}

export async function deleteEhbRuanganAction(
  id: string,
  ehbId: string
): Promise<ActionResult> {
  try {
    const context = await verifyAdminAuth();
    const admin = createAdminClient();

    const { data: ehb } = await admin.from("ehb").select("status").eq("id", ehbId).single();
    if (ehb?.status === "dikunci") {
      return { ok: false, message: "Event EHB ini berstatus DIKUNCI. Tidak dapat menghapus ruangan." };
    }

    const { error } = await admin.from("ehb_ruangan").delete().eq("id", id);

    if (error) {
      return { ok: false, message: error.message };
    }

    await admin.from("audit_log").insert({
      tabel: "ehb_ruangan",
      record_id: id,
      aksi: "DELETE_RUANGAN",
      perubahan: { ehb_id: ehbId },
      user_id: context.user!.id,
      atas_nama: context.effectiveGuruId ?? null,
    });

    revalidatePath(`/admin/ehb/${ehbId}`);
    return { ok: true, message: "Ruangan berhasil dihapus." };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Terjadi kesalahan sistem." };
  }
}

// ==============================================================================
// 3. MANAJEMEN SESI EHB (ehb_sesi)
// ==============================================================================

export async function createEhbSesiAction(
  input: EhbSesiFormInput
): Promise<ActionResult> {
  try {
    const context = await verifyAdminAuth();
    const validated = ehbSesiSchema.parse(input);
    const admin = createAdminClient();

    const { data: ehb } = await admin.from("ehb").select("status").eq("id", validated.ehb_id).single();
    if (ehb?.status === "dikunci") {
      return { ok: false, message: "Event EHB ini berstatus DIKUNCI. Tidak dapat menambah sesi." };
    }

    const { data, error } = await admin
      .from("ehb_sesi")
      .insert({
        ehb_id: validated.ehb_id,
        tanggal: validated.tanggal,
        jam_mulai: validated.jam_mulai,
        jam_selesai: validated.jam_selesai,
      })
      .select()
      .single();

    if (error || !data) {
      return { ok: false, message: error?.message || "Gagal menambah sesi." };
    }

    await admin.from("audit_log").insert({
      tabel: "ehb_sesi",
      record_id: data.id,
      aksi: "CREATE_SESI",
      perubahan: validated,
      user_id: context.user!.id,
      atas_nama: context.effectiveGuruId ?? null,
    });

    revalidatePath(`/admin/ehb/${validated.ehb_id}`);
    return { ok: true, message: "Sesi ujian berhasil ditambahkan." };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Terjadi kesalahan sistem." };
  }
}

export async function updateEhbSesiAction(
  id: string,
  input: EhbSesiFormInput
): Promise<ActionResult> {
  try {
    const context = await verifyAdminAuth();
    const validated = ehbSesiSchema.parse(input);
    const admin = createAdminClient();

    const { data: ehb } = await admin.from("ehb").select("status").eq("id", validated.ehb_id).single();
    if (ehb?.status === "dikunci") {
      return { ok: false, message: "Event EHB ini berstatus DIKUNCI. Tidak dapat mengubah sesi." };
    }

    const { error } = await admin
      .from("ehb_sesi")
      .update({
        tanggal: validated.tanggal,
        jam_mulai: validated.jam_mulai,
        jam_selesai: validated.jam_selesai,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      return { ok: false, message: error.message };
    }

    await admin.from("audit_log").insert({
      tabel: "ehb_sesi",
      record_id: id,
      aksi: "UPDATE_SESI",
      perubahan: validated,
      user_id: context.user!.id,
      atas_nama: context.effectiveGuruId ?? null,
    });

    revalidatePath(`/admin/ehb/${validated.ehb_id}`);
    return { ok: true, message: "Data sesi ujian berhasil diperbarui." };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Terjadi kesalahan sistem." };
  }
}

export async function deleteEhbSesiAction(
  id: string,
  ehbId: string
): Promise<ActionResult> {
  try {
    const context = await verifyAdminAuth();
    const admin = createAdminClient();

    const { data: ehb } = await admin.from("ehb").select("status").eq("id", ehbId).single();
    if (ehb?.status === "dikunci") {
      return { ok: false, message: "Event EHB ini berstatus DIKUNCI. Tidak dapat menghapus sesi." };
    }

    const { error } = await admin.from("ehb_sesi").delete().eq("id", id);

    if (error) {
      return { ok: false, message: error.message };
    }

    await admin.from("audit_log").insert({
      tabel: "ehb_sesi",
      record_id: id,
      aksi: "DELETE_SESI",
      perubahan: { ehb_id: ehbId },
      user_id: context.user!.id,
      atas_nama: context.effectiveGuruId ?? null,
    });

    revalidatePath(`/admin/ehb/${ehbId}`);
    return { ok: true, message: "Sesi ujian berhasil dihapus." };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Terjadi kesalahan sistem." };
  }
}

// ==============================================================================
// 4. MANAJEMEN JADWAL MAPEL PER MARHALAH (ehb_jadwal)
// ==============================================================================

export async function createEhbJadwalAction(
  input: EhbJadwalFormInput,
  ehbId: string
): Promise<ActionResult> {
  try {
    const context = await verifyAdminAuth();
    const validated = ehbJadwalSchema.parse(input);
    const admin = createAdminClient();

    const { data: ehb } = await admin.from("ehb").select("status").eq("id", ehbId).single();
    if (ehb?.status === "dikunci") {
      return { ok: false, message: "Event EHB ini berstatus DIKUNCI. Tidak dapat menambah jadwal." };
    }

    const { data, error } = await admin
      .from("ehb_jadwal")
      .insert({
        sesi_id: validated.sesi_id,
        marhalah_id: validated.marhalah_id,
        marhalah_mapel_id: validated.marhalah_mapel_id,
      })
      .select()
      .single();

    if (error || !data) {
      if (error?.code === "23505") {
        return {
          ok: false,
          message: "Marhalah ini sudah memiliki jadwal ujian pada sesi tersebut.",
        };
      }
      return { ok: false, message: error?.message || "Gagal menjadwalkan mapel." };
    }

    await admin.from("audit_log").insert({
      tabel: "ehb_jadwal",
      record_id: data.id,
      aksi: "CREATE_JADWAL",
      perubahan: validated,
      user_id: context.user!.id,
      atas_nama: context.effectiveGuruId ?? null,
    });

    revalidatePath(`/admin/ehb/${ehbId}`);
    return { ok: true, message: "Jadwal ujian berhasil ditambahkan." };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Terjadi kesalahan sistem." };
  }
}

export async function deleteEhbJadwalAction(
  id: string,
  ehbId: string
): Promise<ActionResult> {
  try {
    const context = await verifyAdminAuth();
    const admin = createAdminClient();

    const { data: ehb } = await admin.from("ehb").select("status").eq("id", ehbId).single();
    if (ehb?.status === "dikunci") {
      return { ok: false, message: "Event EHB ini berstatus DIKUNCI. Tidak dapat menghapus jadwal." };
    }

    const { error } = await admin.from("ehb_jadwal").delete().eq("id", id);

    if (error) {
      return { ok: false, message: error.message };
    }

    await admin.from("audit_log").insert({
      tabel: "ehb_jadwal",
      record_id: id,
      aksi: "DELETE_JADWAL",
      perubahan: { ehb_id: ehbId },
      user_id: context.user!.id,
      atas_nama: context.effectiveGuruId ?? null,
    });

    revalidatePath(`/admin/ehb/${ehbId}`);
    return { ok: true, message: "Jadwal ujian berhasil dihapus." };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Terjadi kesalahan sistem." };
  }
}


// ==============================================================================
// 5. MANAJEMEN PESERTA EHB & NOMOR PESERTA (ehb_peserta)
// ==============================================================================

export async function generatePesertaEhbAction({
  ehbId,
  forceRegenerate = false,
  formatNomorPeserta,
}: {
  ehbId: string;
  forceRegenerate?: boolean;
  formatNomorPeserta?: string;
}): Promise<ActionResult> {
  try {
    const context = await verifyAdminAuth();
    const admin = createAdminClient();

    // 1. Verifikasi EHB
    const { data: ehb, error: ehbErr } = await admin
      .from("ehb")
      .select("id, status, tahun_ajaran_id, format_nomor_peserta")
      .eq("id", ehbId)
      .single();

    if (ehbErr || !ehb) {
      return { ok: false, message: "Data EHB tidak ditemukan." };
    }

    if (forceRegenerate && ehb.status === "dikunci") {
      return {
        ok: false,
        message: "Evaluasi Hasil Belajar ini berstatus DIKUNCI. Tidak dapat generate ulang nomor peserta.",
      };
    }

    // 2. Simpan format nomor peserta jika diberikan
    const activeFormat =
      formatNomorPeserta?.trim() ||
      ehb.format_nomor_peserta ||
      "{kode TA}-{kode marhalah}-{urut 3 digit}";

    if (formatNomorPeserta && formatNomorPeserta.trim() !== ehb.format_nomor_peserta) {
      await admin
        .from("ehb")
        .update({ format_nomor_peserta: activeFormat, updated_at: new Date().toISOString() })
        .eq("id", ehbId);
    }

    // 3. Coba panggil RPC PostgreSQL
    const { data: rpcData, error: rpcError } = await admin.rpc("generate_nomor_peserta_ehb", {
      p_ehb_id: ehbId,
      p_force_regenerate: forceRegenerate,
    });

    if (!rpcError && rpcData) {
      await admin.from("audit_log").insert({
        tabel: "ehb_peserta",
        record_id: ehbId,
        aksi: forceRegenerate ? "REGENERATE_NOMOR_PESERTA" : "SYNC_PESERTA_STABIL",
        perubahan: rpcData,
        user_id: context.user!.id,
        atas_nama: context.effectiveGuruId ?? null,
      });

      revalidatePath(`/admin/ehb/${ehbId}`);
      const info = rpcData as { total_peserta: number; peserta_baru: number };
      return {
        ok: true,
        message: forceRegenerate
          ? `Nomor peserta berhasil di-generate ulang untuk ${info.total_peserta} santri.`
          : `Sinkronisasi selesai: ${info.peserta_baru} santri baru ditambahkan (total: ${info.total_peserta} santri).`,
      };
    }

    // 4. Fallback TypeScript jika RPC tidak tersedia di environment
    const { data: ta } = await admin
      .from("tahun_ajaran")
      .select("kode")
      .eq("id", ehb.tahun_ajaran_id)
      .single();
    const taKode = ta?.kode || "TA";

    // Ambil enrollment aktif
    const { data: enrollments, error: enrollErr } = await admin
      .from("enrollment")
      .select(`
        id,
        marhalah_id,
        marhalah:marhalah_id(id, kode, urutan),
        santri:santri_id(id, nama, deleted_at)
      `)
      .eq("tahun_ajaran_id", ehb.tahun_ajaran_id);

    if (enrollErr || !enrollments) {
      return { ok: false, message: "Gagal mengambil data santri terdaftar: " + enrollErr?.message };
    }

    interface EnrollmentActiveRecord {
      id: string;
      marhalah_id: string;
      marhalah?: { id: string; kode?: string; urutan?: number } | null;
      santri?: { id: string; nama: string; deleted_at?: string | null } | null;
    }

    const activeEnrollments = (enrollments as unknown as EnrollmentActiveRecord[]).filter(
      (e) => e.santri && !e.santri.deleted_at
    );

    if (activeEnrollments.length === 0) {
      return { ok: false, message: "Tidak ada santri aktif yang terdaftar pada tahun ajaran ini." };
    }

    if (forceRegenerate) {
      // Hapus data lama
      await admin.from("ehb_peserta").delete().eq("ehb_id", ehbId);

      // Urutkan per marhalah urutan ASC, lalu nama santri ASC
      activeEnrollments.sort((a, b) => {
        const urutanA = a.marhalah?.urutan ?? 999;
        const urutanB = b.marhalah?.urutan ?? 999;
        if (urutanA !== urutanB) return urutanA - urutanB;
        return (a.santri?.nama || "").localeCompare(b.santri?.nama || "");
      });

      let currentMarhalahId: string | null = null;
      let seq = 0;
      const inserts = [];

      for (const item of activeEnrollments) {
        if (currentMarhalahId !== item.marhalah_id) {
          currentMarhalahId = item.marhalah_id;
          seq = 1;
        } else {
          seq++;
        }

        let mKode = item.marhalah?.kode || "01";
        if (mKode.length === 1 && /^\d$/.test(mKode)) mKode = "0" + mKode;

        const noPeserta = activeFormat
          .replace(/{kode TA}|{kode_ta}/g, taKode)
          .replace(/{kode marhalah}|{kode_marhalah}/g, mKode)
          .replace(/{urut 3 digit}|{urut}/g, String(seq).padStart(3, "0"));

        inserts.push({
          ehb_id: ehbId,
          enrollment_id: item.id,
          no_peserta: noPeserta,
          ruangan_id: null,
          no_urut: null,
        });
      }

      const { error: insErr } = await admin.from("ehb_peserta").insert(inserts);
      if (insErr) {
        return { ok: false, message: "Gagal menyimpan nomor peserta: " + insErr.message };
      }

      await admin.from("audit_log").insert({
        tabel: "ehb_peserta",
        record_id: ehbId,
        aksi: "REGENERATE_NOMOR_PESERTA",
        perubahan: { total: inserts.length, format: activeFormat },
        user_id: context.user!.id,
        atas_nama: context.effectiveGuruId ?? null,
      });

      revalidatePath(`/admin/ehb/${ehbId}`);
      return {
        ok: true,
        message: `Nomor peserta berhasil di-generate ulang untuk ${inserts.length} santri.`,
      };
    } else {
      // Mode Stabil: Cek siapa yang sudah punya ehb_peserta
      const { data: existingPeserta } = await admin
        .from("ehb_peserta")
        .select("id, enrollment_id, no_peserta")
        .eq("ehb_id", ehbId);

      const existingEnrollIds = new Set((existingPeserta ?? []).map((p) => p.enrollment_id));
      const newEnrollments = activeEnrollments.filter((e) => !existingEnrollIds.has(e.id));

      if (newEnrollments.length === 0) {
        return { ok: true, message: "Semua santri aktif telah memiliki nomor peserta (data stabil)." };
      }

      // Group per marhalah
      newEnrollments.sort((a, b) => {
        const urutanA = a.marhalah?.urutan ?? 999;
        const urutanB = b.marhalah?.urutan ?? 999;
        if (urutanA !== urutanB) return urutanA - urutanB;
        return (a.santri?.nama || "").localeCompare(b.santri?.nama || "");
      });

      const currentPesertaList = [...((existingPeserta ?? []) as Array<{ id: string; enrollment_id: string; no_peserta: string }>)];
      const inserts = [];
      for (const item of newEnrollments) {
        // Cari max seq yang ada untuk marhalah ini
        const sameMarhalahPeserta = currentPesertaList.filter((p) => {
          const match = activeEnrollments.find(
            (e) => e.id === p.enrollment_id && e.marhalah_id === item.marhalah_id
          );
          return !!match;
        });

        let maxSeq = 0;
        for (const p of sameMarhalahPeserta) {
          const m = p.no_peserta.match(/(\d+)$/);
          if (m) {
            const val = parseInt(m[1], 10);
            if (val > maxSeq) maxSeq = val;
          }
        }

        const newSeq = maxSeq + 1;
        let mKode = item.marhalah?.kode || "01";
        if (mKode.length === 1 && /^\d$/.test(mKode)) mKode = "0" + mKode;

        const noPeserta = activeFormat
          .replace(/{kode TA}|{kode_ta}/g, taKode)
          .replace(/{kode marhalah}|{kode_marhalah}/g, mKode)
          .replace(/{urut 3 digit}|{urut}/g, String(newSeq).padStart(3, "0"));

        inserts.push({
          ehb_id: ehbId,
          enrollment_id: item.id,
          no_peserta: noPeserta,
          ruangan_id: null,
          no_urut: null,
        });

        // Catat ke memory array existing agar santri baru berikutnya dapat newSeq + 1
        currentPesertaList.push({
          id: "temp",
          enrollment_id: item.id,
          no_peserta: noPeserta,
        });
      }

      const { error: insErr } = await admin.from("ehb_peserta").insert(inserts);
      if (insErr) {
        return { ok: false, message: "Gagal menyimpan santri baru: " + insErr.message };
      }

      revalidatePath(`/admin/ehb/${ehbId}`);
      return {
        ok: true,
        message: `${inserts.length} santri baru berhasil ditambahkan dengan nomor urut berikutnya.`,
      };
    }
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Terjadi kesalahan sistem." };
  }
}

// ==============================================================================
// 6. PENEMPATAN RUANGAN OTOMATIS & MANUAL (ehb_peserta)
// ==============================================================================

export async function alokasiRuanganEhbAction({
  ehbId,
  mode = "per_marhalah",
}: {
  ehbId: string;
  mode: "per_marhalah" | "campur";
}): Promise<ActionResult> {
  try {
    const context = await verifyAdminAuth();
    const admin = createAdminClient();

    // Verifikasi EHB
    const { data: ehb } = await admin.from("ehb").select("status").eq("id", ehbId).single();
    if (ehb?.status === "dikunci") {
      return { ok: false, message: "Event EHB berstatus DIKUNCI. Tidak dapat mengubah penempatan ruangan." };
    }

    // Coba panggil RPC PostgreSQL
    const { data: rpcData, error: rpcError } = await admin.rpc("alokasi_ruangan_ehb", {
      p_ehb_id: ehbId,
      p_mode: mode,
    });

    if (!rpcError && rpcData) {
      await admin.from("audit_log").insert({
        tabel: "ehb_peserta",
        record_id: ehbId,
        aksi: "ALOKASI_RUANGAN_EHB",
        perubahan: rpcData,
        user_id: context.user!.id,
        atas_nama: context.effectiveGuruId ?? null,
      });

      revalidatePath(`/admin/ehb/${ehbId}`);
      const res = rpcData as { total_dialokasikan: number; total_tanpa_ruangan: number };
      return {
        ok: true,
        message:
          res.total_tanpa_ruangan > 0
            ? `Alokasi selesai: ${res.total_dialokasikan} santri ditempatkan (${res.total_tanpa_ruangan} santri belum dapat kursi karena kapasitas ruangan penuh).`
            : `Alokasi ruangan berhasil: seluruh ${res.total_dialokasikan} santri telah ditempatkan ke ruangan (Mode: ${mode === "campur" ? "Selang-Seling" : "Per Marhalah"}).`,
      };
    }

    // Fallback TypeScript
    const { data: ruanganList } = await admin
      .from("ehb_ruangan")
      .select("id, nama, kapasitas")
      .eq("ehb_id", ehbId)
      .order("nama", { ascending: true });

    if (!ruanganList || ruanganList.length === 0) {
      return { ok: false, message: "Belum ada ruangan yang dibuat untuk EHB ini. Tambahkan ruangan terlebih dahulu." };
    }

    const { data: pesertaList, error: pErr } = await admin
      .from("ehb_peserta")
      .select(`
        id,
        no_peserta,
        enrollment:enrollment_id(
          id,
          marhalah_id,
          marhalah:marhalah_id(id, urutan),
          santri:santri_id(id, nama)
        )
      `)
      .eq("ehb_id", ehbId);

    if (pErr || !pesertaList || pesertaList.length === 0) {
      return { ok: false, message: "Belum ada peserta terdaftar. Lakukan generate nomor peserta terlebih dahulu." };
    }

    interface PesertaAlokasiRecord {
      id: string;
      no_peserta: string;
      enrollment?: {
        id: string;
        marhalah_id: string;
        marhalah?: { id: string; urutan?: number } | null;
        santri?: { id: string; nama: string } | null;
      } | null;
    }

    const typedPesertaList = (pesertaList as unknown as PesertaAlokasiRecord[]) ?? [];

    // Sorting peserta sesuai mode
    let sortedPeserta: PesertaAlokasiRecord[] = [...typedPesertaList];
    if (mode === "per_marhalah") {
      sortedPeserta.sort((a, b) => {
        const mUrutanA = a.enrollment?.marhalah?.urutan ?? 999;
        const mUrutanB = b.enrollment?.marhalah?.urutan ?? 999;
        if (mUrutanA !== mUrutanB) return mUrutanA - mUrutanB;
        return (a.enrollment?.santri?.nama || "").localeCompare(b.enrollment?.santri?.nama || "");
      });
    } else {
      // Mode CAMPUR (Interleaved / Selang-Seling)
      const groups: Record<string, PesertaAlokasiRecord[]> = {};
      for (const p of typedPesertaList) {
        const mId = p.enrollment?.marhalah_id || "default";
        if (!groups[mId]) groups[mId] = [];
        groups[mId].push(p);
      }

      // Urutkan tiap marhalah berdasarkan nama
      for (const mId in groups) {
        groups[mId].sort((a, b) =>
          (a.enrollment?.santri?.nama || "").localeCompare(b.enrollment?.santri?.nama || "")
        );
      }

      // Ambil round-robin
      const interleaved: PesertaAlokasiRecord[] = [];
      const mKeys = Object.keys(groups).sort((k1, k2) => {
        const u1 = groups[k1][0]?.enrollment?.marhalah?.urutan ?? 999;
        const u2 = groups[k2][0]?.enrollment?.marhalah?.urutan ?? 999;
        return u1 - u2;
      });

      let hasMore = true;
      let round = 0;
      while (hasMore) {
        hasMore = false;
        for (const k of mKeys) {
          if (round < groups[k].length) {
            interleaved.push(groups[k][round]);
            hasMore = true;
          }
        }
        round++;
      }
      sortedPeserta = interleaved;
    }

    // Petakan ke ruangan berurutan
    let roomIdx = 0;
    let seat = 1;
    let dialokasikan = 0;
    let tanpaRuangan = 0;

    for (const p of sortedPeserta) {
      if (roomIdx < ruanganList.length) {
        const currentRoom = ruanganList[roomIdx];
        await admin
          .from("ehb_peserta")
          .update({
            ruangan_id: currentRoom.id,
            no_urut: seat,
            updated_at: new Date().toISOString(),
          })
          .eq("id", p.id);

        dialokasikan++;
        seat++;

        if (seat > currentRoom.kapasitas) {
          roomIdx++;
          seat = 1;
        }
      } else {
        await admin
          .from("ehb_peserta")
          .update({
            ruangan_id: null,
            no_urut: null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", p.id);
        tanpaRuangan++;
      }
    }

    await admin.from("audit_log").insert({
      tabel: "ehb_peserta",
      record_id: ehbId,
      aksi: "ALOKASI_RUANGAN_EHB",
      perubahan: { mode, dialokasikan, tanpaRuangan },
      user_id: context.user!.id,
      atas_nama: context.effectiveGuruId ?? null,
    });

    revalidatePath(`/admin/ehb/${ehbId}`);
    return {
      ok: true,
      message:
        tanpaRuangan > 0
          ? `Alokasi selesai: ${dialokasikan} santri ditempatkan (${tanpaRuangan} santri tanpa ruangan karena kapasitas penuh).`
          : `Alokasi ruangan berhasil untuk seluruh ${dialokasikan} santri (Mode: ${mode === "campur" ? "Selang-Seling" : "Per Marhalah"}).`,
    };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Terjadi kesalahan sistem." };
  }
}

export async function updatePesertaRuanganAction({
  pesertaId,
  ehbId,
  ruanganId,
  noUrut,
}: {
  pesertaId: string;
  ehbId: string;
  ruanganId: string | null;
  noUrut?: number | null;
}): Promise<ActionResult> {
  try {
    const context = await verifyAdminAuth();
    const admin = createAdminClient();

    const { data: ehb } = await admin.from("ehb").select("status").eq("id", ehbId).single();
    if (ehb?.status === "dikunci") {
      return { ok: false, message: "Event EHB berstatus DIKUNCI. Tidak dapat mengubah penempatan ruangan." };
    }

    if (!ruanganId) {
      // Lepas dari ruangan
      const { error } = await admin
        .from("ehb_peserta")
        .update({
          ruangan_id: null,
          no_urut: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", pesertaId);

      if (error) return { ok: false, message: error.message };
    } else {
      // Jika noUrut tidak diberikan, cari nomor urut berikutnya di ruangan tersebut
      let targetSeat = noUrut;
      if (!targetSeat) {
        const { data: existingInRoom } = await admin
          .from("ehb_peserta")
          .select("no_urut")
          .eq("ehb_id", ehbId)
          .eq("ruangan_id", ruanganId);

        let maxSeat = 0;
        for (const r of existingInRoom ?? []) {
          if (r.no_urut && r.no_urut > maxSeat) maxSeat = r.no_urut;
        }
        targetSeat = maxSeat + 1;
      }

      const { error } = await admin
        .from("ehb_peserta")
        .update({
          ruangan_id: ruanganId,
          no_urut: targetSeat,
          updated_at: new Date().toISOString(),
        })
        .eq("id", pesertaId);

      if (error) return { ok: false, message: error.message };
    }

    await admin.from("audit_log").insert({
      tabel: "ehb_peserta",
      record_id: pesertaId,
      aksi: "UPDATE_PESERTA_RUANGAN",
      perubahan: { ruangan_id: ruanganId, no_urut: noUrut },
      user_id: context.user!.id,
      atas_nama: context.effectiveGuruId ?? null,
    });

    revalidatePath(`/admin/ehb/${ehbId}`);
    return { ok: true, message: "Penempatan ruangan santri berhasil diperbarui." };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Terjadi kesalahan sistem." };
  }
}

export async function updateFormatNomorPesertaAction({
  ehbId,
  format,
}: {
  ehbId: string;
  format: string;
}): Promise<ActionResult> {
  try {
    const context = await verifyAdminAuth();
    const admin = createAdminClient();

    const { data: ehb } = await admin.from("ehb").select("status").eq("id", ehbId).single();
    if (ehb?.status === "dikunci") {
      return { ok: false, message: "Event EHB berstatus DIKUNCI. Tidak dapat mengubah konfigurasi format." };
    }

    const { error } = await admin
      .from("ehb")
      .update({
        format_nomor_peserta: format.trim() || "{kode TA}-{kode marhalah}-{urut 3 digit}",
        updated_at: new Date().toISOString(),
      })
      .eq("id", ehbId);

    if (error) return { ok: false, message: error.message };

    await admin.from("audit_log").insert({
      tabel: "ehb",
      record_id: ehbId,
      aksi: "UPDATE_FORMAT_NOMOR_PESERTA",
      perubahan: { format },
      user_id: context.user!.id,
      atas_nama: context.effectiveGuruId ?? null,
    });

    revalidatePath(`/admin/ehb/${ehbId}`);
    return { ok: true, message: "Konfigurasi format nomor peserta berhasil disimpan." };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Terjadi kesalahan sistem." };
  }
}

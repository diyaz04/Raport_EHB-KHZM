"use server";

import { revalidatePath } from "next/cache";
import { getEffectiveContext } from "@/lib/auth/context";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  santriSchema,
  enrollSantriSchema,
  pindahKelasSchema,
  type SantriFormValues,
  type EnrollSantriFormValues,
  type PindahKelasFormValues,
} from "@/lib/validations/santri";

export interface ActionResult {
  ok: boolean;
  message: string;
}

async function verifyAdmin(): Promise<boolean> {
  const context = await getEffectiveContext();
  return Boolean(context.user && context.profile?.role === "admin");
}

// ==============================================================================
// 1. SANTRI CRUD (DENGAN SOFT DELETE)
// ==============================================================================
export async function createSantriAction(data: SantriFormValues): Promise<ActionResult> {
  if (!(await verifyAdmin())) {
    return { ok: false, message: "Akses ditolak: Hanya administrator yang berwenang." };
  }

  const parsed = santriSchema.safeParse(data);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Validasi data gagal." };
  }

  const adminClient = createAdminClient();

  // Cek duplikasi NIS jika diisi
  if (parsed.data.nis) {
    const { data: existingNis } = await adminClient
      .from("santri")
      .select("id")
      .eq("nis", parsed.data.nis)
      .maybeSingle();

    if (existingNis) {
      return { ok: false, message: `NIS "${parsed.data.nis}" sudah digunakan oleh santri lain.` };
    }
  }

  // Insert santri
  const { data: insertedSantri, error: insertErr } = await adminClient
    .from("santri")
    .insert({
      nama: parsed.data.nama,
      nis: parsed.data.nis ?? null,
      jenis_kelamin: parsed.data.jenis_kelamin,
      deleted_at: null,
    })
    .select("id")
    .single();

  if (insertErr || !insertedSantri) {
    return { ok: false, message: `Gagal menambahkan santri: ${insertErr?.message}` };
  }

  // Jika opsi penempatan marhalah langsung dipilih
  if (parsed.data.marhalah_id && parsed.data.tahun_ajaran_id) {
    const { error: enrollErr } = await adminClient.from("enrollment").insert({
      santri_id: insertedSantri.id,
      marhalah_id: parsed.data.marhalah_id,
      tahun_ajaran_id: parsed.data.tahun_ajaran_id,
    });

    if (enrollErr) {
      return {
        ok: true,
        message: `Santri berhasil ditambahkan, namun penempatan kelas gagal: ${enrollErr.message}`,
      };
    }
  }

  revalidatePath("/admin/santri");
  return { ok: true, message: "Santri baru berhasil ditambahkan." };
}

export async function updateSantriAction(
  id: string,
  data: {
    nama: string;
    nis?: string | null;
    jenis_kelamin: "L" | "P";
  }
): Promise<ActionResult> {
  if (!(await verifyAdmin())) {
    return { ok: false, message: "Akses ditolak: Hanya administrator yang berwenang." };
  }

  const cleanNis = data.nis && data.nis.trim().length > 0 ? data.nis.trim() : null;

  const adminClient = createAdminClient();

  // Cek NIS unik
  if (cleanNis) {
    const { data: existingNis } = await adminClient
      .from("santri")
      .select("id")
      .eq("nis", cleanNis)
      .neq("id", id)
      .maybeSingle();

    if (existingNis) {
      return { ok: false, message: `NIS "${cleanNis}" sudah digunakan oleh santri lain.` };
    }
  }

  const { error } = await adminClient
    .from("santri")
    .update({
      nama: data.nama.trim(),
      nis: cleanNis,
      jenis_kelamin: data.jenis_kelamin,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    return { ok: false, message: `Gagal memperbarui data santri: ${error.message}` };
  }

  revalidatePath("/admin/santri");
  return { ok: true, message: "Data santri berhasil diperbarui." };
}

export async function softDeleteSantriAction(id: string): Promise<ActionResult> {
  if (!(await verifyAdmin())) {
    return { ok: false, message: "Akses ditolak: Hanya administrator yang berwenang." };
  }

  const adminClient = createAdminClient();
  const { error } = await adminClient
    .from("santri")
    .update({
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    return { ok: false, message: `Gagal menghapus santri: ${error.message}` };
  }

  revalidatePath("/admin/santri");
  return { ok: true, message: "Santri berhasil dinonaktifkan (soft delete)." };
}

export async function restoreSantriAction(id: string): Promise<ActionResult> {
  if (!(await verifyAdmin())) {
    return { ok: false, message: "Akses ditolak: Hanya administrator yang berwenang." };
  }

  const adminClient = createAdminClient();
  const { error } = await adminClient
    .from("santri")
    .update({
      deleted_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    return { ok: false, message: `Gagal memulihkan santri: ${error.message}` };
  }

  revalidatePath("/admin/santri");
  return { ok: true, message: "Data santri berhasil dipulihkan." };
}

// ==============================================================================
// 2. ENROLLMENT (PENEMPATAN KELAS & PINDAH KELAS SATU SANTRI)
// ==============================================================================
export async function enrollSantriAction(data: EnrollSantriFormValues): Promise<ActionResult> {
  if (!(await verifyAdmin())) {
    return { ok: false, message: "Akses ditolak: Hanya administrator yang berwenang." };
  }

  const parsed = enrollSantriSchema.safeParse(data);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Validasi data gagal." };
  }

  const adminClient = createAdminClient();

  // Cek apakah sudah terdaftar di tahun ajaran ini
  const { data: existingEnroll } = await adminClient
    .from("enrollment")
    .select("id, marhalah(nama)")
    .eq("santri_id", parsed.data.santri_id)
    .eq("tahun_ajaran_id", parsed.data.tahun_ajaran_id)
    .maybeSingle();

  if (existingEnroll) {
    const marhalahNama = (existingEnroll.marhalah as unknown as { nama: string })?.nama ?? "kelas lain";
    return {
      ok: false,
      message: `Santri ini sudah terdaftar di marhalah ${marhalahNama} untuk tahun ajaran tersebut. Gunakan fitur 'Pindah Kelas' jika ingin mengganti kelas.`,
    };
  }

  const { error } = await adminClient.from("enrollment").insert({
    santri_id: parsed.data.santri_id,
    tahun_ajaran_id: parsed.data.tahun_ajaran_id,
    marhalah_id: parsed.data.marhalah_id,
  });

  if (error) {
    return { ok: false, message: `Gagal menempatkan santri ke kelas: ${error.message}` };
  }

  revalidatePath("/admin/santri");
  return { ok: true, message: "Santri berhasil ditempatkan ke marhalah kelas." };
}

export async function pindahKelasAction(data: PindahKelasFormValues): Promise<ActionResult> {
  if (!(await verifyAdmin())) {
    return { ok: false, message: "Akses ditolak: Hanya administrator yang berwenang." };
  }

  const parsed = pindahKelasSchema.safeParse(data);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Validasi data gagal." };
  }

  const adminClient = createAdminClient();

  // Ambil enrollment saat ini
  const { data: currentEnroll, error: fetchErr } = await adminClient
    .from("enrollment")
    .select("id, marhalah_id, marhalah(nama)")
    .eq("id", parsed.data.enrollment_id)
    .single();

  if (fetchErr || !currentEnroll) {
    return { ok: false, message: "Data penempatan kelas santri tidak ditemukan." };
  }

  if (currentEnroll.marhalah_id === parsed.data.marhalah_id_baru) {
    return { ok: false, message: "Santri sudah berada di marhalah/kelas tujuan tersebut." };
  }

  // Ambil nama marhalah baru untuk pesan toast
  const { data: newMarhalah } = await adminClient
    .from("marhalah")
    .select("nama")
    .eq("id", parsed.data.marhalah_id_baru)
    .single();

  const { error: updateErr } = await adminClient
    .from("enrollment")
    .update({
      marhalah_id: parsed.data.marhalah_id_baru,
      updated_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.enrollment_id);

  if (updateErr) {
    return { ok: false, message: `Gagal memindahkan kelas santri: ${updateErr.message}` };
  }

  revalidatePath("/admin/santri");
  return {
    ok: true,
    message: `Santri berhasil dipindahkan ke marhalah ${newMarhalah?.nama ?? "baru"}.`,
  };
}

export async function unenrollSantriAction(enrollment_id: string): Promise<ActionResult> {
  if (!(await verifyAdmin())) {
    return { ok: false, message: "Akses ditolak: Hanya administrator yang berwenang." };
  }

  const adminClient = createAdminClient();

  // Cek apakah santri sudah memiliki data nilai pada enrollment ini
  const { count: countNilai } = await adminClient
    .from("nilai")
    .select("id", { count: "exact", head: true })
    .eq("enrollment_id", enrollment_id);

  if (countNilai && countNilai > 0) {
    return {
      ok: false,
      message: `Tidak dapat membatalkan penempatan kelas karena santri sudah memiliki ${countNilai} data nilai tersimpan.`,
    };
  }

  const { error } = await adminClient.from("enrollment").delete().eq("id", enrollment_id);
  if (error) {
    return { ok: false, message: `Gagal menghapus penempatan kelas: ${error.message}` };
  }

  revalidatePath("/admin/santri");
  return { ok: true, message: "Penempatan kelas santri berhasil dibatalkan." };
}

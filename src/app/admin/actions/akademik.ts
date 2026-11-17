"use server";

import { revalidatePath } from "next/cache";
import { getEffectiveContext } from "@/lib/auth/context";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  tahunAjaranSchema,
  semesterSchema,
  marhalahSchema,
  type TahunAjaranFormValues,
  type SemesterFormValues,
  type MarhalahFormValues,
} from "@/lib/validations/akademik";

export interface ActionResult {
  ok: boolean;
  message: string;
}

async function verifyAdmin(): Promise<boolean> {
  const context = await getEffectiveContext();
  return Boolean(context.user && context.profile?.role === "admin");
}

// ==============================================================================
// 1. TAHUN AJARAN ACTIONS
// ==============================================================================
export async function createTahunAjaranAction(data: TahunAjaranFormValues): Promise<ActionResult> {
  if (!(await verifyAdmin())) {
    return { ok: false, message: "Akses ditolak: Hanya administrator yang berwenang." };
  }

  const parsed = tahunAjaranSchema.safeParse(data);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Validasi data gagal." };
  }

  const adminClient = createAdminClient();

  if (parsed.data.aktif) {
    // Nonaktifkan semua tahun ajaran lain jika yang baru diset aktif
    await adminClient.from("tahun_ajaran").update({ aktif: false }).neq("id", "00000000-0000-0000-0000-000000000000");
  }

  const { error } = await adminClient.from("tahun_ajaran").insert({
    nama: parsed.data.nama,
    kode: parsed.data.kode,
    aktif: parsed.data.aktif,
  });

  if (error) {
    return { ok: false, message: `Gagal menambah tahun ajaran: ${error.message}` };
  }

  revalidatePath("/admin/tahun-ajaran");
  revalidatePath("/admin/semester");
  revalidatePath("/admin/dashboard");
  return { ok: true, message: "Tahun ajaran berhasil ditambahkan." };
}

export async function updateTahunAjaranAction(
  id: string,
  data: TahunAjaranFormValues
): Promise<ActionResult> {
  if (!(await verifyAdmin())) {
    return { ok: false, message: "Akses ditolak: Hanya administrator yang berwenang." };
  }

  const parsed = tahunAjaranSchema.safeParse(data);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Validasi data gagal." };
  }

  const adminClient = createAdminClient();

  if (parsed.data.aktif) {
    await adminClient.from("tahun_ajaran").update({ aktif: false }).neq("id", id);
  }

  const { error } = await adminClient
    .from("tahun_ajaran")
    .update({
      nama: parsed.data.nama,
      kode: parsed.data.kode,
      aktif: parsed.data.aktif,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    return { ok: false, message: `Gagal memperbarui tahun ajaran: ${error.message}` };
  }

  revalidatePath("/admin/tahun-ajaran");
  revalidatePath("/admin/semester");
  revalidatePath("/admin/dashboard");
  return { ok: true, message: "Tahun ajaran berhasil diperbarui." };
}

export async function setAktifTahunAjaranAction(id: string): Promise<ActionResult> {
  if (!(await verifyAdmin())) {
    return { ok: false, message: "Akses ditolak: Hanya administrator yang berwenang." };
  }

  const adminClient = createAdminClient();

  // Hanya satu tahun ajaran boleh aktif
  await adminClient.from("tahun_ajaran").update({ aktif: false }).neq("id", id);
  const { error } = await adminClient.from("tahun_ajaran").update({ aktif: true, updated_at: new Date().toISOString() }).eq("id", id);

  if (error) {
    return { ok: false, message: `Gagal mengaktifkan tahun ajaran: ${error.message}` };
  }

  revalidatePath("/admin/tahun-ajaran");
  revalidatePath("/admin/semester");
  revalidatePath("/admin/dashboard");
  return { ok: true, message: "Tahun ajaran aktif berhasil diperbarui." };
}

export async function deleteTahunAjaranAction(id: string): Promise<ActionResult> {
  if (!(await verifyAdmin())) {
    return { ok: false, message: "Akses ditolak: Hanya administrator yang berwenang." };
  }

  const adminClient = createAdminClient();
  const { error } = await adminClient.from("tahun_ajaran").delete().eq("id", id);

  if (error) {
    return {
      ok: false,
      message: `Tidak dapat menghapus tahun ajaran karena masih memiliki relasi data (semester/santri): ${error.message}`,
    };
  }

  revalidatePath("/admin/tahun-ajaran");
  revalidatePath("/admin/semester");
  revalidatePath("/admin/dashboard");
  return { ok: true, message: "Tahun ajaran berhasil dihapus." };
}

// ==============================================================================
// 2. SEMESTER ACTIONS
// ==============================================================================
export async function createSemesterAction(data: SemesterFormValues): Promise<ActionResult> {
  if (!(await verifyAdmin())) {
    return { ok: false, message: "Akses ditolak: Hanya administrator yang berwenang." };
  }

  const parsed = semesterSchema.safeParse(data);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Validasi data gagal." };
  }

  const adminClient = createAdminClient();

  if (parsed.data.aktif) {
    // Hanya satu semester boleh aktif di sistem
    await adminClient.from("semester").update({ aktif: false }).neq("id", "00000000-0000-0000-0000-000000000000");
  }

  const { error } = await adminClient.from("semester").insert({
    tahun_ajaran_id: parsed.data.tahun_ajaran_id,
    jenis: parsed.data.jenis,
    aktif: parsed.data.aktif,
  });

  if (error) {
    if (error.code === "23505") {
      return { ok: false, message: `Semester ${parsed.data.jenis} sudah ada untuk tahun ajaran tersebut.` };
    }
    return { ok: false, message: `Gagal menambah semester: ${error.message}` };
  }

  revalidatePath("/admin/semester");
  revalidatePath("/admin/dashboard");
  return { ok: true, message: "Semester berhasil ditambahkan." };
}

export async function updateSemesterAction(id: string, data: SemesterFormValues): Promise<ActionResult> {
  if (!(await verifyAdmin())) {
    return { ok: false, message: "Akses ditolak: Hanya administrator yang berwenang." };
  }

  const parsed = semesterSchema.safeParse(data);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Validasi data gagal." };
  }

  const adminClient = createAdminClient();

  if (parsed.data.aktif) {
    await adminClient.from("semester").update({ aktif: false }).neq("id", id);
  }

  const { error } = await adminClient
    .from("semester")
    .update({
      tahun_ajaran_id: parsed.data.tahun_ajaran_id,
      jenis: parsed.data.jenis,
      aktif: parsed.data.aktif,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    if (error.code === "23505") {
      return { ok: false, message: `Semester ${parsed.data.jenis} sudah terdaftar untuk tahun ajaran tersebut.` };
    }
    return { ok: false, message: `Gagal memperbarui semester: ${error.message}` };
  }

  revalidatePath("/admin/semester");
  revalidatePath("/admin/dashboard");
  return { ok: true, message: "Semester berhasil diperbarui." };
}

export async function setAktifSemesterAction(id: string): Promise<ActionResult> {
  if (!(await verifyAdmin())) {
    return { ok: false, message: "Akses ditolak: Hanya administrator yang berwenang." };
  }

  const adminClient = createAdminClient();

  // Hanya satu semester boleh aktif
  await adminClient.from("semester").update({ aktif: false }).neq("id", id);
  const { error } = await adminClient.from("semester").update({ aktif: true, updated_at: new Date().toISOString() }).eq("id", id);

  if (error) {
    return { ok: false, message: `Gagal mengaktifkan semester: ${error.message}` };
  }

  revalidatePath("/admin/semester");
  revalidatePath("/admin/dashboard");
  return { ok: true, message: "Semester aktif berhasil diperbarui." };
}

export async function deleteSemesterAction(id: string): Promise<ActionResult> {
  if (!(await verifyAdmin())) {
    return { ok: false, message: "Akses ditolak: Hanya administrator yang berwenang." };
  }

  const adminClient = createAdminClient();
  const { error } = await adminClient.from("semester").delete().eq("id", id);

  if (error) {
    return {
      ok: false,
      message: `Tidak dapat menghapus semester karena masih digunakan pada data nilai/kurikulum: ${error.message}`,
    };
  }

  revalidatePath("/admin/semester");
  revalidatePath("/admin/dashboard");
  return { ok: true, message: "Semester berhasil dihapus." };
}

// ==============================================================================
// 3. MARHALAH ACTIONS (Soft Delete)
// ==============================================================================
export async function createMarhalahAction(data: MarhalahFormValues): Promise<ActionResult> {
  if (!(await verifyAdmin())) {
    return { ok: false, message: "Akses ditolak: Hanya administrator yang berwenang." };
  }

  const parsed = marhalahSchema.safeParse(data);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Validasi data gagal." };
  }

  const adminClient = createAdminClient();
  const { error } = await adminClient.from("marhalah").insert({
    nama: parsed.data.nama,
    kode: parsed.data.kode,
    urutan: parsed.data.urutan,
    deleted_at: null,
  });

  if (error) {
    return { ok: false, message: `Gagal menambah marhalah: ${error.message}` };
  }

  revalidatePath("/admin/marhalah");
  revalidatePath("/admin/dashboard");
  return { ok: true, message: "Marhalah berhasil ditambahkan." };
}

export async function updateMarhalahAction(id: string, data: MarhalahFormValues): Promise<ActionResult> {
  if (!(await verifyAdmin())) {
    return { ok: false, message: "Akses ditolak: Hanya administrator yang berwenang." };
  }

  const parsed = marhalahSchema.safeParse(data);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Validasi data gagal." };
  }

  const adminClient = createAdminClient();
  const { error } = await adminClient
    .from("marhalah")
    .update({
      nama: parsed.data.nama,
      kode: parsed.data.kode,
      urutan: parsed.data.urutan,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    return { ok: false, message: `Gagal memperbarui marhalah: ${error.message}` };
  }

  revalidatePath("/admin/marhalah");
  revalidatePath("/admin/dashboard");
  return { ok: true, message: "Marhalah berhasil diperbarui." };
}

export async function softDeleteMarhalahAction(id: string): Promise<ActionResult> {
  if (!(await verifyAdmin())) {
    return { ok: false, message: "Akses ditolak: Hanya administrator yang berwenang." };
  }

  const adminClient = createAdminClient();
  // Soft delete: update deleted_at
  const { error } = await adminClient
    .from("marhalah")
    .update({
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    return { ok: false, message: `Gagal menghapus marhalah: ${error.message}` };
  }

  revalidatePath("/admin/marhalah");
  revalidatePath("/admin/dashboard");
  return { ok: true, message: "Marhalah berhasil dihapus (soft delete)." };
}

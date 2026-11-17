"use server";

import { revalidatePath } from "next/cache";
import { getEffectiveContext } from "@/lib/auth/context";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  createGuruSchema,
  updateGuruSchema,
  setWaliKelasSchema,
  setPengampuSchema,
  type CreateGuruFormValues,
  type UpdateGuruFormValues,
  type SetWaliKelasFormValues,
  type SetPengampuFormValues,
} from "@/lib/validations/guru";

export interface CreateGuruResult {
  ok: boolean;
  message: string;
  temporaryPassword?: string;
  nama?: string;
  email?: string;
}

export interface ActionResult {
  ok: boolean;
  message: string;
}

async function verifyAdmin(): Promise<boolean> {
  const context = await getEffectiveContext();
  return Boolean(context.user && context.profile?.role === "admin");
}

function generateRandomPassword(): string {
  const chars = "abcdefghjkmnpqrstuvwxyz23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  let result = "zm_";
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// ==============================================================================
// 1. MANAJEMEN AKUN GURU
// ==============================================================================
export async function createGuruAccountAction(
  data: CreateGuruFormValues
): Promise<CreateGuruResult> {
  if (!(await verifyAdmin())) {
    return { ok: false, message: "Akses ditolak: Hanya administrator yang berwenang." };
  }

  const parsed = createGuruSchema.safeParse(data);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Validasi data gagal." };
  }

  const temporaryPassword =
    parsed.data.password && parsed.data.password.length >= 6
      ? parsed.data.password
      : generateRandomPassword();

  const adminClient = createAdminClient();

  // 1. Buat user di auth.users lewat Supabase Admin API
  const { data: authUser, error: authErr } = await adminClient.auth.admin.createUser({
    email: parsed.data.email,
    password: temporaryPassword,
    email_confirm: true,
    user_metadata: {
      nama: parsed.data.nama,
      role: "guru",
    },
  });

  if (authErr || !authUser?.user) {
    return {
      ok: false,
      message: `Gagal membuat akun auth guru: ${authErr?.message ?? "Terjadi kesalahan"}`,
    };
  }

  // 2. Buat profil di tabel public.profiles
  const { error: profileErr } = await adminClient.from("profiles").upsert({
    id: authUser.user.id,
    nama: parsed.data.nama,
    role: "guru",
    aktif: true,
  });

  if (profileErr) {
    return {
      ok: false,
      message: `Akun auth berhasil dibuat, namun gagal menyimpan profil: ${profileErr.message}`,
    };
  }

  revalidatePath("/admin/guru");
  return {
    ok: true,
    message: "Akun guru baru berhasil dibuat.",
    temporaryPassword,
    nama: parsed.data.nama,
    email: parsed.data.email,
  };
}

export async function updateGuruAction(
  id: string,
  data: UpdateGuruFormValues
): Promise<ActionResult> {
  if (!(await verifyAdmin())) {
    return { ok: false, message: "Akses ditolak: Hanya administrator yang berwenang." };
  }

  const parsed = updateGuruSchema.safeParse(data);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Validasi data gagal." };
  }

  const adminClient = createAdminClient();

  // Update profil
  const { error: profileErr } = await adminClient
    .from("profiles")
    .update({
      nama: parsed.data.nama,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (profileErr) {
    return { ok: false, message: `Gagal memperbarui profil guru: ${profileErr.message}` };
  }

  // Sinkronkan metadata di auth
  await adminClient.auth.admin.updateUserById(id, {
    user_metadata: {
      nama: parsed.data.nama,
    },
  });

  revalidatePath("/admin/guru");
  return { ok: true, message: "Data guru berhasil diperbarui." };
}

export async function setAktifGuruAction(id: string, aktif: boolean): Promise<ActionResult> {
  if (!(await verifyAdmin())) {
    return { ok: false, message: "Akses ditolak: Hanya administrator yang berwenang." };
  }

  const adminClient = createAdminClient();
  const { error } = await adminClient
    .from("profiles")
    .update({
      aktif,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    return {
      ok: false,
      message: `Gagal ${aktif ? "mengaktifkan" : "menonaktifkan"} guru: ${error.message}`,
    };
  }

  revalidatePath("/admin/guru");
  return {
    ok: true,
    message: `Akun guru berhasil ${aktif ? "diaktifkan" : "dinonaktifkan"}.`,
  };
}

// ==============================================================================
// 2. PENUGASAN WALI KELAS (GURU_MARHALAH)
// ==============================================================================
export async function setWaliKelasAction(data: SetWaliKelasFormValues): Promise<ActionResult> {
  if (!(await verifyAdmin())) {
    return { ok: false, message: "Akses ditolak: Hanya administrator yang berwenang." };
  }

  const parsed = setWaliKelasSchema.safeParse(data);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Validasi data gagal." };
  }

  const { marhalah_id, tahun_ajaran_id, guru_id } = parsed.data;
  const adminClient = createAdminClient();

  // Jika guru_id dikosongkan, hapus penugasan wali kelas
  if (!guru_id) {
    const { error: delErr } = await adminClient
      .from("guru_marhalah")
      .delete()
      .eq("marhalah_id", marhalah_id)
      .eq("tahun_ajaran_id", tahun_ajaran_id);

    if (delErr) {
      return { ok: false, message: `Gagal mengosongkan wali kelas: ${delErr.message}` };
    }

    revalidatePath("/admin/guru");
    return { ok: true, message: "Penugasan wali kelas berhasil dikosongkan." };
  }

  // Cek apakah sudah ada penugasan wali kelas di marhalah & TA ini
  const { data: existing } = await adminClient
    .from("guru_marhalah")
    .select("id")
    .eq("marhalah_id", marhalah_id)
    .eq("tahun_ajaran_id", tahun_ajaran_id)
    .maybeSingle();

  if (existing) {
    // Update
    const { error: updErr } = await adminClient
      .from("guru_marhalah")
      .update({
        guru_id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);

    if (updErr) {
      return { ok: false, message: `Gagal memperbarui wali kelas: ${updErr.message}` };
    }
  } else {
    // Insert baru
    const { error: insErr } = await adminClient.from("guru_marhalah").insert({
      guru_id,
      marhalah_id,
      tahun_ajaran_id,
    });

    if (insErr) {
      return { ok: false, message: `Gagal menugaskan wali kelas: ${insErr.message}` };
    }
  }

  revalidatePath("/admin/guru");
  return { ok: true, message: "Wali kelas berhasil ditugaskan." };
}

// ==============================================================================
// 3. PENUGASAN PENGAMPU MATA PELAJARAN (PENGAMPU)
// ==============================================================================
export async function setPengampuAction(data: SetPengampuFormValues): Promise<ActionResult> {
  if (!(await verifyAdmin())) {
    return { ok: false, message: "Akses ditolak: Hanya administrator yang berwenang." };
  }

  const parsed = setPengampuSchema.safeParse(data);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Validasi data gagal." };
  }

  const { marhalah_mapel_id, guru_id } = parsed.data;
  const adminClient = createAdminClient();

  // Jika guru_id dikosongkan, hapus pengampu
  if (!guru_id) {
    const { error: delErr } = await adminClient
      .from("pengampu")
      .delete()
      .eq("marhalah_mapel_id", marhalah_mapel_id);

    if (delErr) {
      return { ok: false, message: `Gagal mengosongkan guru pengampu: ${delErr.message}` };
    }

    revalidatePath("/admin/guru");
    return { ok: true, message: "Penugasan guru pengampu berhasil dikosongkan." };
  }

  // Cek apakah sudah ada pengampu di mapel ini
  const { data: existing } = await adminClient
    .from("pengampu")
    .select("id")
    .eq("marhalah_mapel_id", marhalah_mapel_id)
    .maybeSingle();

  if (existing) {
    // Update
    const { error: updErr } = await adminClient
      .from("pengampu")
      .update({
        guru_id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);

    if (updErr) {
      return { ok: false, message: `Gagal memperbarui guru pengampu: ${updErr.message}` };
    }
  } else {
    // Insert baru
    const { error: insErr } = await adminClient.from("pengampu").insert({
      guru_id,
      marhalah_mapel_id,
    });

    if (insErr) {
      return { ok: false, message: `Gagal menugaskan guru pengampu: ${insErr.message}` };
    }
  }

  revalidatePath("/admin/guru");
  return { ok: true, message: "Guru pengampu berhasil ditugaskan." };
}

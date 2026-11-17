"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export interface ActionResult {
  ok: boolean;
  message: string;
  redirectTo?: string;
}

export async function loginAction(formData: FormData): Promise<ActionResult> {
  const email = formData.get("email")?.toString().trim();
  const password = formData.get("password")?.toString();

  if (!email || !password) {
    return { ok: false, message: "Email dan password wajib diisi." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) {
    return { ok: false, message: "Email atau kata sandi tidak valid." };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, aktif")
    .eq("id", data.user.id)
    .single();

  if (profileError || !profile) {
    await supabase.auth.signOut();
    return { ok: false, message: "Profil pengguna tidak ditemukan di sistem." };
  }

  if (!profile.aktif) {
    await supabase.auth.signOut();
    return { ok: false, message: "Akun Anda telah dinonaktifkan. Hubungi admin lembaga." };
  }

  revalidatePath("/", "layout");

  const target = profile.role === "admin" ? "/admin/dashboard" : "/guru/dashboard";
  return {
    ok: true,
    message: "Login berhasil. Selamat datang kembali!",
    redirectTo: target,
  };
}

export async function logoutAction(): Promise<ActionResult> {
  const supabase = await createClient();
  await supabase.auth.signOut();

  const cookieStore = await cookies();
  cookieStore.delete("acting_as");

  revalidatePath("/", "layout");
  return {
    ok: true,
    message: "Anda telah keluar dari aplikasi.",
    redirectTo: "/login",
  };
}

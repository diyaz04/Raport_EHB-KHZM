"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { getEffectiveContext } from "@/lib/auth/context";
import { createAdminClient } from "@/lib/supabase/admin";

export async function startActAsAction(guruId: string): Promise<{ ok: boolean; message: string }> {
  const context = await getEffectiveContext();

  if (!context.user || context.profile?.role !== "admin") {
    return { ok: false, message: "Akses ditolak: Hanya admin yang dapat bertindak sebagai guru." };
  }

  const adminClient = createAdminClient();
  const { data: guru, error } = await adminClient
    .from("profiles")
    .select("id, nama, role, aktif")
    .eq("id", guruId)
    .eq("role", "guru")
    .single();

  if (error || !guru) {
    return { ok: false, message: "Guru tujuan tidak ditemukan atau tidak valid." };
  }

  if (!guru.aktif) {
    return { ok: false, message: "Akun guru tersebut sedang tidak aktif." };
  }

  const cookieStore = await cookies();
  cookieStore.set("acting_as", guruId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8,
  });

  revalidatePath("/", "layout");
  return { ok: true, message: `Berhasil beralih mode. Anda sedang bertindak sebagai ${guru.nama}.` };
}

export async function stopActAsAction(): Promise<{ ok: boolean; message: string }> {
  const cookieStore = await cookies();
  cookieStore.delete("acting_as");

  revalidatePath("/", "layout");
  return { ok: true, message: "Berhasil keluar dari mode bertindak sebagai guru." };
}

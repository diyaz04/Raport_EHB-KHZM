"use server";

import { revalidatePath } from "next/cache";
import { getEffectiveContext } from "@/lib/auth/context";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  mapelSchema,
  kitabSchema,
  marhalahMapelSchema,
  salinKurikulumSchema,
  type MapelFormValues,
  type KitabFormValues,
  type MarhalahMapelFormValues,
  type SalinKurikulumFormValues,
} from "@/lib/validations/kurikulum";

export interface ActionResult {
  ok: boolean;
  message: string;
}

async function verifyAdmin(): Promise<boolean> {
  const context = await getEffectiveContext();
  return Boolean(context.user && context.profile?.role === "admin");
}

// ==============================================================================
// 1. MAPEL (MATA PELAJARAN) ACTIONS
// ==============================================================================
export async function createMapelAction(data: MapelFormValues): Promise<ActionResult> {
  if (!(await verifyAdmin())) {
    return { ok: false, message: "Akses ditolak: Hanya administrator yang berwenang." };
  }

  const parsed = mapelSchema.safeParse(data);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Validasi gagal." };
  }

  const adminClient = createAdminClient();
  const { error } = await adminClient.from("mapel").insert({
    nama: parsed.data.nama,
  });

  if (error) {
    return { ok: false, message: `Gagal menambah mata pelajaran: ${error.message}` };
  }

  revalidatePath("/admin/mapel");
  revalidatePath("/admin/kurikulum");
  return { ok: true, message: "Mata pelajaran berhasil ditambahkan." };
}

export async function updateMapelAction(id: string, data: MapelFormValues): Promise<ActionResult> {
  if (!(await verifyAdmin())) {
    return { ok: false, message: "Akses ditolak: Hanya administrator yang berwenang." };
  }

  const parsed = mapelSchema.safeParse(data);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Validasi gagal." };
  }

  const adminClient = createAdminClient();
  const { error } = await adminClient
    .from("mapel")
    .update({
      nama: parsed.data.nama,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    return { ok: false, message: `Gagal memperbarui mata pelajaran: ${error.message}` };
  }

  revalidatePath("/admin/mapel");
  revalidatePath("/admin/kurikulum");
  return { ok: true, message: "Mata pelajaran berhasil diperbarui." };
}

export async function deleteMapelAction(id: string): Promise<ActionResult> {
  if (!(await verifyAdmin())) {
    return { ok: false, message: "Akses ditolak: Hanya administrator yang berwenang." };
  }

  const adminClient = createAdminClient();

  // Periksa apakah mapel masih dipakai di marhalah_mapel
  const { count } = await adminClient
    .from("marhalah_mapel")
    .select("id", { count: "exact", head: true })
    .eq("mapel_id", id);

  if (count && count > 0) {
    return {
      ok: false,
      message: `Tidak dapat menghapus mata pelajaran karena masih digunakan pada ${count} konfigurasi kurikulum marhalah.`,
    };
  }

  const { error } = await adminClient.from("mapel").delete().eq("id", id);
  if (error) {
    return { ok: false, message: `Gagal menghapus mata pelajaran: ${error.message}` };
  }

  revalidatePath("/admin/mapel");
  revalidatePath("/admin/kurikulum");
  return { ok: true, message: "Mata pelajaran berhasil dihapus." };
}

// ==============================================================================
// 2. KITAB ACTIONS
// ==============================================================================
export async function createKitabAction(data: KitabFormValues): Promise<ActionResult> {
  if (!(await verifyAdmin())) {
    return { ok: false, message: "Akses ditolak: Hanya administrator yang berwenang." };
  }

  const parsed = kitabSchema.safeParse(data);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Validasi gagal." };
  }

  const adminClient = createAdminClient();
  const { error } = await adminClient.from("kitab").insert({
    nama: parsed.data.nama,
  });

  if (error) {
    return { ok: false, message: `Gagal menambah kitab: ${error.message}` };
  }

  revalidatePath("/admin/kitab");
  revalidatePath("/admin/kurikulum");
  return { ok: true, message: "Kitab berhasil ditambahkan." };
}

export async function updateKitabAction(id: string, data: KitabFormValues): Promise<ActionResult> {
  if (!(await verifyAdmin())) {
    return { ok: false, message: "Akses ditolak: Hanya administrator yang berwenang." };
  }

  const parsed = kitabSchema.safeParse(data);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Validasi gagal." };
  }

  const adminClient = createAdminClient();
  const { error } = await adminClient
    .from("kitab")
    .update({
      nama: parsed.data.nama,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    return { ok: false, message: `Gagal memperbarui kitab: ${error.message}` };
  }

  revalidatePath("/admin/kitab");
  revalidatePath("/admin/kurikulum");
  return { ok: true, message: "Kitab berhasil diperbarui." };
}

export async function deleteKitabAction(id: string): Promise<ActionResult> {
  if (!(await verifyAdmin())) {
    return { ok: false, message: "Akses ditolak: Hanya administrator yang berwenang." };
  }

  const adminClient = createAdminClient();
  const { error } = await adminClient.from("kitab").delete().eq("id", id);
  if (error) {
    return { ok: false, message: `Gagal menghapus kitab: ${error.message}` };
  }

  revalidatePath("/admin/kitab");
  revalidatePath("/admin/kurikulum");
  return { ok: true, message: "Kitab berhasil dihapus." };
}

// ==============================================================================
// 3. MARHALAH_MAPEL (KONFIGURASI PER MARHALAH + SEMESTER)
// ==============================================================================
export async function createMarhalahMapelAction(
  data: MarhalahMapelFormValues
): Promise<ActionResult> {
  if (!(await verifyAdmin())) {
    return { ok: false, message: "Akses ditolak: Hanya administrator yang berwenang." };
  }

  const parsed = marhalahMapelSchema.safeParse(data);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Validasi gagal." };
  }

  const adminClient = createAdminClient();

  // Hitung jumlah baris yang sudah ada
  const { data: existingRows, error: fetchErr } = await adminClient
    .from("marhalah_mapel")
    .select("id, mapel_id, urutan")
    .eq("marhalah_id", parsed.data.marhalah_id)
    .eq("semester_id", parsed.data.semester_id);

  if (fetchErr) {
    return { ok: false, message: `Gagal memeriksa kuota mapel: ${fetchErr.message}` };
  }

  if (existingRows && existingRows.length >= 12) {
    return {
      ok: false,
      message: "Batas tercapai: Maksimal 12 mata pelajaran per marhalah dalam satu semester.",
    };
  }

  // Periksa apakah mapel sudah terdaftar
  const isDuplicate = existingRows?.some((r) => r.mapel_id === parsed.data.mapel_id);
  if (isDuplicate) {
    return {
      ok: false,
      message: "Mata pelajaran ini sudah ada dalam daftar kurikulum marhalah dan semester ini.",
    };
  }

  // Tentukan urutan berikutnya (antara 1 - 12)
  const existingUrutans = existingRows?.map((r) => r.urutan) ?? [];
  let nextUrutan = 1;
  for (let i = 1; i <= 12; i++) {
    if (!existingUrutans.includes(i)) {
      nextUrutan = i;
      break;
    }
  }

  const { error } = await adminClient.from("marhalah_mapel").insert({
    marhalah_id: parsed.data.marhalah_id,
    semester_id: parsed.data.semester_id,
    mapel_id: parsed.data.mapel_id,
    kitab_id: parsed.data.kitab_id || null,
    urutan: nextUrutan,
    tipe: parsed.data.tipe,
    dihitung_total: parsed.data.tipe === "kelengkapan" ? false : parsed.data.dihitung_total,
  });

  if (error) {
    return { ok: false, message: `Gagal menambahkan kurikulum: ${error.message}` };
  }

  revalidatePath("/admin/kurikulum");
  return { ok: true, message: "Mata pelajaran berhasil ditambahkan ke kurikulum." };
}

export async function updateMarhalahMapelAction(
  id: string,
  data: {
    mapel_id: string;
    kitab_id?: string | null;
    tipe: "nilai" | "kelengkapan";
    dihitung_total: boolean;
  }
): Promise<ActionResult> {
  if (!(await verifyAdmin())) {
    return { ok: false, message: "Akses ditolak: Hanya administrator yang berwenang." };
  }

  const adminClient = createAdminClient();
  const { error } = await adminClient
    .from("marhalah_mapel")
    .update({
      mapel_id: data.mapel_id,
      kitab_id: data.kitab_id || null,
      tipe: data.tipe,
      dihitung_total: data.tipe === "kelengkapan" ? false : data.dihitung_total,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    return { ok: false, message: `Gagal memperbarui konfigurasi mapel: ${error.message}` };
  }

  revalidatePath("/admin/kurikulum");
  return { ok: true, message: "Konfigurasi mapel berhasil diperbarui." };
}

export async function deleteMarhalahMapelAction(
  id: string,
  marhalah_id: string,
  semester_id: string
): Promise<ActionResult> {
  if (!(await verifyAdmin())) {
    return { ok: false, message: "Akses ditolak: Hanya administrator yang berwenang." };
  }

  const adminClient = createAdminClient();

  // Periksa apakah nilai sudah terisi untuk marhalah_mapel ini
  const { count: countNilai } = await adminClient
    .from("nilai")
    .select("id", { count: "exact", head: true })
    .eq("marhalah_mapel_id", id);

  if (countNilai && countNilai > 0) {
    return {
      ok: false,
      message: `Tidak dapat menghapus mapel ini dari kurikulum karena sudah memiliki ${countNilai} data nilai santri terinput.`,
    };
  }

  const { error: delError } = await adminClient.from("marhalah_mapel").delete().eq("id", id);
  if (delError) {
    return { ok: false, message: `Gagal menghapus mapel dari kurikulum: ${delError.message}` };
  }

  // Rapikan urutan yang tersisa agar tetap berurutan 1..N
  const { data: remaining } = await adminClient
    .from("marhalah_mapel")
    .select("id, urutan")
    .eq("marhalah_id", marhalah_id)
    .eq("semester_id", semester_id)
    .order("urutan", { ascending: true });

  if (remaining && remaining.length > 0) {
    for (let i = 0; i < remaining.length; i++) {
      const targetUrutan = i + 1;
      if (remaining[i].urutan !== targetUrutan) {
        await adminClient
          .from("marhalah_mapel")
          .update({ urutan: targetUrutan })
          .eq("id", remaining[i].id);
      }
    }
  }

  revalidatePath("/admin/kurikulum");
  return { ok: true, message: "Mata pelajaran berhasil dihapus dari kurikulum marhalah." };
}

export async function moveMarhalahMapelAction(
  id: string,
  direction: "up" | "down",
  marhalah_id: string,
  semester_id: string
): Promise<ActionResult> {
  if (!(await verifyAdmin())) {
    return { ok: false, message: "Akses ditolak: Hanya administrator yang berwenang." };
  }

  const adminClient = createAdminClient();

  const { data: items, error } = await adminClient
    .from("marhalah_mapel")
    .select("id, urutan")
    .eq("marhalah_id", marhalah_id)
    .eq("semester_id", semester_id)
    .order("urutan", { ascending: true });

  if (error || !items) {
    return { ok: false, message: "Gagal mengambil daftar urutan kurikulum." };
  }

  const currentIndex = items.findIndex((item) => item.id === id);
  if (currentIndex === -1) {
    return { ok: false, message: "Mata pelajaran tidak ditemukan." };
  }

  const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
  if (targetIndex < 0 || targetIndex >= items.length) {
    return { ok: true, message: "Urutan sudah berada di posisi paling ujung." };
  }

  const currentItem = items[currentIndex];
  const targetItem = items[targetIndex];

  // Cari slot urutan kosong antara 1 dan 12 jika count < 12
  const usedSlots = items.map((i) => i.urutan);
  const freeSlot = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].find((s) => !usedSlots.includes(s));

  if (freeSlot) {
    // Geser via slot kosong untuk menghindari tabrakan unique constraint
    await adminClient.from("marhalah_mapel").update({ urutan: freeSlot }).eq("id", currentItem.id);
    await adminClient.from("marhalah_mapel").update({ urutan: currentItem.urutan }).eq("id", targetItem.id);
    await adminClient.from("marhalah_mapel").update({ urutan: targetItem.urutan }).eq("id", currentItem.id);
  } else {
    // Jika semua 12 slot terisi, swap berurutan
    // Kita update satu per satu
    await adminClient
      .from("marhalah_mapel")
      .update({ urutan: targetItem.urutan, updated_at: new Date().toISOString() })
      .eq("id", currentItem.id);
    await adminClient
      .from("marhalah_mapel")
      .update({ urutan: currentItem.urutan, updated_at: new Date().toISOString() })
      .eq("id", targetItem.id);
  }

  revalidatePath("/admin/kurikulum");
  return { ok: true, message: `Urutan berhasil dipindah ke ${direction === "up" ? "atas" : "bawah"}.` };
}

// ==============================================================================
// 4. SALIN KURIKULUM DARI SEMESTER LAIN
// ==============================================================================
export async function salinKurikulumAction(data: SalinKurikulumFormValues): Promise<ActionResult> {
  if (!(await verifyAdmin())) {
    return { ok: false, message: "Akses ditolak: Hanya administrator yang berwenang." };
  }

  const parsed = salinKurikulumSchema.safeParse(data);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Validasi data gagal." };
  }

  const { marhalah_id, sumber_semester_id, target_semester_id, konfirmasi_timpa } = parsed.data;

  if (sumber_semester_id === target_semester_id) {
    return { ok: false, message: "Semester sumber dan target tidak boleh sama." };
  }

  const adminClient = createAdminClient();

  // Ambil data kurikulum sumber
  const { data: sumberItems, error: srcErr } = await adminClient
    .from("marhalah_mapel")
    .select("mapel_id, kitab_id, urutan, tipe, dihitung_total")
    .eq("marhalah_id", marhalah_id)
    .eq("semester_id", sumber_semester_id)
    .order("urutan", { ascending: true });

  if (srcErr || !sumberItems || sumberItems.length === 0) {
    return {
      ok: false,
      message: "Tidak ada data mata pelajaran pada semester sumber untuk marhalah ini.",
    };
  }

  // Cek apakah target sudah memiliki data
  const { data: targetItems } = await adminClient
    .from("marhalah_mapel")
    .select("id")
    .eq("marhalah_id", marhalah_id)
    .eq("semester_id", target_semester_id);

  if (targetItems && targetItems.length > 0 && !konfirmasi_timpa) {
    return {
      ok: false,
      message: `Semester target sudah memiliki ${targetItems.length} mata pelajaran. Mohon centang konfirmasi penimpaan data sebelum menyalin.`,
    };
  }

  // Jika target sudah ada data dan konfirmasi aktif, hapus data lama di target
  if (targetItems && targetItems.length > 0) {
    const { error: delErr } = await adminClient
      .from("marhalah_mapel")
      .delete()
      .eq("marhalah_id", marhalah_id)
      .eq("semester_id", target_semester_id);

    if (delErr) {
      return { ok: false, message: `Gagal menghapus kurikulum lama di target: ${delErr.message}` };
    }
  }

  // Salin baris ke target
  const newRows = sumberItems.map((item) => ({
    marhalah_id,
    semester_id: target_semester_id,
    mapel_id: item.mapel_id,
    kitab_id: item.kitab_id,
    urutan: item.urutan,
    tipe: item.tipe,
    dihitung_total: item.dihitung_total,
  }));

  const { error: insErr } = await adminClient.from("marhalah_mapel").insert(newRows);
  if (insErr) {
    return { ok: false, message: `Gagal menyalin kurikulum: ${insErr.message}` };
  }

  revalidatePath("/admin/kurikulum");
  return {
    ok: true,
    message: `Berhasil menyalin ${newRows.length} mata pelajaran dari semester sumber ke semester target.`,
  };
}

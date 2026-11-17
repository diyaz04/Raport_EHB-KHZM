"use server";

import { revalidatePath } from "next/cache";
import { getEffectiveContext } from "@/lib/auth/context";
import { createAdminClient } from "@/lib/supabase/admin";

export interface ImportSantriRow {
  nis?: string | null;
  nama: string;
  jenis_kelamin: "L" | "P";
  marhalah_id?: string | null;
}

export interface ImportResult {
  ok: boolean;
  message: string;
  importedCount?: number;
  enrolledCount?: number;
  skippedCount?: number;
}

async function verifyAdmin(): Promise<boolean> {
  const context = await getEffectiveContext();
  return Boolean(context.user && context.profile?.role === "admin");
}

export async function importSantriMassalAction(
  tahun_ajaran_id: string,
  rows: ImportSantriRow[]
): Promise<ImportResult> {
  if (!(await verifyAdmin())) {
    return { ok: false, message: "Akses ditolak: Hanya administrator yang berwenang." };
  }

  if (!rows || rows.length === 0) {
    return { ok: false, message: "Tidak ada data santri valid yang dikirim untuk diimpor." };
  }

  const adminClient = createAdminClient();

  // Ambil semua NIS yang sudah ada di database untuk mencegah tabrakan unique constraint
  const { data: existingSantri } = await adminClient
    .from("santri")
    .select("nis")
    .not("nis", "is", null);

  const existingNisSet = new Set<string>();
  if (existingSantri) {
    existingSantri.forEach((s) => {
      if (s.nis) existingNisSet.add(s.nis.trim().toLowerCase());
    });
  }

  let importedCount = 0;
  let enrolledCount = 0;
  let skippedCount = 0;

  for (const row of rows) {
    const cleanNama = row.nama?.trim();
    if (!cleanNama) {
      skippedCount++;
      continue;
    }

    const cleanNis = row.nis && row.nis.trim().length > 0 ? row.nis.trim() : null;

    // Cek jika NIS duplikat di DB
    if (cleanNis && existingNisSet.has(cleanNis.toLowerCase())) {
      skippedCount++;
      continue;
    }

    // Insert Santri
    const { data: newSantri, error: insErr } = await adminClient
      .from("santri")
      .insert({
        nama: cleanNama,
        nis: cleanNis,
        jenis_kelamin: row.jenis_kelamin,
        deleted_at: null,
      })
      .select("id")
      .single();

    if (insErr || !newSantri) {
      skippedCount++;
      continue;
    }

    importedCount++;
    if (cleanNis) {
      existingNisSet.add(cleanNis.toLowerCase());
    }

    // Insert Enrollment jika marhalah_id & tahun_ajaran_id valid
    if (row.marhalah_id && tahun_ajaran_id) {
      const { error: enrollErr } = await adminClient.from("enrollment").insert({
        santri_id: newSantri.id,
        marhalah_id: row.marhalah_id,
        tahun_ajaran_id: tahun_ajaran_id,
      });

      if (!enrollErr) {
        enrolledCount++;
      }
    }
  }

  revalidatePath("/admin/santri");
  return {
    ok: true,
    message: `Import selesai: Berhasil mengimpor ${importedCount} santri (${enrolledCount} langsung ditempatkan ke kelas). ${
      skippedCount > 0 ? `${skippedCount} baris dilewati.` : ""
    }`,
    importedCount,
    enrolledCount,
    skippedCount,
  };
}

export async function naikKelasMassalAction(payload: {
  santri_ids: string[];
  tahun_ajaran_tujuan_id: string;
  marhalah_tujuan_id: string;
}): Promise<{ ok: boolean; message: string; count?: number }> {
  if (!(await verifyAdmin())) {
    return { ok: false, message: "Akses ditolak: Hanya administrator yang berwenang." };
  }

  const { santri_ids, tahun_ajaran_tujuan_id, marhalah_tujuan_id } = payload;

  if (!santri_ids || santri_ids.length === 0) {
    return { ok: false, message: "Tidak ada santri yang dipilih untuk dinaikkan kelas." };
  }

  const adminClient = createAdminClient();

  // Cek santri mana saja yang sudah memiliki enrollment di tahun ajaran tujuan
  const { data: existingEnrollments } = await adminClient
    .from("enrollment")
    .select("santri_id")
    .eq("tahun_ajaran_id", tahun_ajaran_tujuan_id)
    .in("santri_id", santri_ids);

  const existingSantriIds = new Set(existingEnrollments?.map((e) => e.santri_id) ?? []);

  // Filter hanya santri yang belum terdaftar di tahun ajaran tujuan
  const eligibleSantriIds = santri_ids.filter((id) => !existingSantriIds.has(id));

  if (eligibleSantriIds.length === 0) {
    return {
      ok: false,
      message: "Seluruh santri yang dipilih sudah terdaftar pada tahun ajaran tujuan tersebut.",
    };
  }

  const rowsToInsert = eligibleSantriIds.map((id) => ({
    santri_id: id,
    marhalah_id: marhalah_tujuan_id,
    tahun_ajaran_id: tahun_ajaran_tujuan_id,
  }));

  const { error: insErr } = await adminClient.from("enrollment").insert(rowsToInsert);

  if (insErr) {
    return { ok: false, message: `Gagal memproses naik kelas massal: ${insErr.message}` };
  }

  revalidatePath("/admin/santri");
  return {
    ok: true,
    message: `Berhasil menaikkan ${eligibleSantriIds.length} santri ke kelas marhalah tujuan!${
      existingSantriIds.size > 0
        ? ` (${existingSantriIds.size} santri dilewati karena sudah terdaftar di TA tujuan).`
        : ""
    }`,
    count: eligibleSantriIds.length,
  };
}

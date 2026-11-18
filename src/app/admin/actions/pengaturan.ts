"use server";

import { revalidatePath } from "next/cache";
import { getEffectiveContext } from "@/lib/auth/context";
import { createAdminClient } from "@/lib/supabase/admin";

export interface PengaturanLembagaData {
  id?: string;
  judul_lembaga: string;
  nama_lembaga: string;
  alamat_header: string;
  tempat_terbit: string;
  tanggal_raport: string;
  nama_pimpinan: string;
  domain_url?: string;
  logo_path?: string | null;
  updated_at?: string;
}

export interface PengaturanActionResult {
  ok: boolean;
  message: string;
  data?: PengaturanLembagaData;
}

async function verifyAdmin(): Promise<{
  isAdmin: boolean;
  userId?: string;
}> {
  const context = await getEffectiveContext();
  const isAdmin = Boolean(context.user && context.profile?.role === "admin");
  return { isAdmin, userId: context.user?.id };
}

/**
 * Mengambil konfigurasi Titimangsa & Profil Lembaga saat ini.
 */
export async function getPengaturanLembagaAction(): Promise<PengaturanActionResult> {
  try {
    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from("pengaturan_lembaga")
      .select("*")
      .limit(1)
      .maybeSingle();

    if (error) {
      return {
        ok: false,
        message: `Gagal memuat pengaturan: ${error.message}`,
      };
    }

    // Default nilai acuan resmi KH Zumratul Muttaqin
    const defaultData: PengaturanLembagaData = {
      judul_lembaga: "LEMBAGA PENDIDIKAN PONDOK PESANTREN",
      nama_lembaga: "KH ZUMRATUL MUTTAQIN",
      alamat_header: "SUKARAME TASIKMALAYA JAWA BARAT",
      tempat_terbit: "Sukamenak",
      tanggal_raport: "20 Desember 2025",
      nama_pimpinan: "KH. MIMIH SAEFUL MILLAH, S.Pd",
    };

    if (!data) {
      return {
        ok: true,
        message: "Memuat pengaturan default",
        data: defaultData,
      };
    }

    // Ekstraksi tanggal_raport dan domain_url dari row atau dari logo_path (JSON)
    let tanggalRaport = defaultData.tanggal_raport;
    let domainUrl = "";
    if ("tanggal_raport" in data && typeof (data as Record<string, unknown>).tanggal_raport === "string") {
      tanggalRaport = (data as Record<string, unknown>).tanggal_raport as string;
    }
    if (data.logo_path) {
      try {
        const parsed = JSON.parse(data.logo_path);
        if (parsed && typeof parsed.tanggal_raport === "string" && !("tanggal_raport" in data)) {
          tanggalRaport = parsed.tanggal_raport;
        }
        if (parsed && typeof parsed.domain_url === "string") {
          domainUrl = parsed.domain_url;
        }
      } catch {
        // logo_path bukan JSON
      }
    }

    return {
      ok: true,
      message: "Pengaturan berhasil dimuat",
      data: {
        id: data.id,
        judul_lembaga: data.judul_lembaga || defaultData.judul_lembaga,
        nama_lembaga: data.nama_lembaga || defaultData.nama_lembaga,
        alamat_header: data.alamat_header || defaultData.alamat_header,
        tempat_terbit: data.tempat_terbit || defaultData.tempat_terbit,
        tanggal_raport: tanggalRaport,
        nama_pimpinan: data.nama_pimpinan || defaultData.nama_pimpinan,
        domain_url: domainUrl,
        logo_path: data.logo_path,
        updated_at: data.updated_at,
      },
    };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : "Kesalahan sistem tidak terduga.",
    };
  }
}

/**
 * Memperbarui konfigurasi Titimangsa & Profil Lembaga (Hanya Administrator).
 */
export async function updatePengaturanLembagaAction(
  values: PengaturanLembagaData
): Promise<PengaturanActionResult> {
  const { isAdmin, userId } = await verifyAdmin();
  if (!isAdmin || !userId) {
    return {
      ok: false,
      message: "Akses ditolak: Hanya administrator yang berwenang mengubah konfigurasi.",
    };
  }

  // Validasi nilai wajib
  const tempatTerbit = (values.tempat_terbit || "").trim();
  const tanggalRaport = (values.tanggal_raport || "").trim();
  const namaPimpinan = (values.nama_pimpinan || "").trim();
  const namaLembaga = (values.nama_lembaga || "").trim();
  const judulLembaga = (values.judul_lembaga || "").trim();
  const alamatHeader = (values.alamat_header || "").trim();

  if (!tempatTerbit) {
    return { ok: false, message: "Tempat terbit (Titimangsa) tidak boleh kosong." };
  }
  if (!tanggalRaport) {
    return { ok: false, message: "Tanggal terbit raport tidak boleh kosong." };
  }
  if (!namaPimpinan) {
    return { ok: false, message: "Nama pimpinan pesantren tidak boleh kosong." };
  }
  if (!namaLembaga) {
    return { ok: false, message: "Nama lembaga tidak boleh kosong." };
  }

  const adminClient = createAdminClient();

  const domainUrl = (values.domain_url || "").trim().replace(/\/$/, "");

  // Simpan tanggal_raport dan domain_url ke metadata JSON di logo_path agar kompatibel tanpa alter table
  const metaJson = JSON.stringify({
    tanggal_raport: tanggalRaport,
    domain_url: domainUrl || undefined,
    updated_at: new Date().toISOString(),
  });

  const payload: Record<string, unknown> = {
    tempat_terbit: tempatTerbit,
    nama_pimpinan: namaPimpinan,
    nama_lembaga: namaLembaga,
    judul_lembaga: judulLembaga || "LEMBAGA PENDIDIKAN PONDOK PESANTREN",
    alamat_header: alamatHeader || "SUKARAME TASIKMALAYA JAWA BARAT",
    logo_path: metaJson,
    updated_at: new Date().toISOString(),
  };

  // Cek apakah sudah ada baris
  const { data: existing } = await adminClient
    .from("pengaturan_lembaga")
    .select("id")
    .limit(1)
    .maybeSingle();

  let targetId = existing?.id;

  if (targetId) {
    const { error: updErr } = await adminClient
      .from("pengaturan_lembaga")
      .update(payload)
      .eq("id", targetId);

    if (updErr) {
      return { ok: false, message: `Gagal memperbarui pengaturan: ${updErr.message}` };
    }
  } else {
    const { data: inserted, error: insErr } = await adminClient
      .from("pengaturan_lembaga")
      .insert(payload)
      .select("id")
      .single();

    if (insErr || !inserted) {
      return { ok: false, message: `Gagal membuat pengaturan baru: ${insErr?.message || "Error"}` };
    }
    targetId = inserted.id;
  }

  // Coba update kolom tanggal_raport secara langsung bila kolom sudah ditambahkan ke database
  try {
    await adminClient
      .from("pengaturan_lembaga")
      .update({ tanggal_raport: tanggalRaport })
      .eq("id", targetId);
  } catch {
    // Abaikan jika kolom tanggal_raport belum dibuat (karena sudah aman di logo_path metaJson)
  }

  // Catat ke audit log
  await adminClient.from("audit_log").insert({
    tabel: "pengaturan_lembaga",
    record_id: targetId,
    aksi: "UPDATE_TITIMANGSA",
    data_baru: {
      tempat_terbit: tempatTerbit,
      tanggal_raport: tanggalRaport,
      nama_pimpinan: namaPimpinan,
      nama_lembaga: namaLembaga,
    },
    mode: "admin_langsung",
    user_id: userId,
  });

  revalidatePath("/admin/pengaturan");
  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/semester");

  return {
    ok: true,
    message: "Konfigurasi Titimangsa & Lembaga berhasil disimpan!",
    data: {
      id: targetId,
      judul_lembaga: judulLembaga,
      nama_lembaga: namaLembaga,
      alamat_header: alamatHeader,
      tempat_terbit: tempatTerbit,
      tanggal_raport: tanggalRaport,
      nama_pimpinan: namaPimpinan,
      domain_url: domainUrl,
    },
  };
}

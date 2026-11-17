"use server";

import { getEffectiveContext } from "@/lib/auth/context";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateClassRaportPdfBuffer } from "@/lib/pdf/generator";

export interface CetakMassalActionResult {
  ok: boolean;
  message: string;
  totalSantri?: number;
  durationMs?: number;
  downloadUrl?: string;
  directUrl?: string;
  marhalahNama?: string;
  isStorageSaved?: boolean;
}

export async function generateClassRaportMassalAction({
  marhalahId,
  semesterId,
}: {
  marhalahId: string;
  semesterId: string;
}): Promise<CetakMassalActionResult> {
  const context = await getEffectiveContext();
  if (!context.user || !context.profile) {
    return {
      ok: false,
      message: "Sesi telah berakhir. Silakan login kembali.",
    };
  }

  const adminClient = createAdminClient();

  // 1. Ambil data semester
  const { data: semester, error: semErr } = await adminClient
    .from("semester")
    .select("tahun_ajaran_id")
    .eq("id", semesterId)
    .single();

  if (semErr || !semester) {
    return {
      ok: false,
      message: "Data semester tidak ditemukan.",
    };
  }

  // 2. Verifikasi hak akses: Admin atau Wali Kelas
  const isAdmin = context.profile.role === "admin";
  let isWaliKelas = false;

  const { data: waliRecord } = await adminClient
    .from("guru_marhalah")
    .select("guru_id")
    .eq("marhalah_id", marhalahId)
    .eq("tahun_ajaran_id", semester.tahun_ajaran_id)
    .maybeSingle();

  if (waliRecord) {
    isWaliKelas = waliRecord.guru_id === context.user.id;
  }

  if (!isAdmin && !isWaliKelas) {
    return {
      ok: false,
      message: "Anda tidak memiliki wewenang untuk mencetak raport kelas ini.",
    };
  }

  // 3. Bangkitkan PDF buffer kelas
  try {
    const {
      buffer,
      durationMs,
      totalSantri,
      marhalahNama,
      tahunAjaranNama,
      semesterJenis,
    } = await generateClassRaportPdfBuffer({
      marhalahId,
      semesterId,
    });

    const safeMarhalah = marhalahNama.replace(/[^a-zA-Z0-9_-]/g, "_");
    const safeTA = tahunAjaranNama.replace(/[^a-zA-Z0-9_-]/g, "_");
    const safeSem = semesterJenis.replace(/[^a-zA-Z0-9_-]/g, "_");
    const filename = `Raport_${safeMarhalah}_${safeTA}_${safeSem}.pdf`;

    let storageUrl: string | undefined = undefined;
    let isStorageSaved = false;

    // 4. Coba simpan ke Supabase Storage (bila batas serverless atau untuk arsip cloud)
    try {
      const storagePath = `kelas/${marhalahId}/${filename}`;
      const { error: uploadErr } = await adminClient.storage
        .from("raport")
        .upload(storagePath, buffer, {
          contentType: "application/pdf",
          upsert: true,
        });

      if (!uploadErr) {
        const { data: signedData } = await adminClient.storage
          .from("raport")
          .createSignedUrl(storagePath, 60 * 60); // 1 jam masa berlaku

        if (signedData?.signedUrl) {
          storageUrl = signedData.signedUrl;
          isStorageSaved = true;
        }
      }
    } catch {
      // Jika Storage bucket belum dibuat atau storage mock, lanjut dengan directUrl
      isStorageSaved = false;
    }

    const directUrl = `/api/raport/cetak-massal?marhalahId=${encodeURIComponent(
      marhalahId
    )}&semesterId=${encodeURIComponent(semesterId)}`;

    // 5. Catat ke audit_log
    await adminClient.from("audit_log").insert({
      tabel: "raport_terbit",
      record_id: marhalahId,
      aksi: "CETAK_MASSAL_ACTION",
      perubahan: {
        marhalahId,
        semesterId,
        totalSantri,
        durationMs,
        isStorageSaved,
        mode: context.isActingAs ? "act_as" : "asli",
        atas_nama: context.effectiveGuruId ?? null,
      },
      user_id: context.user.id,
      atas_nama: context.effectiveGuruId ?? null,
    });

    return {
      ok: true,
      message: `Berhasil mencetak raport massal untuk ${totalSantri} santri (${durationMs} ms).`,
      totalSantri,
      durationMs,
      downloadUrl: storageUrl || directUrl,
      directUrl,
      marhalahNama,
      isStorageSaved,
    };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : "Gagal memproses cetak raport massal.",
    };
  }
}

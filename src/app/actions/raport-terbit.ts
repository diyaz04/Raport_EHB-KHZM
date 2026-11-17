"use server";

import { getEffectiveContext } from "@/lib/auth/context";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  generateSecureVerificationCode,
  generateRaportHMAC,
} from "@/lib/crypto/raport-hash";
import { generateVerificationQRCode } from "@/lib/qr/generate-qr";

export interface RaportTerbitResult {
  ok: boolean;
  message?: string;
  isFinal: boolean;
  published: boolean;
  status: "draft" | "valid" | "digantikan" | "dicabut";
  versi?: number;
  kodeVerifikasi?: string;
  qrDataUrl?: string;
  diterbitkanPada?: string;
  snapshot?: Record<string, unknown>;
}

/**
 * Mengambil arsip raport_terbit yang valid atau menerbitkan arsip baru jika raport sudah final.
 * - Jika status masih draft: TIDAK menerbitkan dan TIDAK membangkitkan QR code.
 * - Jika status final dan belum ada raport_terbit: membuat baris baru raport_terbit versi 1.
 * - Jika forceNewVersion = true: menandai versi lama sebagai 'digantikan' dan membuat baris baru versi N+1.
 */
export async function getOrPublishRaportAction({
  enrollmentId,
  semesterId,
  forceNewVersion = false,
}: {
  enrollmentId: string;
  semesterId: string;
  forceNewVersion?: boolean;
}): Promise<RaportTerbitResult> {
  const context = await getEffectiveContext();
  if (!context.user || !context.profile) {
    return {
      ok: false,
      message: "Sesi telah berakhir. Silakan login kembali.",
      isFinal: false,
      published: false,
      status: "draft",
    };
  }

  const adminClient = createAdminClient();

  // 1. Ambil data enrollment, santri, dan marhalah
  const { data: enrollment, error: enrollErr } = await adminClient
    .from("enrollment")
    .select(
      `
      id,
      marhalah_id,
      tahun_ajaran_id,
      santri:santri_id (
        id,
        nis,
        nama,
        jenis_kelamin,
        tempat_lahir,
        tanggal_lahir,
        nama_wali
      ),
      marhalah:marhalah_id (
        id,
        nama
      ),
      tahun_ajaran:tahun_ajaran_id (
        id,
        nama
      )
    `
    )
    .eq("id", enrollmentId)
    .single();

  if (enrollErr || !enrollment) {
    return {
      ok: false,
      message: "Data pendaftaran santri (enrollment) tidak ditemukan.",
      isFinal: false,
      published: false,
      status: "draft",
    };
  }

  const marhalahId = enrollment.marhalah_id;
  const tahunAjaranId = enrollment.tahun_ajaran_id;

  // 2. Ambil data semester
  const { data: semester, error: semErr } = await adminClient
    .from("semester")
    .select("id, jenis, tahun_ajaran_id")
    .eq("id", semesterId)
    .single();

  if (semErr || !semester) {
    return {
      ok: false,
      message: "Data semester tidak ditemukan.",
      isFinal: false,
      published: false,
      status: "draft",
    };
  }

  // 3. Verifikasi wewenang: Admin atau Wali Kelas marhalah bersangkutan
  const isAdmin = context.profile.role === "admin";
  let isWaliKelas = false;
  let waliKelasNama = "-";

  const { data: waliRecord } = await adminClient
    .from("guru_marhalah")
    .select("guru_id, guru:guru_id (id, nama)")
    .eq("marhalah_id", marhalahId)
    .eq("tahun_ajaran_id", tahunAjaranId)
    .maybeSingle();

  if (waliRecord) {
    isWaliKelas = waliRecord.guru_id === context.user.id;
    if (waliRecord.guru && typeof waliRecord.guru === "object" && "nama" in waliRecord.guru) {
      waliKelasNama = (waliRecord.guru as { nama: string }).nama;
    }
  }

  if (!isAdmin && !isWaliKelas) {
    return {
      ok: false,
      message: "Anda tidak memiliki wewenang untuk menerbitkan raport kelas ini.",
      isFinal: false,
      published: false,
      status: "draft",
    };
  }

  // 4. Periksa status_raport marhalah pada semester ini
  const { data: statusRaport } = await adminClient
    .from("status_raport")
    .select("status, difinalisasi_pada")
    .eq("marhalah_id", marhalahId)
    .eq("semester_id", semesterId)
    .maybeSingle();

  const isFinal = statusRaport?.status === "final";

  // JIKA MASIH DRAFT: Raport DRAFT TIDAK punya QR code dan tidak disimpan ke raport_terbit
  if (!isFinal) {
    return {
      ok: true,
      isFinal: false,
      published: false,
      status: "draft",
      message: "Raport masih berstatus DRAFT. QR Code hanya diterbitkan untuk raport yang telah difinalisasi.",
    };
  }

  // 5. Cek apakah sudah ada raport_terbit yang valid untuk enrollment & semester ini
  const { data: existingValid } = await adminClient
    .from("raport_terbit")
    .select("*")
    .eq("enrollment_id", enrollmentId)
    .eq("semester_id", semesterId)
    .eq("status", "valid")
    .order("versi", { ascending: false })
    .maybeSingle();

  if (existingValid && !forceNewVersion) {
    const qrDataUrl = await generateVerificationQRCode(
      existingValid.kode_verifikasi
    );
    return {
      ok: true,
      isFinal: true,
      published: true,
      status: "valid",
      versi: existingValid.versi,
      kodeVerifikasi: existingValid.kode_verifikasi,
      qrDataUrl,
      diterbitkanPada: existingValid.diterbitkan_pada,
      snapshot: existingValid.snapshot as Record<string, unknown>,
    };
  }

  // 6. Siapkan pembuatan versi baru raport_terbit
  // A. Ambil pengaturan lembaga
  const { data: lembaga } = await adminClient
    .from("pengaturan_lembaga")
    .select("*")
    .limit(1)
    .maybeSingle();

  // B. Ambil catatan semester santri ini
  const { data: catatan } = await adminClient
    .from("catatan_semester")
    .select("*")
    .eq("enrollment_id", enrollmentId)
    .eq("semester_id", semesterId)
    .maybeSingle();

  // C. Ambil peringkat final santri ini
  const { data: peringkatFinal } = await adminClient
    .from("peringkat_final")
    .select("*")
    .eq("enrollment_id", enrollmentId)
    .eq("semester_id", semesterId)
    .maybeSingle();

  // D. Hitung total santri dalam marhalah ini untuk info peringkat (X dari N santri)
  const { count: totalSantri } = await adminClient
    .from("enrollment")
    .select("id", { count: "exact", head: true })
    .eq("marhalah_id", marhalahId)
    .eq("tahun_ajaran_id", tahunAjaranId);

  // E. Ambil semua mapel dan nilai santri ini
  const { data: marhalahMapelList } = await adminClient
    .from("marhalah_mapel")
    .select(
      `
      id,
      urutan,
      mapel:mapel_id (id, nama),
      kitab:kitab_id (id, nama)
    `
    )
    .eq("marhalah_id", marhalahId)
    .eq("semester_id", semesterId)
    .order("urutan", { ascending: true });

  const { data: nilaiList } = await adminClient
    .from("nilai")
    .select("marhalah_mapel_id, angka")
    .eq("enrollment_id", enrollmentId)
    .eq("semester_id", semesterId);

  const nilaiMap = new Map<string, { angka: number | null }>();
  (nilaiList || []).forEach((n) => {
    nilaiMap.set(n.marhalah_mapel_id, {
      angka: n.angka,
    });
  });

  const daftarNilai = (marhalahMapelList || []).map((mm, idx) => {
    const val = nilaiMap.get(mm.id);
    const mapelObj = mm.mapel as { id?: string; nama?: string } | null;
    const kitabObj = mm.kitab as { id?: string; nama?: string } | null;

    return {
      nomor: idx + 1,
      mapel_id: mapelObj?.id || null,
      mapel_nama: mapelObj?.nama || "-",
      kitab_judul: kitabObj?.nama || "-",
      nilai_angka: val?.angka ?? null,
    };
  });

  const validScores = daftarNilai
    .map((d) => d.nilai_angka)
    .filter((v): v is number => v !== null && v !== undefined);
  const totalNilaiSantri =
    validScores.length > 0 ? validScores.reduce((acc, curr) => acc + curr, 0) : null;
  const rataRataSantri =
    validScores.length > 0 && totalNilaiSantri !== null
      ? Number((totalNilaiSantri / validScores.length).toFixed(1))
      : null;

  // F. Bentuk Snapshot Objek Kanonikal
  const snapshot: Record<string, unknown> = {
    santri: {
      id: (enrollment.santri as { id?: string })?.id,
      nis: (enrollment.santri as { nis?: string | null })?.nis || null,
      nama: (enrollment.santri as { nama?: string })?.nama || "-",
      jenis_kelamin: (enrollment.santri as { jenis_kelamin?: string })?.jenis_kelamin || null,
      tempat_lahir: (enrollment.santri as { tempat_lahir?: string })?.tempat_lahir || null,
      tanggal_lahir: (enrollment.santri as { tanggal_lahir?: string })?.tanggal_lahir || null,
      nama_wali: (enrollment.santri as { nama_wali?: string })?.nama_wali || null,
    },
    marhalah: {
      id: marhalahId,
      nama: (enrollment.marhalah as { nama?: string })?.nama || "-",
    },
    tahun_ajaran: {
      id: tahunAjaranId,
      nama: (enrollment.tahun_ajaran as { nama?: string })?.nama || "-",
    },
    semester: {
      id: semesterId,
      jenis: semester.jenis,
    },
    wali_kelas: waliKelasNama || "SINAR KHOTIMATUL HUSNA, S.Pd",
    pimpinan: {
      nama: lembaga?.nama_pimpinan || "KH. MIMIH SAEFUL MILLAH, S.Pd",
      lembaga: lembaga?.nama_lembaga || "KH ZUMRATUL MUTTAQIN",
      tempat_terbit: lembaga?.tempat_terbit || "Sukamenak",
    },
    peringkat: {
      peringkat: peringkatFinal?.peringkat ?? null,
      total_santri: totalSantri ?? 0,
      total_nilai: totalNilaiSantri,
      rata_rata: rataRataSantri,
    },
    catatan_semester: {
      akhlak: catatan?.akhlak ?? null,
      ketekunan: catatan?.ketekunan ?? null,
      kerapihan: catatan?.kerapihan ?? null,
      kebersihan: catatan?.kebersihan ?? null,
      sakit: catatan?.sakit ?? 0,
      izin: catatan?.izin ?? 0,
      alpa: catatan?.alpa ?? 0,
      saran_wali_kelas: catatan?.saran_wali_kelas ?? null,
    },
    nilai: daftarNilai,
    diterbitkan_at: new Date().toISOString(),
  };

  // G. Hitung nomor versi berikutnya & tandai versi lama sebagai 'digantikan'
  const { data: allVersions } = await adminClient
    .from("raport_terbit")
    .select("id, versi, status")
    .eq("enrollment_id", enrollmentId)
    .eq("semester_id", semesterId)
    .order("versi", { ascending: false });

  let nextVersion = 1;
  if (allVersions && allVersions.length > 0) {
    const maxVersi = Math.max(...allVersions.map((v) => v.versi));
    nextVersion = maxVersi + 1;

    // Tandai semua versi lama yang 'valid' menjadi 'digantikan'
    await adminClient
      .from("raport_terbit")
      .update({ status: "digantikan", updated_at: new Date().toISOString() })
      .eq("enrollment_id", enrollmentId)
      .eq("semester_id", semesterId)
      .eq("status", "valid");
  }

  // H. Hasilkan Kode Verifikasi Acak Aman (14 Karakter) & HMAC-SHA256
  let kodeVerifikasi = generateSecureVerificationCode(14);
  // Pastikan kode unik
  let isUnique = false;
  let attempts = 0;
  while (!isUnique && attempts < 5) {
    const { data: exist } = await adminClient
      .from("raport_terbit")
      .select("id")
      .eq("kode_verifikasi", kodeVerifikasi)
      .maybeSingle();

    if (!exist) {
      isUnique = true;
    } else {
      kodeVerifikasi = generateSecureVerificationCode(14);
      attempts++;
    }
  }

  const hash = generateRaportHMAC(snapshot);

  // I. Simpan baris baru ke tabel raport_terbit
  const { data: inserted, error: insertErr } = await adminClient
    .from("raport_terbit")
    .insert({
      enrollment_id: enrollmentId,
      semester_id: semesterId,
      versi: nextVersion,
      kode_verifikasi: kodeVerifikasi,
      snapshot: snapshot,
      hash: hash,
      status: "valid",
      diterbitkan_oleh: context.user.id,
      diterbitkan_pada: new Date().toISOString(),
    })
    .select()
    .single();

  if (insertErr || !inserted) {
    return {
      ok: false,
      message: "Gagal menyimpan arsip raport terbit: " + (insertErr?.message || "Kesalahan database"),
      isFinal: true,
      published: false,
      status: "draft",
    };
  }

  // J. Catat ke audit_log
  await adminClient.from("audit_log").insert({
    tabel: "raport_terbit",
    record_id: inserted.id,
    aksi: nextVersion > 1 ? "TERBITKAN_ULANG" : "TERBITKAN_PERTAMA",
    perubahan: {
      enrollment_id: enrollmentId,
      semester_id: semesterId,
      versi: nextVersion,
      kode_verifikasi: kodeVerifikasi,
      status: "valid",
      mode: context.isActingAs ? "act_as" : "asli",
      atas_nama: context.effectiveGuruId ?? null,
    },
    user_id: context.user.id,
    atas_nama: context.effectiveGuruId ?? null,
  });

  // K. Bangkitkan QR Code Data URL
  const qrDataUrl = await generateVerificationQRCode(kodeVerifikasi);

  return {
    ok: true,
    isFinal: true,
    published: true,
    status: "valid",
    versi: nextVersion,
    kodeVerifikasi,
    qrDataUrl,
    diterbitkanPada: inserted.diterbitkan_pada,
    snapshot,
  };
}

/**
 * Mendapatkan informasi status penerbitan raport untuk enrollment & semester tertentu (Read-Only).
 */
export async function getRaportTerbitInfoAction(
  enrollmentId: string,
  semesterId: string
): Promise<RaportTerbitResult> {
  const adminClient = createAdminClient();

  // Cek enrollment
  const { data: enrollment } = await adminClient
    .from("enrollment")
    .select("marhalah_id")
    .eq("id", enrollmentId)
    .single();

  if (!enrollment) {
    return {
      ok: false,
      message: "Enrollment tidak ditemukan",
      isFinal: false,
      published: false,
      status: "draft",
    };
  }

  // Cek status final
  const { data: statusRaport } = await adminClient
    .from("status_raport")
    .select("status")
    .eq("marhalah_id", enrollment.marhalah_id)
    .eq("semester_id", semesterId)
    .maybeSingle();

  const isFinal = statusRaport?.status === "final";
  if (!isFinal) {
    return {
      ok: true,
      isFinal: false,
      published: false,
      status: "draft",
    };
  }

  // Ambil raport terbit yang valid
  const { data: terbit } = await adminClient
    .from("raport_terbit")
    .select("*")
    .eq("enrollment_id", enrollmentId)
    .eq("semester_id", semesterId)
    .eq("status", "valid")
    .order("versi", { ascending: false })
    .maybeSingle();

  if (!terbit) {
    return {
      ok: true,
      isFinal: true,
      published: false,
      status: "valid",
      message: "Raport final belum diterbitkan ke arsip.",
    };
  }

  const qrDataUrl = await generateVerificationQRCode(terbit.kode_verifikasi);

  return {
    ok: true,
    isFinal: true,
    published: true,
    status: "valid",
    versi: terbit.versi,
    kodeVerifikasi: terbit.kode_verifikasi,
    qrDataUrl,
    diterbitkanPada: terbit.diterbitkan_pada,
    snapshot: terbit.snapshot as Record<string, unknown>,
  };
}

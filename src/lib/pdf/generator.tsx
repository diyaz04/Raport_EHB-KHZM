import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import fs from "fs";
import path from "path";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  RaportDocument,
  type RaportStudentData,
  type RaportSubjectData,
} from "./raport-document";
import { getOrPublishRaportAction } from "@/app/actions/raport-terbit";
import { generateVerificationQRCode } from "@/lib/qr/generate-qr";

export interface GenerateClassPdfResult {
  buffer: Buffer;
  durationMs: number;
  totalSantri: number;
  marhalahNama: string;
  tahunAjaranNama: string;
  semesterJenis: string;
}

/**
 * Menghasilkan berkas PDF cetak massal satu kelas penuh (satu halaman per santri).
 * Hanya memproses kelas yang status_raport-nya sudah 'final'.
 */
export async function generateClassRaportPdfBuffer({
  marhalahId,
  semesterId,
}: {
  marhalahId: string;
  semesterId: string;
}): Promise<GenerateClassPdfResult> {
  const adminClient = createAdminClient();

  // 1. Periksa Marhalah & Semester
  const { data: marhalah, error: marhalahErr } = await adminClient
    .from("marhalah")
    .select("id, nama")
    .eq("id", marhalahId)
    .single();

  if (marhalahErr || !marhalah) {
    throw new Error("Marhalah (kelas) tidak ditemukan.");
  }

  const { data: semester, error: semErr } = await adminClient
    .from("semester")
    .select("id, jenis, tahun_ajaran_id, tahun_ajaran:tahun_ajaran_id (id, nama)")
    .eq("id", semesterId)
    .single();

  if (semErr || !semester) {
    throw new Error("Semester tidak ditemukan.");
  }

  const tahunAjaranId = semester.tahun_ajaran_id;
  const tahunAjaranNama =
    (semester.tahun_ajaran as { nama?: string })?.nama || "-";

  // 2. Validasi Status Final: HANYA STATUS FINAL YANG DIIZINKAN
  const { data: statusRaport } = await adminClient
    .from("status_raport")
    .select("status")
    .eq("marhalah_id", marhalahId)
    .eq("semester_id", semesterId)
    .maybeSingle();

  if (statusRaport?.status !== "final") {
    throw new Error(
      "Raport marhalah " +
        marhalah.nama +
        " belum berstatus FINAL. Cetak massal hanya dapat dilakukan untuk kelas yang telah difinalisasi."
    );
  }

  // 3. Ambil data lembaga & wali kelas
  const { data: lembaga } = await adminClient
    .from("pengaturan_lembaga")
    .select("*")
    .limit(1)
    .maybeSingle();

  const { data: waliRecord } = await adminClient
    .from("guru_marhalah")
    .select("guru_id, guru:guru_id (id, nama)")
    .eq("marhalah_id", marhalahId)
    .eq("tahun_ajaran_id", tahunAjaranId)
    .maybeSingle();

  const waliKelasNama =
    waliRecord?.guru && typeof waliRecord.guru === "object" && "nama" in waliRecord.guru
      ? (waliRecord.guru as { nama: string }).nama
      : "Wali Kelas";

  // 4. Ambil daftar mata pelajaran marhalah ini
  const { data: marhalahMapelList } = await adminClient
    .from("marhalah_mapel")
    .select(
      `
      id,
      urutan,
      tipe,
      mapel:mapel_id (id, nama),
      kitab:kitab_id (id, nama)
    `
    )
    .eq("marhalah_id", marhalahId)
    .eq("semester_id", semesterId)
    .order("urutan", { ascending: true });

  // 5. Ambil semua santri yang terdaftar di kelas ini
  const { data: enrollments, error: enrollErr } = await adminClient
    .from("enrollment")
    .select(
      `
      id,
      santri:santri_id (
        id,
        nis,
        nama,
        jenis_kelamin
      )
    `
    )
    .eq("marhalah_id", marhalahId)
    .eq("tahun_ajaran_id", tahunAjaranId);

  if (enrollErr || !enrollments || enrollments.length === 0) {
    throw new Error("Tidak ada santri yang terdaftar di marhalah ini.");
  }

  const totalSantri = enrollments.length;

  // 6. Urutkan santri berdasarkan NIS / Nama
  const sortedEnrollments = [...enrollments].sort((a, b) => {
    const santriA = a.santri as { nis?: string | null; nama?: string } | null;
    const santriB = b.santri as { nis?: string | null; nama?: string } | null;
    if (santriA?.nis && santriB?.nis) {
      return santriA.nis.localeCompare(santriB.nis);
    }
    return (santriA?.nama || "").localeCompare(santriB?.nama || "");
  });

  // 7. Ambil semua nilai di kelas ini untuk semester bersangkutan
  const enrollmentIds = sortedEnrollments.map((e) => e.id);
  const { data: allNilai } = await adminClient
    .from("nilai")
    .select("enrollment_id, marhalah_mapel_id, angka")
    .in("enrollment_id", enrollmentIds)
    .eq("semester_id", semesterId);

  const nilaiByEnrollment = new Map<string, Map<string, number | null>>();
  (allNilai || []).forEach((n) => {
    if (!nilaiByEnrollment.has(n.enrollment_id)) {
      nilaiByEnrollment.set(n.enrollment_id, new Map());
    }
    nilaiByEnrollment.get(n.enrollment_id)!.set(n.marhalah_mapel_id, n.angka);
  });

  // 8. Ambil semua catatan semester
  const { data: allCatatan } = await adminClient
    .from("catatan_semester")
    .select(
      `
      enrollment_id,
      akhlak,
      ketekunan,
      kerapihan,
      kebersihan,
      sakit,
      izin,
      alpa,
      saran_wali_kelas,
      naik_ke_marhalah:naik_ke_marhalah_id (nama)
    `
    )
    .in("enrollment_id", enrollmentIds)
    .eq("semester_id", semesterId);

  interface CatatanRecord {
    enrollment_id: string;
    akhlak: string | null;
    ketekunan: string | null;
    kerapihan: string | null;
    kebersihan: string | null;
    sakit: number;
    izin: number;
    alpa: number;
    saran_wali_kelas: string | null;
    naik_ke_marhalah: { nama?: string } | null;
  }

  const catatanByEnrollment = new Map<string, CatatanRecord>();
  ((allCatatan as unknown as CatatanRecord[]) || []).forEach((c) => {
    catatanByEnrollment.set(c.enrollment_id, c);
  });

  // 9. Ambil peringkat final
  const { data: allPeringkat } = await adminClient
    .from("peringkat_final")
    .select("enrollment_id, peringkat")
    .in("enrollment_id", enrollmentIds)
    .eq("semester_id", semesterId);

  interface PeringkatRecord {
    enrollment_id: string;
    peringkat: number | null;
  }

  const peringkatByEnrollment = new Map<string, PeringkatRecord>();
  ((allPeringkat as unknown as PeringkatRecord[]) || []).forEach((p) => {
    peringkatByEnrollment.set(p.enrollment_id, p);
  });

  // 10. Hitung Nilai Rata-rata Kelas per Marhalah Mapel
  const mapelSumCount = new Map<string, { sum: number; count: number }>();
  (allNilai || []).forEach((n) => {
    if (n.angka !== null && n.angka !== undefined) {
      const cur = mapelSumCount.get(n.marhalah_mapel_id) || { sum: 0, count: 0 };
      cur.sum += n.angka;
      cur.count += 1;
      mapelSumCount.set(n.marhalah_mapel_id, cur);
    }
  });

  const mapelAverageMap = new Map<string, string>();
  mapelSumCount.forEach((val, mapelId) => {
    if (val.count > 0) {
      const avg = val.sum / val.count;
      mapelAverageMap.set(mapelId, avg.toFixed(1).replace(".", ","));
    }
  });

  // 11. Ambil / pastikan raport_terbit untuk setiap santri (Kode Verifikasi & QR)
  const studentsDataList: RaportStudentData[] = [];

  for (const enr of sortedEnrollments) {
    const santriObj = enr.santri as unknown as { id: string; nis?: string | null; nama?: string } | null;
    if (!santriObj) continue;

    // Pastikan terbit
    const pubResult = await getOrPublishRaportAction({
      enrollmentId: enr.id,
      semesterId,
    });

    const studentNilaiMap = nilaiByEnrollment.get(enr.id) || new Map();
    const mapelList: RaportSubjectData[] = (marhalahMapelList || []).map((mm, idx) => {
      const mapelObj = mm.mapel as { nama?: string } | null;
      const kitabObj = mm.kitab as { nama?: string } | null;
      const avgStr = mapelAverageMap.get(mm.id) || "-";
      return {
        urutan: idx + 1,
        nama: mapelObj?.nama || "-",
        kitab: kitabObj?.nama || "-",
        nilai: studentNilaiMap.get(mm.id) ?? null,
        rataRata: avgStr,
      };
    });

    const catatan = catatanByEnrollment.get(enr.id);
    const peringkat = peringkatByEnrollment.get(enr.id);
    const naikMarhalahObj = catatan?.naik_ke_marhalah as { nama?: string } | null;

    // Hitung total nilai & rata-rata santri dari mapelList
    const scores = Array.from(studentNilaiMap.values()).filter(
      (v): v is number => v !== null && v !== undefined
    );
    const studentTotalNilai =
      scores.length > 0 ? scores.reduce((acc, cur) => acc + cur, 0) : null;
    const studentRataRata =
      scores.length > 0 && studentTotalNilai !== null
        ? studentTotalNilai / scores.length
        : null;

    // Titimangsa & Tanggal Terbit
    let configuredTanggalRaport: string | null = null;
    if (lembaga) {
      if ("tanggal_raport" in lembaga && typeof (lembaga as Record<string, unknown>).tanggal_raport === "string") {
        configuredTanggalRaport = (lembaga as Record<string, unknown>).tanggal_raport as string;
      } else if (lembaga.logo_path) {
        try {
          const parsed = JSON.parse(lembaga.logo_path);
          if (parsed && typeof parsed.tanggal_raport === "string") {
            configuredTanggalRaport = parsed.tanggal_raport;
          }
        } catch {
          // logo_path bukan JSON
        }
      }
    }

    const finalTanggalTerbit =
      configuredTanggalRaport ||
      (pubResult.diterbitkanPada
        ? new Intl.DateTimeFormat("id-ID", {
            day: "numeric",
            month: "long",
            year: "numeric",
          }).format(new Date(pubResult.diterbitkanPada))
        : "20 Desember 2025");

    // Pastikan QR Code & Kode Verifikasi selalu terisi valid
    const finalKodeVerifikasi =
      pubResult.kodeVerifikasi ||
      `ZM-${(santriObj.nis || enr.id.substring(0, 8)).toUpperCase()}`;
    const finalQrDataUrl =
      pubResult.qrDataUrl ||
      (await generateVerificationQRCode(finalKodeVerifikasi));

    studentsDataList.push({
      santriId: santriObj.id,
      nama: santriObj.nama || "-",
      nis: santriObj.nis || null,
      marhalah: marhalah.nama,
      tahunAjaran: tahunAjaranNama,
      semester: semester.jenis,
      waliKelas: waliKelasNama || "SINAR KHOTIMATUL HUSNA, S.Pd",
      pimpinanNama: lembaga?.nama_pimpinan || "KH. MIMIH SAEFUL MILLAH, S.Pd",
      tempatTerbit: lembaga?.tempat_terbit || "Sukamenak",
      tanggalTerbit: finalTanggalTerbit,
      isDraft: false, // Selalu false karena hanya status final
      qrDataUrl: finalQrDataUrl,
      kodeVerifikasi: finalKodeVerifikasi,
      ranking: peringkat?.peringkat ?? null,
      totalSantri,
      totalNilai: studentTotalNilai,
      rataRata: studentRataRata,
      mapelList,
      catatan: {
        akhlak: catatan?.akhlak ?? null,
        ketekunan: catatan?.ketekunan ?? null,
        kerapihan: catatan?.kerapihan ?? null,
        kebersihan: catatan?.kebersihan ?? null,
        sakit: catatan?.sakit ?? 0,
        izin: catatan?.izin ?? 0,
        alpa: catatan?.alpa ?? 0,
        saran_wali_kelas: catatan?.saran_wali_kelas ?? null,
        naik_ke_marhalah: naikMarhalahObj?.nama ?? null,
      },
    });
  }

  // 12. Muat Logo & TTD Pimpinan Pesantren (jika ada di public/)
  let logoBase64: string | null = null;
  try {
    const logoFilePath = path.join(process.cwd(), "public", "logo.png");
    if (fs.existsSync(logoFilePath)) {
      const logoBuffer = fs.readFileSync(logoFilePath);
      logoBase64 = `data:image/png;base64,${logoBuffer.toString("base64")}`;
    }
  } catch {
    logoBase64 = null;
  }

  let ttdPimpinanBase64: string | null = null;
  try {
    const ttdFilePath = path.join(process.cwd(), "public", "ttd-pimpinan.png");
    if (fs.existsSync(ttdFilePath)) {
      const ttdBuffer = fs.readFileSync(ttdFilePath);
      ttdPimpinanBase64 = `data:image/png;base64,${ttdBuffer.toString("base64")}`;
    }
  } catch {
    ttdPimpinanBase64 = null;
  }

  // 13. Rendisi Dokumen PDF & Ukur Durasi Waktu Generate
  const docElement = (
    <RaportDocument
      students={studentsDataList}
      logoBase64={logoBase64}
      ttdPimpinanBase64={ttdPimpinanBase64}
    />
  ) as unknown as Parameters<typeof renderToBuffer>[0];

  const startTime = performance.now();
  const pdfBuffer = await renderToBuffer(docElement);
  const durationMs = Math.round(performance.now() - startTime);

  return {
    buffer: pdfBuffer,
    durationMs,
    totalSantri: studentsDataList.length,
    marhalahNama: marhalah.nama,
    tahunAjaranNama,
    semesterJenis: semester.jenis,
  };
}

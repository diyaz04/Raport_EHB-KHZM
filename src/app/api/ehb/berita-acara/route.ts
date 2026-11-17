import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import { getEffectiveContext } from "@/lib/auth/context";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  BeritaAcaraDocument,
  type BeritaAcaraPageData,
} from "@/lib/pdf/ehb-berita-acara-document";
import type { LembagaInfo } from "@/lib/pdf/kop-surat";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const ehbId = searchParams.get("ehbId");
    const sesiId = searchParams.get("sesiId") || "all";
    const ruanganId = searchParams.get("ruanganId") || "all";

    if (!ehbId) {
      return NextResponse.json(
        { error: "Parameter ehbId wajib diisi." },
        { status: 400 }
      );
    }

    // 1. Cek otentikasi admin
    const context = await getEffectiveContext();
    if (!context.user || !context.profile || context.profile.role !== "admin") {
      return NextResponse.json(
        { error: "Akses ditolak. Hanya administrator yang dapat mencetak berkas EHB." },
        { status: 403 }
      );
    }

    const adminClient = createAdminClient();

    // 2. Ambil data EHB
    const { data: ehbData, error: ehbErr } = await adminClient
      .from("ehb")
      .select(`
        id,
        nama,
        tahun_ajaran:tahun_ajaran_id(nama),
        semester:semester_id(jenis)
      `)
      .eq("id", ehbId)
      .single();

    if (ehbErr || !ehbData) {
      return NextResponse.json({ error: "Data EHB tidak ditemukan." }, { status: 404 });
    }

    const rawTa = ehbData.tahun_ajaran as unknown as { nama?: string } | Array<{ nama?: string }>;
    const rawSem = ehbData.semester as unknown as { jenis?: string } | Array<{ jenis?: string }>;
    const taNama = (Array.isArray(rawTa) ? rawTa[0]?.nama : rawTa?.nama) || "-";
    const semJenis = (Array.isArray(rawSem) ? rawSem[0]?.jenis : rawSem?.jenis) || "-";

    // 3. Ambil data Pengaturan Lembaga (Kop)
    const { data: lembagaData } = await adminClient
      .from("pengaturan_lembaga")
      .select("*")
      .limit(1)
      .maybeSingle();

    const lembaga: LembagaInfo | null = lembagaData ?? null;

    // 4. Ambil Ruangan
    let ruanganQuery = adminClient
      .from("ehb_ruangan")
      .select("id, nama, kapasitas")
      .eq("ehb_id", ehbId)
      .order("nama", { ascending: true });

    if (ruanganId !== "all") {
      ruanganQuery = ruanganQuery.eq("id", ruanganId);
    }

    const { data: ruanganRows } = await ruanganQuery;
    const ruanganList = ruanganRows ?? [];

    if (ruanganList.length === 0) {
      return NextResponse.json(
        { error: "Tidak ada ruangan yang ditemukan untuk kriteria cetak ini." },
        { status: 400 }
      );
    }

    // 5. Ambil Sesi & Jadwal Mapel
    let sesiQuery = adminClient
      .from("ehb_sesi")
      .select("id, tanggal, jam_mulai, jam_selesai")
      .eq("ehb_id", ehbId)
      .order("tanggal", { ascending: true })
      .order("jam_mulai", { ascending: true });

    if (sesiId !== "all") {
      sesiQuery = sesiQuery.eq("id", sesiId);
    }

    const { data: sesiRows } = await sesiQuery;
    const allSesiRows = sesiRows ?? [];

    if (allSesiRows.length === 0) {
      return NextResponse.json(
        { error: "Tidak ada sesi ujian yang ditemukan untuk kriteria cetak ini." },
        { status: 400 }
      );
    }

    // Ambil jadwal mapel untuk sesi-sesi ini
    const sesiIds = allSesiRows.map((s) => s.id);
    const { data: jadwalRows } = await adminClient
      .from("ehb_jadwal")
      .select(`
        id,
        sesi_id,
        marhalah_id,
        marhalah_mapel:marhalah_mapel_id(
          mapel:mapel_id(nama),
          kitab:kitab_id(nama)
        )
      `)
      .in("sesi_id", sesiIds);

    interface RawJadwalJoin {
      id: string;
      sesi_id: string;
      marhalah_id: string;
      marhalah_mapel?: {
        mapel?: { nama: string } | Array<{ nama: string }>;
        kitab?: { nama: string } | Array<{ nama: string }> | null;
      } | Array<{
        mapel?: { nama: string } | Array<{ nama: string }>;
        kitab?: { nama: string } | Array<{ nama: string }> | null;
      }>;
    }

    const mapelRingkasanPerSesi: Record<string, string> = {};
    for (const j of (jadwalRows as unknown as RawJadwalJoin[]) ?? []) {
      const sId = j.sesi_id;
      const rawMm = j.marhalah_mapel;
      const mm = Array.isArray(rawMm) ? rawMm[0] : rawMm;
      const rawMapel = mm?.mapel;
      const mapelObj = Array.isArray(rawMapel) ? rawMapel[0] : rawMapel;
      const mapelName = mapelObj?.nama || "";

      const rawKitab = mm?.kitab;
      const kitabObj = Array.isArray(rawKitab) ? rawKitab[0] : rawKitab;
      const kitabName = kitabObj?.nama ? ` (${kitabObj.nama})` : "";
      const fullLabel = mapelName ? `${mapelName}${kitabName}` : "";

      if (!mapelRingkasanPerSesi[sId]) {
        mapelRingkasanPerSesi[sId] = fullLabel;
      } else if (fullLabel && !mapelRingkasanPerSesi[sId].includes(mapelName)) {
        mapelRingkasanPerSesi[sId] += `, ${fullLabel}`;
      }
    }

    // 6. Hitung jumlah peserta teralokasi per ruangan
    const { data: pesertaRows } = await adminClient
      .from("ehb_peserta")
      .select("id, ruangan_id")
      .eq("ehb_id", ehbId)
      .not("ruangan_id", "is", null);

    const pesertaCountByRuangan: Record<string, number> = {};
    for (const p of pesertaRows ?? []) {
      if (p.ruangan_id) {
        pesertaCountByRuangan[p.ruangan_id] = (pesertaCountByRuangan[p.ruangan_id] || 0) + 1;
      }
    }

    // 7. Ambil Pengawas Ruangan jika ada
    const { data: pengawasRows } = await adminClient
      .from("ehb_pengawas")
      .select("sesi_id, ruangan_id, nama_manual, guru:guru_id(nama)")
      .in("sesi_id", sesiIds);

    interface RawPengawasJoin {
      sesi_id: string;
      ruangan_id: string;
      nama_manual: string | null;
      guru?: { nama: string } | Array<{ nama: string }> | null;
    }

    const pengawasMap: Record<string, string> = {};
    for (const pw of (pengawasRows as unknown as RawPengawasJoin[]) ?? []) {
      const key = `${pw.sesi_id}_${pw.ruangan_id}`;
      const rawG = pw.guru;
      const guru = Array.isArray(rawG) ? rawG[0] : rawG;
      pengawasMap[key] = guru?.nama || pw.nama_manual || "Pengawas Ruang";
    }

    // 8. Susun halaman Berita Acara (satu lembar per ruangan per sesi)
    const pages: BeritaAcaraPageData[] = [];

    for (const ruang of ruanganList) {
      for (let sIdx = 0; sIdx < allSesiRows.length; sIdx++) {
        const sesi = allSesiRows[sIdx];
        const pwKey = `${sesi.id}_${ruang.id}`;
        const pengawas1 = pengawasMap[pwKey] || null;

        pages.push({
          ehb: {
            nama: ehbData.nama,
            tahunAjaran: taNama,
            semester: semJenis,
          },
          sesi: {
            nomorSesi: sIdx + 1,
            tanggal: sesi.tanggal,
            jamMulai: sesi.jam_mulai,
            jamSelesai: sesi.jam_selesai,
            mapelRingkasan: mapelRingkasanPerSesi[sesi.id] || "Mata Pelajaran EHB",
          },
          ruangan: {
            id: ruang.id,
            nama: ruang.nama,
            kapasitas: ruang.kapasitas,
            jumlahPesertaSeharusnya: pesertaCountByRuangan[ruang.id] || 0,
          },
          pengawas1,
          pengawas2: "Panitia Pelaksana EHB",
          lembaga,
        });
      }
    }

    const docElement = React.createElement(BeritaAcaraDocument, {
      pages,
    }) as unknown as Parameters<typeof renderToBuffer>[0];

    const pdfBuffer = await renderToBuffer(docElement);

    const filename = `Berita-Acara-EHB-${ehbData.nama.replace(/\s+/g, "_")}.pdf`;
    const uint8Array = new Uint8Array(pdfBuffer);

    return new Response(uint8Array, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${filename}"`,
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (err) {
    console.error("Gagal mencetak Berita Acara EHB:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal mencetak dokumen PDF." },
      { status: 500 }
    );
  }
}

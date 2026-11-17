import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import { getEffectiveContext } from "@/lib/auth/context";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  DaftarHadirPerSesiDocument,
  DaftarHadirSemuaSesiDocument,
  type DaftarHadirPerSesiPageData,
  type DaftarHadirSemuaSesiPageData,
  type PesertaHadirRow,
  type SesiInfo,
  type RuanganInfo,
  type EhbInfo,
} from "@/lib/pdf/ehb-daftar-hadir-document";
import type { LembagaInfo } from "@/lib/pdf/kop-surat";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const ehbId = searchParams.get("ehbId");
    const cakupan = searchParams.get("cakupan") || "per_sesi";
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

    const ehbInfo: EhbInfo = {
      id: ehbData.id,
      nama: ehbData.nama,
      tahunAjaran: taNama,
      semester: semJenis,
    };

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
    const ruanganList: RuanganInfo[] = (ruanganRows ?? []).map((r) => ({
      id: r.id,
      nama: r.nama,
      kapasitas: r.kapasitas,
    }));

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

    if (cakupan === "per_sesi" && sesiId !== "all") {
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

    // Map ringkasan mapel per sesi
    const mapelPerSesiMarhalah: Record<string, Record<string, string>> = {};
    const mapelRingkasanPerSesi: Record<string, string> = {};

    for (const j of (jadwalRows as unknown as RawJadwalJoin[]) ?? []) {
      const sId = j.sesi_id;
      const mId = j.marhalah_id;
      const rawMm = j.marhalah_mapel;
      const mm = Array.isArray(rawMm) ? rawMm[0] : rawMm;
      const rawMapel = mm?.mapel;
      const mapelObj = Array.isArray(rawMapel) ? rawMapel[0] : rawMapel;
      const mapelName = mapelObj?.nama || "";

      const rawKitab = mm?.kitab;
      const kitabObj = Array.isArray(rawKitab) ? rawKitab[0] : rawKitab;
      const kitabName = kitabObj?.nama ? ` (${kitabObj.nama})` : "";
      const fullLabel = mapelName ? `${mapelName}${kitabName}` : "";

      if (!mapelPerSesiMarhalah[sId]) mapelPerSesiMarhalah[sId] = {};
      if (fullLabel) mapelPerSesiMarhalah[sId][mId] = fullLabel;

      if (!mapelRingkasanPerSesi[sId]) {
        mapelRingkasanPerSesi[sId] = fullLabel;
      } else if (fullLabel && !mapelRingkasanPerSesi[sId].includes(mapelName)) {
        mapelRingkasanPerSesi[sId] += `, ${fullLabel}`;
      }
    }

    // Susun sesi list
    const sesiList: SesiInfo[] = allSesiRows.map((s, idx) => ({
      id: s.id,
      nomorSesi: idx + 1,
      tanggal: s.tanggal,
      jamMulai: s.jam_mulai,
      jamSelesai: s.jam_selesai,
      mapelRingkasan: mapelRingkasanPerSesi[s.id] || "Ujian Semester",
    }));

    // 6. Ambil Peserta pada Ruangan Ini
    const { data: pesertaRows } = await adminClient
      .from("ehb_peserta")
      .select(`
        id,
        ehb_id,
        ruangan_id,
        no_peserta,
        no_urut,
        enrollment:enrollment_id(
          marhalah_id,
          marhalah:marhalah_id(nama),
          santri:santri_id(nama)
        )
      `)
      .eq("ehb_id", ehbId)
      .not("ruangan_id", "is", null);

    interface RawPesertaJoin {
      id: string;
      ehb_id: string;
      ruangan_id: string | null;
      no_peserta: string;
      no_urut: number | null;
      enrollment?: {
        marhalah_id: string;
        marhalah?: { nama: string } | Array<{ nama: string }>;
        santri?: { nama: string } | Array<{ nama: string }>;
      } | Array<{
        marhalah_id: string;
        marhalah?: { nama: string } | Array<{ nama: string }>;
        santri?: { nama: string } | Array<{ nama: string }>;
      }>;
    }

    const pesertaByRuangan: Record<string, Array<{
      noUrutMeja: number | null;
      noPeserta: string;
      nama: string;
      marhalahId: string;
      marhalahNama: string;
    }>> = {};

    for (const p of (pesertaRows as unknown as RawPesertaJoin[]) ?? []) {
      const rId = p.ruangan_id;
      if (!rId) continue;
      const rawE = p.enrollment;
      const enrollment = Array.isArray(rawE) ? rawE[0] : rawE;
      const rawM = enrollment?.marhalah;
      const marhalah = Array.isArray(rawM) ? rawM[0] : rawM;
      const rawS = enrollment?.santri;
      const santri = Array.isArray(rawS) ? rawS[0] : rawS;

      if (!pesertaByRuangan[rId]) pesertaByRuangan[rId] = [];
      pesertaByRuangan[rId].push({
        noUrutMeja: p.no_urut,
        noPeserta: p.no_peserta,
        nama: santri?.nama || "-",
        marhalahId: enrollment?.marhalah_id || "",
        marhalahNama: marhalah?.nama || "-",
      });
    }

    // Urutkan peserta per ruangan berdasarkan no_urut meja
    for (const rId in pesertaByRuangan) {
      pesertaByRuangan[rId].sort((a, b) => (a.noUrutMeja ?? 999) - (b.noUrutMeja ?? 999));
    }

    // =========================================================================
    // 7. RENDER BERDASARKAN CAKUPAN
    // =========================================================================
    let pdfBuffer: Buffer;
    const filename = `Daftar-Hadir-EHB-${ehbData.nama.replace(/\s+/g, "_")}-${cakupan}.pdf`;

    if (cakupan === "semua_sesi") {
      // MODE SEMUA SESI (LANDSCAPE REKAP)
      const pages: DaftarHadirSemuaSesiPageData[] = ruanganList.map((ruang) => {
        const pList = (pesertaByRuangan[ruang.id] ?? []).map((p) => ({
          noUrutMeja: p.noUrutMeja,
          noPeserta: p.noPeserta,
          nama: p.nama,
          marhalah: p.marhalahNama,
        }));

        return {
          ehb: ehbInfo,
          ruangan: ruang,
          semuaSesi: sesiList,
          peserta: pList,
          lembaga,
        };
      });

      const docElement = React.createElement(DaftarHadirSemuaSesiDocument, {
        pages,
      }) as unknown as Parameters<typeof renderToBuffer>[0];
      pdfBuffer = await renderToBuffer(docElement);
    } else {
      // MODE PER SESI (PORTRAIT)
      const pages: DaftarHadirPerSesiPageData[] = [];

      for (const ruang of ruanganList) {
        const rawPeserta = pesertaByRuangan[ruang.id] ?? [];

        for (const sesi of sesiList) {
          const pList: PesertaHadirRow[] = rawPeserta.map((p) => {
            const specificMapel = mapelPerSesiMarhalah[sesi.id]?.[p.marhalahId];
            return {
              noUrutMeja: p.noUrutMeja,
              noPeserta: p.noPeserta,
              nama: p.nama,
              marhalah: p.marhalahNama,
              mapelNama: specificMapel || sesi.mapelRingkasan || "-",
            };
          });

          pages.push({
            ehb: ehbInfo,
            ruangan: ruang,
            sesi,
            peserta: pList,
            lembaga,
          });
        }
      }

      const docElement = React.createElement(DaftarHadirPerSesiDocument, {
        pages,
      }) as unknown as Parameters<typeof renderToBuffer>[0];
      pdfBuffer = await renderToBuffer(docElement);
    }

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
    console.error("Gagal mencetak daftar hadir EHB:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal mencetak dokumen PDF." },
      { status: 500 }
    );
  }
}

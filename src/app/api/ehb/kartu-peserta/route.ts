import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import { getEffectiveContext } from "@/lib/auth/context";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  EhbKartuDocument,
  type KartuPesertaItem,
  type KartuJadwalRow,
} from "@/lib/pdf/ehb-kartu-document";

function getHariFromDate(dateStr: string) {
  if (!dateStr) return "-";
  try {
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      return d.toLocaleDateString("id-ID", { weekday: "long" });
    }
    return "-";
  } catch {
    return "-";
  }
}

function formatDateIndo(dateStr: string) {
  if (!dateStr) return "-";
  try {
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      return d.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    }
    return dateStr;
  } catch {
    return dateStr;
  }
}

function formatTime(timeStr: string) {
  if (!timeStr) return "-";
  return timeStr.slice(0, 5).replace(":", ".");
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const ehbId = searchParams.get("ehbId");
    const pesertaId = searchParams.get("pesertaId") || "all";
    const ruanganId = searchParams.get("ruanganId") || "all";
    const marhalahId = searchParams.get("marhalahId") || "all";

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
        { error: "Akses ditolak. Hanya administrator yang dapat mencetak kartu EHB." },
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

    // 3. Ambil Sesi & Jadwal Mapel EHB
    const { data: sesiRows } = await adminClient
      .from("ehb_sesi")
      .select("id, tanggal, jam_mulai, jam_selesai")
      .eq("ehb_id", ehbId)
      .order("tanggal", { ascending: true })
      .order("jam_mulai", { ascending: true });

    const sesiList = sesiRows ?? [];
    const sesiIds = sesiList.map((s) => s.id);

    // Ambil detail jadwal mapel
    let jadwalRows: Array<{
      id: string;
      sesi_id: string;
      marhalah_id: string;
      marhalah_mapel?: unknown;
    }> = [];

    if (sesiIds.length > 0) {
      const { data: jRows } = await adminClient
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
      jadwalRows = (jRows as typeof jadwalRows) ?? [];
    }

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

    // Map: [marhalahId][sesiId] -> Mapel Name
    const mapelByMarhalahAndSesi: Record<string, Record<string, string>> = {};

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

      if (!mapelByMarhalahAndSesi[mId]) mapelByMarhalahAndSesi[mId] = {};
      if (fullLabel) mapelByMarhalahAndSesi[mId][sId] = fullLabel;
    }

    // 4. Ambil Peserta EHB
    let pesertaQuery = adminClient
      .from("ehb_peserta")
      .select(`
        id,
        ehb_id,
        ruangan_id,
        no_peserta,
        no_urut,
        ruangan:ruangan_id(nama),
        enrollment:enrollment_id(
          marhalah_id,
          marhalah:marhalah_id(id, nama, urutan),
          santri:santri_id(nama, nis)
        )
      `)
      .eq("ehb_id", ehbId);

    if (pesertaId !== "all") {
      pesertaQuery = pesertaQuery.eq("id", pesertaId);
    }
    if (ruanganId !== "all") {
      pesertaQuery = pesertaQuery.eq("ruangan_id", ruanganId);
    }

    const { data: pesertaRows, error: pesertaErr } = await pesertaQuery;

    if (pesertaErr || !pesertaRows || pesertaRows.length === 0) {
      return NextResponse.json(
        { error: "Tidak ada data peserta yang ditemukan untuk kriteria cetak kartu ini." },
        { status: 400 }
      );
    }

    interface RawPesertaFullJoin {
      id: string;
      ehb_id: string;
      ruangan_id: string | null;
      no_peserta: string;
      no_urut: number | null;
      ruangan?: { nama: string } | Array<{ nama: string }> | null;
      enrollment?: {
        marhalah_id: string;
        marhalah?: { id: string; nama: string; urutan?: number } | Array<{ id: string; nama: string; urutan?: number }>;
        santri?: { nama: string; nis?: string | null } | Array<{ nama: string; nis?: string | null }>;
      } | Array<{
        marhalah_id: string;
        marhalah?: { id: string; nama: string; urutan?: number } | Array<{ id: string; nama: string; urutan?: number }>;
        santri?: { nama: string; nis?: string | null } | Array<{ nama: string; nis?: string | null }>;
      }>;
    }

    const rawList = (pesertaRows as unknown as RawPesertaFullJoin[]) ?? [];

    // Filter marhalah jika bukan 'all'
    const filteredRows = rawList.filter((p) => {
      if (marhalahId === "all") return true;
      const rawE = p.enrollment;
      const enr = Array.isArray(rawE) ? rawE[0] : rawE;
      return enr?.marhalah_id === marhalahId;
    });

    if (filteredRows.length === 0) {
      return NextResponse.json(
        { error: "Tidak ada peserta yang cocok dengan filter kelas/marhalah ini." },
        { status: 400 }
      );
    }

    // Urutkan berdasarkan no_peserta
    filteredRows.sort((a, b) => {
      const noA = a.no_peserta || "";
      const noB = b.no_peserta || "";
      return noA.localeCompare(noB, undefined, { numeric: true, sensitivity: "base" });
    });

    // 5. Susun data KartuPesertaItem[]
    const kartuPesertaList: KartuPesertaItem[] = filteredRows.map((p) => {
      const rawE = p.enrollment;
      const enr = Array.isArray(rawE) ? rawE[0] : rawE;
      const rawSantri = enr?.santri;
      const santri = Array.isArray(rawSantri) ? rawSantri[0] : rawSantri;
      const rawMarhalah = enr?.marhalah;
      const marhalah = Array.isArray(rawMarhalah) ? rawMarhalah[0] : rawMarhalah;
      const rawRuangan = p.ruangan;
      const ruangan = Array.isArray(rawRuangan) ? rawRuangan[0] : rawRuangan;

      const mId = enr?.marhalah_id || "";

      // Buat jadwal untuk marhalah santri ini
      const jadwalSantri: KartuJadwalRow[] = sesiList.map((sesi) => {
        const mapelLabel = mapelByMarhalahAndSesi[mId]?.[sesi.id] || "Ujian Terjadwal";
        return {
          hari: getHariFromDate(sesi.tanggal),
          tanggal: formatDateIndo(sesi.tanggal),
          waktu: `${formatTime(sesi.jam_mulai)} - ${formatTime(sesi.jam_selesai)}`,
          mapel: mapelLabel,
        };
      });

      return {
        id: p.id,
        ehbId: p.ehb_id,
        ehbNama: ehbData.nama,
        tahunAjaran: taNama,
        semester: semJenis,
        santriNama: santri?.nama || "-",
        santriNis: santri?.nis || "-",
        marhalahNama: marhalah?.nama || "-",
        noPeserta: p.no_peserta,
        ruanganNama: ruangan?.nama || null,
        jadwal: jadwalSantri,
      };
    });

    // 6. Generate PDF Buffer
    const docElement = React.createElement(EhbKartuDocument, {
      pesertaList: kartuPesertaList,
    }) as unknown as Parameters<typeof renderToBuffer>[0];

    const pdfBuffer = await renderToBuffer(docElement);

    const safeTitle = `Kartu-EHB-${ehbData.nama.replace(/[^a-zA-Z0-9_-]/g, "_")}`;

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${safeTitle}.pdf"`,
      },
    });
  } catch (error) {
    console.error("Error generating Kartu EHB PDF:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Terjadi kesalahan saat membuat Kartu Peserta EHB.",
      },
      { status: 500 }
    );
  }
}

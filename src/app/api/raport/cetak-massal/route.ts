import { NextRequest, NextResponse } from "next/server";
import { getEffectiveContext } from "@/lib/auth/context";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateClassRaportPdfBuffer } from "@/lib/pdf/generator";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const marhalahId = searchParams.get("marhalahId");
    const semesterId = searchParams.get("semesterId");

    if (!marhalahId || !semesterId) {
      return NextResponse.json(
        { error: "Parameter marhalahId dan semesterId wajib diisi." },
        { status: 400 }
      );
    }

    // 1. Cek otentikasi & wewenang pengguna
    const context = await getEffectiveContext();
    if (!context.user || !context.profile) {
      return NextResponse.json(
        { error: "Sesi login tidak sah atau telah berakhir." },
        { status: 401 }
      );
    }

    const adminClient = createAdminClient();

    // 2. Cek apakah user adalah admin atau wali kelas marhalah ini
    const isAdmin = context.profile.role === "admin";
    let isWaliKelas = false;

    const { data: semester } = await adminClient
      .from("semester")
      .select("tahun_ajaran_id")
      .eq("id", semesterId)
      .single();

    if (semester) {
      const { data: waliRecord } = await adminClient
        .from("guru_marhalah")
        .select("guru_id")
        .eq("marhalah_id", marhalahId)
        .eq("tahun_ajaran_id", semester.tahun_ajaran_id)
        .maybeSingle();

      isWaliKelas = waliRecord?.guru_id === context.user.id;
    }

    if (!isAdmin && !isWaliKelas) {
      return NextResponse.json(
        { error: "Anda tidak memiliki hak akses untuk mencetak raport kelas ini." },
        { status: 403 }
      );
    }

    // 3. Bangkitkan PDF massal kelas
    const {
      buffer,
      marhalahNama,
      tahunAjaranNama,
      semesterJenis,
      durationMs,
      totalSantri,
    } = await generateClassRaportPdfBuffer({
      marhalahId,
      semesterId,
    });

    // 4. Catat ke audit_log
    await adminClient.from("audit_log").insert({
      tabel: "raport_terbit",
      record_id: marhalahId,
      aksi: "CETAK_MASSAL_PDF",
      perubahan: {
        marhalahId,
        semesterId,
        totalSantri,
        durationMs,
        mode: context.isActingAs ? "act_as" : "asli",
        atas_nama: context.effectiveGuruId ?? null,
      },
      user_id: context.user.id,
      atas_nama: context.effectiveGuruId ?? null,
    });

    // 5. Bersihkan nama file dari karakter non-alphanumeric
    const safeMarhalah = marhalahNama.replace(/[^a-zA-Z0-9_-]/g, "_");
    const safeTA = tahunAjaranNama.replace(/[^a-zA-Z0-9_-]/g, "_");
    const safeSem = semesterJenis.replace(/[^a-zA-Z0-9_-]/g, "_");
    const filename = `Raport_${safeMarhalah}_${safeTA}_${safeSem}.pdf`;

    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(buffer.length),
        "X-Generate-Duration-Ms": String(durationMs),
        "X-Total-Santri": String(totalSantri),
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Terjadi kesalahan internal.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

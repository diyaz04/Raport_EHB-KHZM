import * as React from "react";
import { UserCogIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getEffectiveContext } from "@/lib/auth/context";
import { createAdminClient } from "@/lib/supabase/admin";
import { ActAsSelector, type GuruItem } from "@/components/act-as-selector";
import {
  ProgresDashboardClient,
  type TahunAjaranOption,
  type SemesterOption,
} from "@/components/admin/progres/progres-dashboard-client";
import {
  getProgresKelasListAction,
  type ProgresKelasRecord,
} from "@/app/admin/actions/progres";

export default async function AdminDashboardPage() {
  const context = await getEffectiveContext();

  let guruList: GuruItem[] = [];
  let tahunAjaranList: TahunAjaranOption[] = [];
  let semesterList: SemesterOption[] = [];
  let progresData: ProgresKelasRecord[] = [];
  let activeTaId: string | null = null;
  let activeSemId: string | null = null;

  try {
    const adminClient = createAdminClient();

    const [guruRes, taRes, semRes] = await Promise.all([
      adminClient
        .from("profiles")
        .select("id, nama")
        .eq("role", "guru")
        .eq("aktif", true)
        .order("nama", { ascending: true }),
      adminClient
        .from("tahun_ajaran")
        .select("id, nama, kode, aktif")
        .order("created_at", { ascending: false }),
      adminClient
        .from("semester")
        .select("id, jenis, aktif, tahun_ajaran_id")
        .order("created_at", { ascending: false }),
    ]);

    guruList = (guruRes.data as unknown as GuruItem[]) ?? [];
    tahunAjaranList = (taRes.data as unknown as TahunAjaranOption[]) ?? [];
    semesterList = (semRes.data as unknown as SemesterOption[]) ?? [];

    const activeTa = tahunAjaranList.find((t) => t.aktif);
    const activeSem = semesterList.find((s) => s.aktif);

    activeTaId = activeTa?.id ?? tahunAjaranList[0]?.id ?? null;
    activeSemId = activeSem?.id ?? semesterList[0]?.id ?? null;

    progresData = await getProgresKelasListAction(
      activeTaId ?? undefined,
      activeSemId ?? undefined
    );
  } catch (err) {
    console.error("Gagal memuat data awal admin dashboard:", err);
  }

  return (
    <div className="space-y-8">
      {/* HEADER DASHBOARD */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
          Dashboard Administrator
        </h1>
        <p className="text-sm text-zinc-500">
          Selamat datang, {context.profile?.nama ?? "Administrator"}. Pantau progres kelengkapan nilai raport per kelas dan kelola penugasan guru.
        </p>
      </div>

      {/* DASHBOARD PROGRES KELAS (STEP 15) */}
      <ProgresDashboardClient
        initialData={progresData}
        tahunAjaranList={tahunAjaranList}
        semesterList={semesterList}
        activeTahunAjaranId={activeTaId}
        activeSemesterId={activeSemId}
      />

      {/* FITUR BERTINDAK SEBAGAI GURU (ACT AS) */}
      <Card className="border-zinc-200 bg-white shadow-2xs">
        <CardHeader>
          <div className="flex items-center gap-2">
            <UserCogIcon className="h-5 w-5 text-primary" />
            <CardTitle>Fitur Bertindak Sebagai Guru (Act As)</CardTitle>
          </div>
          <CardDescription>
            Pilih salah satu guru untuk masuk ke tampilan dan perizinan panel guru tanpa memerlukan kata sandi guru tersebut. Setiap aksi akan dicatat dalam audit log sebagai mode bertindak.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ActAsSelector guruList={guruList} />
        </CardContent>
      </Card>
    </div>
  );
}

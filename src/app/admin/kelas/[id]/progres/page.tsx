import * as React from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AlertCircleIcon, ChevronLeftIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getEffectiveContext } from "@/lib/auth/context";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProgresDrilldownData } from "@/app/admin/actions/progres";
import { ProgresDrilldownClient } from "@/components/admin/progres/progres-drilldown-client";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ semesterId?: string }>;
}

export default async function AdminKelasProgresPage({
  params,
  searchParams,
}: PageProps) {
  const { id: marhalahId } = await params;
  const sParams = searchParams ? await searchParams : {};

  const context = await getEffectiveContext();
  if (!context.user || context.profile?.role !== "admin") {
    redirect("/login");
  }

  const adminClient = createAdminClient();

  // Ambil semester target (berdasarkan searchParams atau semester aktif)
  let targetSemesterId = sParams.semesterId;
  if (!targetSemesterId) {
    const { data: activeSem } = await adminClient
      .from("semester")
      .select("id")
      .eq("aktif", true)
      .maybeSingle();

    targetSemesterId = activeSem?.id;
  }

  if (!targetSemesterId) {
    return (
      <div className="mx-auto max-w-2xl py-12 text-center">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-900 shadow-sm">
          <AlertCircleIcon className="mx-auto h-8 w-8 text-amber-600 mb-2" />
          <h2 className="text-lg font-bold">Tidak Ada Semester Terpilih</h2>
          <p className="mt-1 text-sm text-amber-800">
            Tidak ada semester aktif atau parameter semester yang ditentukan di URL.
          </p>
          <div className="mt-4">
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/dashboard">
                <ChevronLeftIcon className="mr-1 h-4 w-4" />
                Kembali ke Dashboard
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const drilldownResult = await getProgresDrilldownData(marhalahId, targetSemesterId);

  if (!drilldownResult.ok || !drilldownResult.marhalah || !drilldownResult.semester) {
    notFound();
  }

  return (
    <ProgresDrilldownClient
      marhalah={drilldownResult.marhalah}
      semester={drilldownResult.semester}
      waliKelas={drilldownResult.wali_kelas ?? null}
      statusRaport={drilldownResult.status_raport ?? "draft"}
      mapelColumns={drilldownResult.mapelColumns ?? []}
      santriRows={drilldownResult.santriRows ?? []}
      totalMapelTanpaPengampu={drilldownResult.totalMapelTanpaPengampu ?? 0}
      totalSelKosong={drilldownResult.totalSelKosong ?? 0}
      backUrl="/admin/dashboard"
    />
  );
}

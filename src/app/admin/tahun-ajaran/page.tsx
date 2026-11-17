import * as React from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import { TahunAjaranClient, type TahunAjaranRecord } from "./tahun-ajaran-client";

export default async function TahunAjaranPage() {
  let items: TahunAjaranRecord[] = [];
  try {
    const adminClient = createAdminClient();
    const { data } = await adminClient
      .from("tahun_ajaran")
      .select("id, nama, kode, aktif, created_at")
      .order("kode", { ascending: false });

    items = data ?? [];
  } catch {
    items = [];
  }

  return <TahunAjaranClient initialData={items} />;
}

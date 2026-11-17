import * as React from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import { KitabClient, type KitabRecord } from "./kitab-client";

export default async function KitabPage() {
  let items: KitabRecord[] = [];
  try {
    const adminClient = createAdminClient();
    const { data } = await adminClient
      .from("kitab")
      .select("id, nama, created_at")
      .order("nama", { ascending: true });

    items = data ?? [];
  } catch {
    items = [];
  }

  return <KitabClient initialData={items} />;
}

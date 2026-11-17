import * as React from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import { MapelClient, type MapelRecord } from "./mapel-client";

export default async function MapelPage() {
  let items: MapelRecord[] = [];
  try {
    const adminClient = createAdminClient();
    const { data } = await adminClient
      .from("mapel")
      .select("id, nama, created_at")
      .order("nama", { ascending: true });

    items = data ?? [];
  } catch {
    items = [];
  }

  return <MapelClient initialData={items} />;
}

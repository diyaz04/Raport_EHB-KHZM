import * as React from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import { MarhalahClient, type MarhalahRecord } from "./marhalah-client";

export default async function MarhalahPage() {
  let items: MarhalahRecord[] = [];
  try {
    const adminClient = createAdminClient();
    const { data } = await adminClient
      .from("marhalah")
      .select("id, nama, kode, urutan, deleted_at, created_at")
      .order("urutan", { ascending: true });

    items = data ?? [];
  } catch {
    items = [];
  }

  return <MarhalahClient initialData={items} />;
}

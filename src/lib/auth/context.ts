import "server-only";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export interface EffectiveContext {
  user: {
    id: string;
    email?: string;
  } | null;
  profile: {
    id: string;
    nama: string;
    role: "admin" | "guru";
    aktif: boolean;
  } | null;
  role: "admin" | "guru" | null;
  isActingAs: boolean;
  effectiveGuruId: string | null;
  effectiveGuruName: string | null;
}

export async function getEffectiveContext(): Promise<EffectiveContext> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return {
      user: null,
      profile: null,
      role: null,
      isActingAs: false,
      effectiveGuruId: null,
      effectiveGuruName: null,
    };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        user: null,
        profile: null,
        role: null,
        isActingAs: false,
        effectiveGuruId: null,
        effectiveGuruName: null,
      };
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, nama, role, aktif")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return {
        user: { id: user.id, email: user.email },
        profile: null,
        role: null,
        isActingAs: false,
        effectiveGuruId: null,
        effectiveGuruName: null,
      };
    }

    const cookieStore = await cookies();
    const actingAsGuruId = cookieStore.get("acting_as")?.value;

    if (profile.role === "admin" && actingAsGuruId && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const adminClient = createAdminClient();
      const { data: guruTarget } = await adminClient
        .from("profiles")
        .select("id, nama, role, aktif")
        .eq("id", actingAsGuruId)
        .eq("role", "guru")
        .single();

      if (guruTarget) {
        return {
          user: { id: user.id, email: user.email },
          profile,
          role: "admin",
          isActingAs: true,
          effectiveGuruId: guruTarget.id,
          effectiveGuruName: guruTarget.nama,
        };
      }
    }

    return {
      user: { id: user.id, email: user.email },
      profile,
      role: profile.role,
      isActingAs: false,
      effectiveGuruId: profile.role === "guru" ? profile.id : null,
      effectiveGuruName: profile.role === "guru" ? profile.nama : null,
    };
  } catch {
    return {
      user: null,
      profile: null,
      role: null,
      isActingAs: false,
      effectiveGuruId: null,
      effectiveGuruName: null,
    };
  }
}

import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const url = request.nextUrl.clone();
  const path = url.pathname;

  const isPublicRoute =
    path === "/login" ||
    path === "/sw.js" ||
    path === "/manifest.json" ||
    path === "/manifest.webmanifest" ||
    path.startsWith("/api/public") ||
    path.startsWith("/verifikasi");

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Jika Supabase env belum disetel / placeholder, arahkan ke /login
  if (!supabaseUrl || !supabaseKey || supabaseUrl.includes("placeholder")) {
    if (!isPublicRoute) {
      url.pathname = "/login";
      if (path !== "/") {
        url.searchParams.set("redirect", path);
      }
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  let user = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch {
    user = null;
  }

  // 1. Belum login mencoba akses rute terproteksi (/admin atau /guru)
  if (!user) {
    if (!isPublicRoute) {
      url.pathname = "/login";
      if (path !== "/") {
        url.searchParams.set("redirect", path);
      }
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  // 2. Ambil profil user untuk validasi role
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, aktif")
    .eq("id", user.id)
    .single();

  const role = profile?.role;
  const isAktif = profile?.aktif;

  // Akun nonaktif
  if (profile && !isAktif && path !== "/login") {
    url.pathname = "/login";
    url.searchParams.set("error", "inactive");
    return NextResponse.redirect(url);
  }

  const actingAsCookie = request.cookies.get("acting_as")?.value;
  const isActingAs = role === "admin" && Boolean(actingAsCookie);

  // 3. User sudah login mengakses /login atau root /
  if (path === "/login" || path === "/") {
    if (role === "admin") {
      url.pathname = isActingAs ? "/guru/dashboard" : "/admin/dashboard";
      return NextResponse.redirect(url);
    }
    if (role === "guru") {
      url.pathname = "/guru/dashboard";
      return NextResponse.redirect(url);
    }
  }

  // 4. Proteksi rute /admin (hanya role admin)
  if (path.startsWith("/admin")) {
    if (role !== "admin") {
      url.pathname = "/guru/dashboard";
      return NextResponse.redirect(url);
    }
  }

  // 5. Proteksi rute /guru (guru, atau admin yang sedang act as)
  if (path.startsWith("/guru")) {
    if (role !== "guru" && !isActingAs) {
      if (role === "admin") {
        url.pathname = "/admin/dashboard";
        return NextResponse.redirect(url);
      }
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.webmanifest|manifest.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

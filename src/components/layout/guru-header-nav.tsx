"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboardIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function GuruHeaderNav() {
  const pathname = usePathname();
  const isDashboard = pathname === "/guru/dashboard";

  return (
    <>
      {/* Desktop Header Nav (>= md) */}
      <nav className="hidden md:flex items-center gap-1">
        <Link
          href="/guru/dashboard"
          prefetch={true}
          className={cn(
            "flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-150",
            isDashboard
              ? "bg-emerald-50 text-emerald-950 font-semibold ring-1 ring-emerald-500/25 shadow-2xs"
              : "text-zinc-600 hover:bg-emerald-50/50 hover:text-emerald-900"
          )}
        >
          <LayoutDashboardIcon
            className={cn(
              "h-4 w-4 transition-colors",
              isDashboard ? "text-emerald-700 stroke-[2.2]" : "text-zinc-400"
            )}
          />
          <span>Dashboard</span>
        </Link>
      </nav>

      {/* Mobile Bottom Dock (< md) */}
      <nav className="fixed bottom-0 inset-x-0 z-40 flex h-14 w-full items-center justify-around border-t border-zinc-200 bg-white/95 px-4 backdrop-blur-md md:hidden shadow-lg">
        <Link
          href="/guru/dashboard"
          className={cn(
            "flex items-center gap-2 rounded-xl px-4 py-2 transition-colors text-xs font-semibold",
            isDashboard
              ? "text-emerald-800 bg-emerald-50 ring-1 ring-emerald-500/25"
              : "text-zinc-600 hover:text-emerald-700"
          )}
        >
          <LayoutDashboardIcon className="h-4 w-4 text-emerald-700" />
          <span>Dashboard Guru</span>
        </Link>
      </nav>
    </>
  );
}

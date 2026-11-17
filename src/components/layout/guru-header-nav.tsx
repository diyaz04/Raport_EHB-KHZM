"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboardIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function GuruHeaderNav() {
  const pathname = usePathname();
  const isActive = pathname.startsWith("/guru");

  return (
    <nav className="hidden md:flex items-center gap-1">
      <Link
        href="/guru/dashboard"
        prefetch={true}
        className={cn(
          "flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-150",
          isActive
            ? "bg-emerald-50 text-emerald-950 font-semibold ring-1 ring-emerald-500/25 shadow-2xs"
            : "text-zinc-600 hover:bg-emerald-50/50 hover:text-emerald-900"
        )}
      >
        <LayoutDashboardIcon
          className={cn(
            "h-4 w-4 transition-colors",
            isActive ? "text-emerald-700 stroke-[2.2]" : "text-zinc-400"
          )}
        />
        <span>Dashboard</span>
      </Link>
    </nav>
  );
}

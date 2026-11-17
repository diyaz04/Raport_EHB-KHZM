"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  Menu,
  LayoutDashboard,
  Users,
  ClipboardList,
  UserCheck,
  Grid,
  ShieldCheck,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { AdminSidebarNav } from "./admin-sidebar-nav";
import { LogoutButton } from "@/components/logout-button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface AdminMobileNavProps {
  userEmail?: string;
  userName?: string;
}

export function AdminMobileNav({ userEmail, userName }: AdminMobileNavProps) {
  const [open, setOpen] = React.useState(false);
  const pathname = usePathname();

  const isTabActive = (href: string) => {
    if (href === "/admin/dashboard") {
      return pathname === "/admin/dashboard" || pathname === "/admin";
    }
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* 1. TOP MOBILE HEADER (Tampil hanya di < md) */}
      <header className="sticky top-0 z-40 flex h-14 w-full items-center justify-between border-b border-zinc-200 bg-white/95 px-4 backdrop-blur-md md:hidden">
        <Link href="/admin/dashboard" className="flex items-center gap-2.5">
          <Image
            src="/logo.png"
            alt="Logo KHZM"
            width={32}
            height={32}
            className="h-8 w-8 object-contain"
            priority
          />
          <div>
            <span className="text-sm font-bold leading-tight text-zinc-900 block">
              Raport KHZM
            </span>
            <span className="text-[10px] text-zinc-500 block">Administrator</span>
          </div>
        </Link>

        {/* Drawer Trigger Hamburger */}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 text-zinc-700 hover:bg-emerald-50 hover:text-emerald-800 transition-colors"
              aria-label="Buka Menu Navigasi"
            >
              <Menu className="h-5 w-5" />
            </button>
          </SheetTrigger>

          <SheetContent side="left" className="flex flex-col justify-between p-0 w-72 max-w-[85vw]">
            <SheetHeader className="sr-only">
              <SheetTitle>Menu Navigasi Administrator</SheetTitle>
            </SheetHeader>
            <div>
              {/* Header Drawer */}
              <div className="flex h-16 items-center gap-3 border-b border-zinc-200 px-5">
                <Image
                  src="/logo.png"
                  alt="Logo KHZM"
                  width={34}
                  height={34}
                  className="h-8 w-8 object-contain"
                />
                <div>
                  <div className="text-sm font-bold text-zinc-900 leading-tight">
                    Raport KHZM
                  </div>
                  <div className="text-[11px] text-zinc-500">Menu Administrator</div>
                </div>
              </div>

              {/* Menu List */}
              <div className="overflow-y-auto max-h-[calc(100vh-140px)]">
                <AdminSidebarNav onNavigate={() => setOpen(false)} />
              </div>
            </div>

            {/* Footer Drawer */}
            <div className="border-t border-zinc-200 p-4 space-y-3 bg-zinc-50/50">
              <div className="flex items-center justify-between">
                <div className="truncate mr-2">
                  <p className="text-xs font-semibold text-zinc-900 truncate">
                    {userName || "Administrator"}
                  </p>
                  <p className="text-[11px] text-zinc-500 truncate">{userEmail}</p>
                </div>
                <Badge variant="outline" className="border-emerald-600/30 text-emerald-800 text-[10px] shrink-0">
                  <ShieldCheck className="mr-1 h-3 w-3" />
                  Admin
                </Badge>
              </div>
              <LogoutButton className="h-8 text-xs border border-zinc-200" />
            </div>
          </SheetContent>
        </Sheet>
      </header>

      {/* 2. BOTTOM MOBILE NAVIGATION BAR (Sticky di bawah layar HP) */}
      <nav className="fixed bottom-0 inset-x-0 z-40 flex h-16 w-full items-center justify-around border-t border-zinc-200 bg-white/95 px-2 backdrop-blur-md md:hidden safe-area-pb shadow-lg">
        <Link
          href="/admin/dashboard"
          className={cn(
            "flex flex-col items-center justify-center gap-1 rounded-xl px-2.5 py-1.5 transition-colors",
            isTabActive("/admin/dashboard")
              ? "text-emerald-800 font-bold bg-emerald-50 ring-1 ring-emerald-500/25"
              : "text-zinc-500 hover:text-emerald-700"
          )}
        >
          <LayoutDashboard className="h-4 w-4" />
          <span className="text-[10px]">Dashboard</span>
        </Link>

        <Link
          href="/admin/santri"
          className={cn(
            "flex flex-col items-center justify-center gap-1 rounded-xl px-2.5 py-1.5 transition-colors",
            isTabActive("/admin/santri")
              ? "text-emerald-800 font-bold bg-emerald-50 ring-1 ring-emerald-500/25"
              : "text-zinc-500 hover:text-emerald-700"
          )}
        >
          <Users className="h-4 w-4" />
          <span className="text-[10px]">Santri</span>
        </Link>

        <Link
          href="/admin/ehb"
          className={cn(
            "flex flex-col items-center justify-center gap-1 rounded-xl px-2.5 py-1.5 transition-colors",
            isTabActive("/admin/ehb")
              ? "text-emerald-800 font-bold bg-emerald-50 ring-1 ring-emerald-500/25"
              : "text-zinc-500 hover:text-emerald-700"
          )}
        >
          <ClipboardList className="h-4 w-4" />
          <span className="text-[10px]">EHB</span>
        </Link>

        <Link
          href="/admin/guru"
          className={cn(
            "flex flex-col items-center justify-center gap-1 rounded-xl px-2.5 py-1.5 transition-colors",
            isTabActive("/admin/guru")
              ? "text-emerald-800 font-bold bg-emerald-50 ring-1 ring-emerald-500/25"
              : "text-zinc-500 hover:text-emerald-700"
          )}
        >
          <UserCheck className="h-4 w-4" />
          <span className="text-[10px]">Guru</span>
        </Link>

        {/* Tombol Menu Lengkap (Membuka Sheet) */}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={cn(
            "flex flex-col items-center justify-center gap-1 rounded-xl px-2.5 py-1.5 transition-colors",
            open
              ? "text-emerald-800 font-bold bg-emerald-50"
              : "text-zinc-500 hover:text-emerald-700"
          )}
        >
          <Grid className="h-4 w-4" />
          <span className="text-[10px]">Lainnya</span>
        </button>
      </nav>
    </>
  );
}

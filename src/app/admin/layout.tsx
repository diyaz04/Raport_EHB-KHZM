import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import {
  CalendarDaysIcon,
  CalendarRangeIcon,
  GraduationCapIcon,
  LayoutDashboardIcon,
  ShieldCheckIcon,
  BookOpenIcon,
  BookmarkIcon,
  ListOrderedIcon,
  UsersIcon,
  UserCheckIcon,
  ClipboardListIcon,
} from "lucide-react";
import { getEffectiveContext } from "@/lib/auth/context";
import { ActAsBanner } from "@/components/act-as-banner";
import { LogoutButton } from "@/components/logout-button";
import { Badge } from "@/components/ui/badge";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const context = await getEffectiveContext();

  return (
    <div className="flex min-h-screen bg-zinc-50/50">
      {/* SIDEBAR ADMIN */}
      <aside className="w-64 shrink-0 border-r border-zinc-200 bg-white flex flex-col justify-between">
        <div>
          {/* Header Sidebar */}
          <div className="flex h-16 items-center gap-3 border-b border-zinc-200 px-6">
            <Image
              src="/logo.png"
              alt="Logo KH Zumratul Muttaqin"
              width={36}
              height={36}
              className="h-9 w-9 object-contain shrink-0"
              priority
            />
            <div>
              <div className="text-sm font-bold text-zinc-900 leading-tight">
                Raport KHZM
              </div>
              <div className="text-xs text-zinc-500">Panel Administrator</div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-6 p-4">
            <div>
              <Link
                href="/admin/dashboard"
                prefetch={true}
                className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 transition-colors"
              >
                <LayoutDashboardIcon className="h-4 w-4 text-primary" />
                <span>Dashboard</span>
              </Link>
            </div>

            <div>
              <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                Data Akademik
              </div>
              <div className="space-y-1">
                <Link
                  href="/admin/tahun-ajaran"
                  prefetch={true}
                  className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 transition-colors"
                >
                  <CalendarDaysIcon className="h-4 w-4 text-zinc-500" />
                  <span>Tahun Ajaran</span>
                </Link>

                <Link
                  href="/admin/semester"
                  prefetch={true}
                  className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 transition-colors"
                >
                  <CalendarRangeIcon className="h-4 w-4 text-zinc-500" />
                  <span>Semester</span>
                </Link>

                <Link
                  href="/admin/marhalah"
                  prefetch={true}
                  className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 transition-colors"
                >
                  <GraduationCapIcon className="h-4 w-4 text-zinc-500" />
                  <span>Marhalah</span>
                </Link>
              </div>
            </div>

            <div>
              <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                Kesiswaan
              </div>
              <div className="space-y-1">
                <Link
                  href="/admin/santri"
                  prefetch={true}
                  className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 transition-colors"
                >
                  <UsersIcon className="h-4 w-4 text-zinc-500" />
                  <span>Data Santri</span>
                </Link>
              </div>
            </div>

            <div>
              <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                Pendidik & Staf
              </div>
              <div className="space-y-1">
                <Link
                  href="/admin/guru"
                  prefetch={true}
                  className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 transition-colors"
                >
                  <UserCheckIcon className="h-4 w-4 text-zinc-500" />
                  <span>Guru & Penugasan</span>
                </Link>
              </div>
            </div>

            <div>
              <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                Kurikulum
              </div>
              <div className="space-y-1">
                <Link
                  href="/admin/mapel"
                  prefetch={true}
                  className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 transition-colors"
                >
                  <BookOpenIcon className="h-4 w-4 text-zinc-500" />
                  <span>Mata Pelajaran</span>
                </Link>

                <Link
                  href="/admin/kitab"
                  prefetch={true}
                  className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 transition-colors"
                >
                  <BookmarkIcon className="h-4 w-4 text-zinc-500" />
                  <span>Kitab</span>
                </Link>

                <Link
                  href="/admin/kurikulum"
                  prefetch={true}
                  className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 transition-colors"
                >
                  <ListOrderedIcon className="h-4 w-4 text-zinc-500" />
                  <span>Atur Kurikulum</span>
                </Link>
              </div>
            </div>

            <div>
              <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                Ujian Pesantren
              </div>
              <div className="space-y-1">
                <Link
                  href="/admin/ehb"
                  prefetch={true}
                  className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 transition-colors"
                >
                  <ClipboardListIcon className="h-4 w-4 text-zinc-500" />
                  <span>Jadwal & Ruang EHB</span>
                </Link>
              </div>
            </div>
          </nav>
        </div>

        {/* User Info & Logout Footer */}
        <div className="border-t border-zinc-200 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="truncate">
              <p className="text-sm font-medium text-zinc-900 truncate">
                {context.profile?.nama ?? context.user?.email ?? "Administrator"}
              </p>
              <p className="text-xs text-zinc-500 truncate">{context.user?.email}</p>
            </div>
            <Badge variant="outline" className="border-primary/30 text-primary text-[10px] shrink-0">
              <ShieldCheckIcon className="mr-1 h-3 w-3" />
              Admin
            </Badge>
          </div>
          <LogoutButton />
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {context.isActingAs && context.effectiveGuruName ? (
          <ActAsBanner guruName={context.effectiveGuruName} />
        ) : null}
        <main className="flex-1 overflow-y-auto p-6 md:p-8">{children}</main>
      </div>
    </div>
  );
}

"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDaysIcon,
  CalendarRangeIcon,
  GraduationCapIcon,
  LayoutDashboardIcon,
  BookOpenIcon,
  BookmarkIcon,
  ListOrderedIcon,
  UsersIcon,
  UserCheckIcon,
  ClipboardListIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavGroup {
  groupLabel?: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    items: [
      {
        label: "Dashboard",
        href: "/admin/dashboard",
        icon: LayoutDashboardIcon,
      },
    ],
  },
  {
    groupLabel: "Data Akademik",
    items: [
      {
        label: "Tahun Ajaran",
        href: "/admin/tahun-ajaran",
        icon: CalendarDaysIcon,
      },
      {
        label: "Semester",
        href: "/admin/semester",
        icon: CalendarRangeIcon,
      },
      {
        label: "Marhalah",
        href: "/admin/marhalah",
        icon: GraduationCapIcon,
      },
    ],
  },
  {
    groupLabel: "Kesiswaan",
    items: [
      {
        label: "Data Santri",
        href: "/admin/santri",
        icon: UsersIcon,
      },
    ],
  },
  {
    groupLabel: "Pendidik & Staf",
    items: [
      {
        label: "Guru & Penugasan",
        href: "/admin/guru",
        icon: UserCheckIcon,
      },
    ],
  },
  {
    groupLabel: "Kurikulum",
    items: [
      {
        label: "Mata Pelajaran",
        href: "/admin/mapel",
        icon: BookOpenIcon,
      },
      {
        label: "Kitab",
        href: "/admin/kitab",
        icon: BookmarkIcon,
      },
      {
        label: "Atur Kurikulum",
        href: "/admin/kurikulum",
        icon: ListOrderedIcon,
      },
    ],
  },
  {
    groupLabel: "Ujian Pesantren",
    items: [
      {
        label: "Jadwal & Ruang EHB",
        href: "/admin/ehb",
        icon: ClipboardListIcon,
      },
    ],
  },
];

export function AdminSidebarNav() {
  const pathname = usePathname();

  const isItemActive = (href: string) => {
    if (href === "/admin/dashboard") {
      return pathname === "/admin/dashboard" || pathname === "/admin";
    }
    return pathname.startsWith(href);
  };

  return (
    <nav className="space-y-5 p-3.5">
      {navGroups.map((group, idx) => (
        <div key={group.groupLabel || idx} className="space-y-1">
          {group.groupLabel ? (
            <div className="px-3 pb-1.5 text-[11px] font-bold uppercase tracking-wider text-zinc-400">
              {group.groupLabel}
            </div>
          ) : null}

          <div className="space-y-1">
            {group.items.map((item) => {
              const Icon = item.icon;
              const active = isItemActive(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch={true}
                  className={cn(
                    "group relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-150",
                    active
                      ? "bg-emerald-50 text-emerald-950 font-semibold ring-1 ring-emerald-500/25 shadow-2xs"
                      : "text-zinc-600 hover:bg-emerald-50/50 hover:text-emerald-900"
                  )}
                >
                  {/* Active Indicator Bar Hijau Segar di Sisi Kiri */}
                  {active && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r-full bg-emerald-600" />
                  )}

                  <Icon
                    className={cn(
                      "h-4 w-4 shrink-0 transition-colors",
                      active
                        ? "text-emerald-700 stroke-[2.2]"
                        : "text-zinc-400 group-hover:text-emerald-700"
                    )}
                  />

                  <span className="truncate">{item.label}</span>

                  {/* Dot Hijau Muda Segar di Ujung Kanan Saat Aktif */}
                  {active && (
                    <span className="ml-auto flex h-2 w-2 relative shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600" />
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

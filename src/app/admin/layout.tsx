import * as React from "react";
import Image from "next/image";
import { ShieldCheckIcon } from "lucide-react";
import { getEffectiveContext } from "@/lib/auth/context";
import { ActAsBanner } from "@/components/act-as-banner";
import { LogoutButton } from "@/components/logout-button";
import { Badge } from "@/components/ui/badge";
import { AdminSidebarNav } from "@/components/layout/admin-sidebar-nav";

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

          {/* Navigation Links with Elegant Fresh Green Active Highlight */}
          <AdminSidebarNav />
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

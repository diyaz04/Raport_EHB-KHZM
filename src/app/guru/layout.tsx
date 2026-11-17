import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { GraduationCapIcon } from "lucide-react";
import { getEffectiveContext } from "@/lib/auth/context";
import { ActAsBanner } from "@/components/act-as-banner";
import { LogoutButton } from "@/components/logout-button";
import { Badge } from "@/components/ui/badge";
import { GuruHeaderNav } from "@/components/layout/guru-header-nav";

export default async function GuruLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const context = await getEffectiveContext();

  return (
    <div className="min-h-screen flex flex-col bg-zinc-50/50">
      {/* BANNER ACT AS JIKA AKTIF */}
      {context.isActingAs && context.effectiveGuruName ? (
        <ActAsBanner guruName={context.effectiveGuruName} />
      ) : null}

      {/* HEADER GURU */}
      <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white">
        <div className="container mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-6">
            <Link href="/guru/dashboard" className="flex items-center gap-2.5">
              <Image
                src="/logo.png"
                alt="Logo KH Zumratul Muttaqin"
                width={36}
                height={36}
                className="h-9 w-9 object-contain shrink-0"
                priority
              />
              <div>
                <span className="text-sm font-bold text-zinc-900 block leading-tight">
                  Raport KHZM
                </span>
                <span className="text-xs text-zinc-500 block">Panel Guru & Wali Kelas</span>
              </div>
            </Link>

            <GuruHeaderNav />
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-zinc-900">
                {context.effectiveGuruName ?? context.profile?.nama ?? "Guru"}
              </p>
              <div className="flex items-center justify-end gap-1.5">
                <Badge variant="outline" className="border-emerald-600/30 text-emerald-800 text-[10px]">
                  <GraduationCapIcon className="mr-1 h-3 w-3" />
                  Guru
                </Badge>
                {context.isActingAs ? (
                  <Badge variant="secondary" className="bg-amber-100 text-amber-900 text-[10px]">
                    Act As
                  </Badge>
                ) : null}
              </div>
            </div>
            <div className="w-28">
              <LogoutButton className="h-8 text-xs border border-zinc-200" />
            </div>
          </div>
        </div>
      </header>

      {/* MAIN BODY GURU */}
      <main className="flex-1 container mx-auto max-w-7xl p-4 sm:p-6 md:p-8 pb-20 md:pb-8">
        {children}
      </main>
    </div>
  );
}

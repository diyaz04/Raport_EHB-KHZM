"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { BookOpen, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginAction } from "./actions";
import { notify } from "@/lib/notify";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTarget = searchParams.get("redirect") || "";
  const [isPending, startTransition] = React.useTransition();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const res = await loginAction(formData);
      if (res.ok) {
        notify.success(res.message);
        router.push(redirectTarget || res.redirectTo || "/");
        router.refresh();
      } else {
        notify.error(res.message);
      }
    });
  };

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Top Header di Atas Card (Matching Reference) */}
      <div className="text-center mb-6">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-md shadow-emerald-600/25 mb-3">
          <BookOpen className="h-6 w-6 stroke-[2.2]" />
        </div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900">
          Rapor Digital
        </h1>
        <p className="text-xs sm:text-sm text-zinc-500 font-medium mt-0.5">
          Pondok Pesantren KH. Zumrotul Muttaqin
        </p>
      </div>

      {/* Card Form Login */}
      <div className="rounded-2xl border border-zinc-200/80 bg-white p-6 sm:p-8 shadow-xs">
        <div className="mb-6">
          <h2 className="text-base font-bold text-zinc-900">Masuk</h2>
          <p className="text-xs text-zinc-500 mt-1">
            Gunakan akun guru atau admin yang diberikan madrasah/pesantren.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs font-semibold text-zinc-700">
              Email
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="nama@madrasah.sch.id"
              autoComplete="email"
              required
              className="h-10 text-sm rounded-lg border-zinc-200 focus-visible:ring-emerald-600 focus-visible:border-emerald-600"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-xs font-semibold text-zinc-700">
              Kata sandi
            </Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              autoComplete="current-password"
              required
              className="h-10 text-sm rounded-lg border-zinc-200 focus-visible:ring-emerald-600 focus-visible:border-emerald-600"
            />
          </div>

          <Button
            type="submit"
            disabled={isPending}
            className="w-full h-10 mt-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold rounded-lg shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Memproses...</span>
              </>
            ) : (
              "Masuk"
            )}
          </Button>
        </form>
      </div>

      {/* Footer Info di Bawah Card */}
      <div className="text-center mt-6 space-y-4">
        <p className="text-xs text-zinc-500">
          Lupa kata sandi?{" "}
          <span className="text-emerald-700 font-semibold cursor-pointer hover:underline">
            Hubungi admin madrasah.
          </span>
        </p>

        <p className="text-xs italic text-zinc-400">
          Bersama membangun generasi berakhlak, berilmu, dan berprestasi
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen w-full bg-white">
      {/* ========================================================================= */}
      {/* KOLOM KIRI: HERO BRANDING DENGAN BACKGROUND SANTRI & GREEN OVERLAY        */}
      {/* ========================================================================= */}
      <div className="relative hidden w-1/2 flex-col justify-between p-10 xl:p-14 lg:flex overflow-hidden">
        {/* Background Image dari Gambar 2 */}
        <Image
          src="/login-bg.jpg"
          alt="Santri Pondok Pesantren KH. Zumrotul Muttaqin"
          fill
          priority
          sizes="50vw"
          className="object-cover object-center"
        />

        {/* Emerald Green Overlay Gradient (Sesuai Referensi Gambar 1) */}
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/90 via-emerald-950/85 to-teal-950/92 backdrop-blur-[0.5px]" />

        {/* 1. Header Kiri: Logo Pondok Pesantren */}
        <div className="relative z-10 flex items-center gap-3">
          <Image
            src="/logo.png"
            alt="Logo Pondok Pesantren KH. Zumrotul Muttaqin"
            width={60}
            height={60}
            className="h-14 w-14 object-contain filter drop-shadow-md"
            priority
          />
        </div>

        {/* 2. Konten Tengah: Selamat Datang di Rapor Digital */}
        <div className="relative z-10 my-auto py-12 max-w-lg space-y-4">
          <div className="space-y-2">
            <p className="text-emerald-300 font-semibold text-sm sm:text-base tracking-wider uppercase">
              Selamat Datang di
            </p>
            <h1 className="text-3xl sm:text-4xl xl:text-5xl font-black text-white tracking-tight leading-tight">
              Rapor <span className="text-emerald-300">Digital</span>
            </h1>
            <p className="text-lg sm:text-xl font-bold text-white/95 tracking-wide">
              Pondok Pesantren KH. Zumrotul Muttaqin
            </p>
          </div>
          <p className="text-xs sm:text-sm text-emerald-100/85 leading-relaxed font-normal pt-1 max-w-md">
            Transparansi, akurat, dan mudah diakses untuk mendukung evaluasi hasil belajar dan prestasi santri.
          </p>
        </div>

        {/* 3. Footer Kiri: Hak Cipta */}
        <div className="relative z-10 text-xs text-emerald-200/70 font-medium">
          &copy; {new Date().getFullYear()} Rapor Digital Pondok Pesantren KH. Zumrotul Muttaqin
        </div>
      </div>

      {/* ========================================================================= */}
      {/* KOLOM KANAN: FORM LOGIN                                                  */}
      {/* ========================================================================= */}
      <div className="flex w-full lg:w-1/2 flex-col items-center justify-center p-6 sm:p-10 lg:p-12 bg-white min-h-screen">
        {/* Logo Tambahan Khusus Tampilan Mobile saat Kolom Kiri Tersembunyi */}
        <div className="mb-4 lg:hidden">
          <Image
            src="/logo.png"
            alt="Logo Pondok Pesantren KH. Zumrotul Muttaqin"
            width={52}
            height={52}
            className="h-13 w-13 object-contain mx-auto"
            priority
          />
        </div>

        <React.Suspense
          fallback={
            <div className="flex items-center gap-2 text-sm text-zinc-500">
              <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
              <span>Memuat form login...</span>
            </div>
          }
        >
          <LoginForm />
        </React.Suspense>
      </div>
    </div>
  );
}

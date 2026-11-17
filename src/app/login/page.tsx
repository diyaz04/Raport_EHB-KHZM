"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
    <Card className="w-full max-w-md border-zinc-200 bg-white shadow-sm">
      <CardHeader className="space-y-1 text-center">
        <Image
          src="/logo.png"
          alt="Logo KH Zumratul Muttaqin"
          width={64}
          height={64}
          className="mx-auto mb-2 h-16 w-16 object-contain"
          priority
        />
        <CardTitle className="text-2xl font-bold tracking-tight text-zinc-900">
          Masuk ke Sistem
        </CardTitle>
        <CardDescription className="text-zinc-500">
          Aplikasi EHB dan Raport KH. Zumratul Muttaqin
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Alamat Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="nama@email.com"
              autoComplete="email"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Kata Sandi</Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
          </div>
        </CardContent>
        <CardFooter className="pt-2">
          <Button
            type="submit"
            disabled={isPending}
            className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-medium"
          >
            {isPending ? "Memproses..." : "Masuk ke Sistem"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-4">
      <React.Suspense fallback={<div className="text-sm text-muted-foreground">Memuat form...</div>}>
        <LoginForm />
      </React.Suspense>
    </div>
  );
}

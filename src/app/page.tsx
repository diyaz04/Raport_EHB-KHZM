import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { LogInIcon } from "lucide-react";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-white text-zinc-900">
      <div className="mb-6 flex items-center justify-center">
        <Image
          src="/logo.png"
          alt="Logo KH Zumratul Muttaqin"
          width={96}
          height={96}
          className="h-24 w-24 object-contain drop-shadow-sm"
          priority
        />
      </div>
      <h1 className="text-3xl font-bold tracking-tight text-center">
        Raport KH Zumratul Muttaqin
      </h1>
      <p className="mt-2 text-sm text-zinc-500 text-center max-w-md">
        Sistem Informasi Evaluasi Hasil Belajar & Pengelolaan Raport Santri
      </p>
      <div className="mt-8 flex gap-4">
        <Button asChild>
          <Link href="/login">
            <LogInIcon className="mr-2 h-4 w-4" />
            Masuk ke Sistem
          </Link>
        </Button>
      </div>
    </main>
  );
}

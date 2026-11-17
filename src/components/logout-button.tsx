"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { LogOutIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { logoutAction } from "@/app/login/actions";
import { notify } from "@/lib/notify";

export function LogoutButton({ className }: { className?: string }) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();

  const handleLogout = () => {
    startTransition(async () => {
      const res = await logoutAction();
      if (res.ok) {
        notify.success(res.message);
        router.push(res.redirectTo || "/login");
        router.refresh();
      } else {
        notify.error(res.message);
      }
    });
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={isPending}
      onClick={handleLogout}
      className={className ?? "w-full justify-start text-zinc-600 hover:text-destructive hover:bg-red-50"}
    >
      <LogOutIcon className="mr-2 h-4 w-4" />
      {isPending ? "Memproses..." : "Keluar Akun"}
    </Button>
  );
}

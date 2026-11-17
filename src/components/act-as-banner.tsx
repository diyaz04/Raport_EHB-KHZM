"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AlertTriangleIcon, LogOutIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { stopActAsAction } from "@/app/actions/act-as";
import { notify } from "@/lib/notify";

interface ActAsBannerProps {
  guruName: string;
}

export function ActAsBanner({ guruName }: ActAsBannerProps) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();

  const handleStopActAs = () => {
    startTransition(async () => {
      const res = await stopActAsAction();
      if (res.ok) {
        notify.success(res.message);
        router.push("/admin/dashboard");
        router.refresh();
      } else {
        notify.error(res.message);
      }
    });
  };

  return (
    <aside
      aria-label="Notifikasi Mode Bertindak"
      className="sticky top-0 z-50 flex w-full items-center justify-between border-b border-amber-300 bg-amber-50 px-4 py-2.5 text-amber-900 shadow-xs"
    >
      <div className="flex items-center gap-2 text-sm font-medium">
        <AlertTriangleIcon className="h-4 w-4 shrink-0 text-amber-600" />
        <span>
          Anda sedang bertindak sebagai <strong>{guruName}</strong>
        </span>
      </div>
      <Button
        size="sm"
        variant="outline"
        disabled={isPending}
        onClick={handleStopActAs}
        className="h-8 border-amber-400 bg-white text-xs font-semibold text-amber-950 hover:bg-amber-100 hover:text-amber-950"
      >
        <LogOutIcon className="mr-1.5 h-3.5 w-3.5" />
        {isPending ? "Keluar..." : "Keluar Mode Bertindak"}
      </Button>
    </aside>
  );
}

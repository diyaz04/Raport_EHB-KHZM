"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { UserCheckIcon, ArrowRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { startActAsAction } from "@/app/actions/act-as";
import { notify } from "@/lib/notify";

export interface GuruItem {
  id: string;
  nama: string;
}

export function ActAsSelector({ guruList }: { guruList: GuruItem[] }) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();

  const handleStartActAs = (guruId: string) => {
    startTransition(async () => {
      const res = await startActAsAction(guruId);
      if (res.ok) {
        notify.success(res.message);
        router.push("/guru/dashboard");
        router.refresh();
      } else {
        notify.error(res.message);
      }
    });
  };

  if (guruList.length === 0) {
    return (
      <div className="text-sm text-zinc-500 py-3 text-center rounded-md border border-dashed border-zinc-200">
        Belum ada guru terdaftar di database untuk simulasi Act As.
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {guruList.map((guru) => (
        <div
          key={guru.id}
          className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white p-3.5 shadow-2xs hover:border-zinc-300 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-50 text-primary">
              <UserCheckIcon className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-900">{guru.nama}</p>
              <p className="text-xs text-zinc-400 font-mono">ID: {guru.id.slice(0, 8)}...</p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            disabled={isPending}
            onClick={() => handleStartActAs(guru.id)}
            className="h-8 text-xs font-medium border-zinc-300 hover:bg-zinc-50"
          >
            {isPending ? "Memproses..." : "Bertindak"}
            <ArrowRightIcon className="ml-1 h-3 w-3" />
          </Button>
        </div>
      ))}
    </div>
  );
}

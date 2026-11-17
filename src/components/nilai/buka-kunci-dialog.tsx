"use client";

import * as React from "react";
import { UnlockIcon, AlertTriangleIcon, Loader2Icon } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { notify } from "@/lib/notify";
import { bukaKunciRaportAction } from "@/app/actions/finalisasi";

interface BukaKunciDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  marhalahId: string;
  semesterId: string;
  marhalahNama: string;
  onSuccess?: () => void;
}

export function BukaKunciDialog({
  open,
  onOpenChange,
  marhalahId,
  semesterId,
  marhalahNama,
  onSuccess,
}: BukaKunciDialogProps) {
  const [isPending, startTransition] = React.useTransition();

  const handleBukaKunci = () => {
    startTransition(async () => {
      const res = await bukaKunciRaportAction(marhalahId, semesterId);
      if (res.ok) {
        notify.success(res.message);
        onOpenChange(false);
        if (onSuccess) onSuccess();
        window.location.reload();
      } else {
        notify.error(res.message);
      }
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-[480px]">
        <AlertDialogHeader>
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangleIcon className="h-5 w-5" />
            <AlertDialogTitle>Buka Kunci Raport Kelas?</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-xs space-y-2 pt-1 text-zinc-600">
            <p>
              Tindakan ini akan membatalkan status final untuk marhalah <strong>{marhalahNama}</strong> dan mengembalikan status kelas ke <strong>DRAFT</strong>.
            </p>
            <div className="rounded-md border border-amber-200 bg-amber-50 p-2.5 text-[11px] text-amber-900 space-y-1">
              <p className="font-semibold">Dampak Pembukaan Kunci:</p>
              <ul className="list-disc pl-4 space-y-0.5">
                <li>Seluruh data urutan peringkat santri di tabel <code>peringkat_final</code> kelas ini akan dihapus.</li>
                <li>Lembar nilai akan kembali terbuka untuk diedit oleh Guru Pengampu dan Wali Kelas.</li>
                <li>Tindakan pembukaan kunci ini akan dicatat ke dalam log audit sistem.</li>
              </ul>
            </div>
            <p className="text-[11px] text-zinc-500 pt-1">
              Apakah Anda yakin ingin melanjutkan pembukaan kunci raport?
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter className="pt-2">
          <AlertDialogCancel disabled={isPending}>Batal</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleBukaKunci();
            }}
            disabled={isPending}
            className="bg-destructive hover:bg-destructive/90 text-white gap-1.5"
          >
            {isPending ? (
              <>
                <Loader2Icon className="h-4 w-4 animate-spin" />
                Membuka Kunci...
              </>
            ) : (
              <>
                <UnlockIcon className="h-4 w-4" />
                Buka Kunci Raport
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

"use client";

import * as React from "react";
import { PlusIcon, EditIcon, Trash2Icon, CheckCircle2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DataTable, type ColumnDef } from "@/components/ui/data-table";
import { useConfirm } from "@/hooks/use-confirm";
import { notify } from "@/lib/notify";
import {
  createTahunAjaranAction,
  updateTahunAjaranAction,
  deleteTahunAjaranAction,
  setAktifTahunAjaranAction,
} from "@/app/admin/actions/akademik";
import { tahunAjaranSchema, type TahunAjaranFormValues } from "@/lib/validations/akademik";

export interface TahunAjaranRecord {
  id: string;
  nama: string;
  kode: string;
  aktif: boolean;
  created_at: string;
}

export function TahunAjaranClient({ initialData }: { initialData: TahunAjaranRecord[] }) {
  const confirm = useConfirm();
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [editingItem, setEditingItem] = React.useState<TahunAjaranRecord | null>(null);
  const [isPending, startTransition] = React.useTransition();

  const [formNama, setFormNama] = React.useState("");
  const [formKode, setFormKode] = React.useState("");
  const [formAktif, setFormAktif] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const data = initialData;

  const openAddDialog = () => {
    setEditingItem(null);
    setFormNama("");
    setFormKode("");
    setFormAktif(data.length === 0); // Default aktif jika data pertama
    setErrors({});
    setIsDialogOpen(true);
  };

  const openEditDialog = (item: TahunAjaranRecord) => {
    setEditingItem(item);
    setFormNama(item.nama);
    setFormKode(item.kode);
    setFormAktif(item.aktif);
    setErrors({});
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const formValues: TahunAjaranFormValues = {
      nama: formNama,
      kode: formKode,
      aktif: formAktif,
    };

    const parsed = tahunAjaranSchema.safeParse(formValues);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      parsed.error.issues.forEach((err) => {
        if (err.path[0]) fieldErrors[err.path[0].toString()] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    startTransition(async () => {
      if (editingItem) {
        const res = await updateTahunAjaranAction(editingItem.id, parsed.data);
        if (res.ok) {
          notify.success(res.message);
          setIsDialogOpen(false);
        } else {
          notify.error(res.message);
        }
      } else {
        const res = await createTahunAjaranAction(parsed.data);
        if (res.ok) {
          notify.success(res.message);
          setIsDialogOpen(false);
        } else {
          notify.error(res.message);
        }
      }
    });
  };

  const handleSetAktif = (item: TahunAjaranRecord) => {
    startTransition(async () => {
      const res = await setAktifTahunAjaranAction(item.id);
      if (res.ok) {
        notify.success(res.message);
      } else {
        notify.error(res.message);
      }
    });
  };

  const handleDelete = async (item: TahunAjaranRecord) => {
    const isConfirmed = await confirm({
      title: "Hapus Tahun Ajaran",
      description: `Apakah Anda yakin ingin menghapus Tahun Ajaran ${item.nama}? Data yang memiliki relasi ke semester aktif tidak dapat dihapus.`,
      destructive: true,
      confirmText: "Hapus",
      cancelText: "Batal",
    });

    if (isConfirmed) {
      startTransition(async () => {
        const res = await deleteTahunAjaranAction(item.id);
        if (res.ok) {
          notify.success(res.message);
        } else {
          notify.error(res.message);
        }
      });
    }
  };

  const columns: ColumnDef<TahunAjaranRecord>[] = [
    {
      accessorKey: "kode",
      header: "Kode",
      cell: ({ row }) => (
        <span className="font-mono font-medium text-xs bg-zinc-100 px-2 py-0.5 rounded border border-zinc-200">
          {row.getValue("kode")}
        </span>
      ),
    },
    {
      accessorKey: "nama",
      header: "Tahun Ajaran",
      cell: ({ row }) => (
        <span className="font-semibold text-zinc-900">{row.getValue("nama")}</span>
      ),
    },
    {
      accessorKey: "aktif",
      header: "Status",
      cell: ({ row }) => {
        const isAktif = row.original.aktif;
        return isAktif ? (
          <Badge className="bg-emerald-700 text-white hover:bg-emerald-800">
            <CheckCircle2Icon className="mr-1 h-3 w-3" />
            Aktif
          </Badge>
        ) : (
          <Button
            size="sm"
            variant="outline"
            disabled={isPending}
            onClick={() => handleSetAktif(row.original)}
            className="h-7 text-xs text-zinc-600 hover:text-zinc-900"
          >
            Aktifkan
          </Button>
        );
      },
    },
    {
      id: "actions",
      header: () => <div className="text-right">Aksi</div>,
      cell: ({ row }) => {
        const item = row.original;
        return (
          <div className="flex items-center justify-end gap-1.5">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => openEditDialog(item)}
              className="h-8 w-8 p-0 text-zinc-600 hover:text-zinc-900"
            >
              <EditIcon className="h-3.5 w-3.5" />
              <span className="sr-only">Edit</span>
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={isPending || item.aktif}
              onClick={() => handleDelete(item)}
              className="h-8 w-8 p-0 text-zinc-400 hover:text-destructive hover:bg-red-50"
            >
              <Trash2Icon className="h-3.5 w-3.5" />
              <span className="sr-only">Hapus</span>
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-zinc-900">
            Kelola Tahun Ajaran
          </h2>
          <p className="text-xs text-zinc-500">
            Hanya satu tahun ajaran yang boleh aktif pada satu waktu sistem.
          </p>
        </div>
        <Button onClick={openAddDialog} size="sm" className="h-9">
          <PlusIcon className="mr-1.5 h-4 w-4" />
          Tambah Tahun Ajaran
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={data}
        searchKey="nama"
        searchPlaceholder="Cari nama tahun ajaran (mis. 2025/2026)..."
      />

      {/* DIALOG TAMBAH / UBAH */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? "Ubah Tahun Ajaran" : "Tambah Tahun Ajaran"}
            </DialogTitle>
            <DialogDescription>
              Isi data tahun ajaran di bawah ini. Pastikan kode terdiri dari 4 digit angka.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="nama">Nama Tahun Ajaran</Label>
              <Input
                id="nama"
                placeholder="2025/2026"
                value={formNama}
                onChange={(e) => setFormNama(e.target.value)}
              />
              {errors.nama ? (
                <p className="text-xs text-destructive">{errors.nama}</p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="kode">Kode (4 digit)</Label>
              <Input
                id="kode"
                placeholder="2526"
                maxLength={4}
                value={formKode}
                onChange={(e) => setFormKode(e.target.value)}
              />
              {errors.kode ? (
                <p className="text-xs text-destructive">{errors.kode}</p>
              ) : null}
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                id="aktif"
                type="checkbox"
                checked={formAktif}
                onChange={(e) => setFormAktif(e.target.checked)}
                className="h-4 w-4 rounded border-zinc-300 text-primary focus:ring-primary"
              />
              <Label htmlFor="aktif" className="text-sm font-normal cursor-pointer">
                Jadikan tahun ajaran ini aktif sekarang
              </Label>
            </div>

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
              >
                Batal
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Menyimpan..." : "Simpan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

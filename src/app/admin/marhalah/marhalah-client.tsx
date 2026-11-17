"use client";

import * as React from "react";
import Link from "next/link";
import { PlusIcon, EditIcon, Trash2Icon, LayersIcon, FileSpreadsheetIcon } from "lucide-react";
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
  createMarhalahAction,
  updateMarhalahAction,
  softDeleteMarhalahAction,
} from "@/app/admin/actions/akademik";
import { marhalahSchema, type MarhalahFormValues } from "@/lib/validations/akademik";

export interface MarhalahRecord {
  id: string;
  nama: string;
  kode: string;
  urutan: number;
  deleted_at: string | null;
  created_at: string;
}

export function MarhalahClient({ initialData }: { initialData: MarhalahRecord[] }) {
  const confirm = useConfirm();
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [editingItem, setEditingItem] = React.useState<MarhalahRecord | null>(null);
  const [isPending, startTransition] = React.useTransition();

  const [formNama, setFormNama] = React.useState("");
  const [formKode, setFormKode] = React.useState("");
  const [formUrutan, setFormUrutan] = React.useState(1);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const data = initialData;

  const openAddDialog = () => {
    setEditingItem(null);
    setFormNama("");
    setFormKode("");
    const maxUrutan = data.reduce((max, item) => Math.max(max, item.urutan), 0);
    setFormUrutan(maxUrutan + 1);
    setErrors({});
    setIsDialogOpen(true);
  };

  const openEditDialog = (item: MarhalahRecord) => {
    setEditingItem(item);
    setFormNama(item.nama);
    setFormKode(item.kode);
    setFormUrutan(item.urutan);
    setErrors({});
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const formValues: MarhalahFormValues = {
      nama: formNama,
      kode: formKode,
      urutan: Number(formUrutan),
    };

    const parsed = marhalahSchema.safeParse(formValues);
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
        const res = await updateMarhalahAction(editingItem.id, parsed.data);
        if (res.ok) {
          notify.success(res.message);
          setIsDialogOpen(false);
        } else {
          notify.error(res.message);
        }
      } else {
        const res = await createMarhalahAction(parsed.data);
        if (res.ok) {
          notify.success(res.message);
          setIsDialogOpen(false);
        } else {
          notify.error(res.message);
        }
      }
    });
  };

  const handleSoftDelete = async (item: MarhalahRecord) => {
    const isConfirmed = await confirm({
      title: "Hapus Marhalah",
      description: `Apakah Anda yakin ingin menghapus Marhalah "${item.nama}" (${item.kode})? Data akan dihapus secara soft-delete (arsip).`,
      destructive: true,
      confirmText: "Hapus Marhalah",
      cancelText: "Batal",
    });

    if (isConfirmed) {
      startTransition(async () => {
        const res = await softDeleteMarhalahAction(item.id);
        if (res.ok) {
          notify.success(res.message);
        } else {
          notify.error(res.message);
        }
      });
    }
  };

  const columns: ColumnDef<MarhalahRecord>[] = [
    {
      accessorKey: "urutan",
      header: "Urutan",
      cell: ({ row }) => (
        <span className="font-mono text-xs font-semibold text-zinc-500">
          #{row.original.urutan}
        </span>
      ),
    },
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
      header: "Nama Marhalah / Jenjang",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <LayersIcon className="h-4 w-4 text-primary shrink-0" />
          <span className="font-semibold text-zinc-900">{row.getValue("nama")}</span>
        </div>
      ),
    },
    {
      accessorKey: "deleted_at",
      header: "Status",
      cell: ({ row }) => {
        const isDeleted = Boolean(row.original.deleted_at);
        return isDeleted ? (
          <Badge variant="destructive" className="text-xs">
            Terhapus (Arsip)
          </Badge>
        ) : (
          <Badge variant="outline" className="border-emerald-600/30 text-emerald-800 text-xs">
            Aktif
          </Badge>
        );
      },
    },
    {
      id: "actions",
      header: () => <div className="text-right">Aksi</div>,
      cell: ({ row }) => {
        const item = row.original;
        if (item.deleted_at) {
          return <span className="text-xs text-zinc-400 italic">Diarsipkan</span>;
        }

        return (
          <div className="flex items-center justify-end gap-1.5">
            <Button
              size="sm"
              variant="outline"
              asChild
              className="h-8 px-2 text-xs text-primary border-primary/30 hover:bg-primary/5 hover:text-primary"
            >
              <Link href={`/admin/kelas/${item.id}/nilai`}>
                <FileSpreadsheetIcon className="mr-1 h-3.5 w-3.5" />
                Lembar Nilai
              </Link>
            </Button>
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
              disabled={isPending}
              onClick={() => handleSoftDelete(item)}
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
            Kelola Marhalah (Jenjang Kelas)
          </h2>
          <p className="text-xs text-zinc-500">
            Daftar marhalah / jenjang santri di pondok pesantren. Penghapusan marhalah menerapkan soft delete.
          </p>
        </div>
        <Button onClick={openAddDialog} size="sm" className="h-9">
          <PlusIcon className="mr-1.5 h-4 w-4" />
          Tambah Marhalah
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={data}
        searchKey="nama"
        searchPlaceholder="Cari nama marhalah (mis. Ibtida Awal)..."
      />

      {/* DIALOG TAMBAH / UBAH */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? "Ubah Marhalah" : "Tambah Marhalah"}
            </DialogTitle>
            <DialogDescription>
              Isi data jenjang marhalah. Urutan menentukan posisi tingkatan kelas dari yang paling awal.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="marhalah-nama">Nama Marhalah</Label>
              <Input
                id="marhalah-nama"
                placeholder="Ibtida Awal PI"
                value={formNama}
                onChange={(e) => setFormNama(e.target.value)}
              />
              {errors.nama ? (
                <p className="text-xs text-destructive">{errors.nama}</p>
              ) : null}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="marhalah-kode">Kode (2 digit)</Label>
                <Input
                  id="marhalah-kode"
                  placeholder="1A"
                  maxLength={2}
                  value={formKode}
                  onChange={(e) => setFormKode(e.target.value.toUpperCase())}
                />
                {errors.kode ? (
                  <p className="text-xs text-destructive">{errors.kode}</p>
                ) : null}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="marhalah-urutan">Urutan Kelas</Label>
                <Input
                  id="marhalah-urutan"
                  type="number"
                  min={1}
                  value={formUrutan}
                  onChange={(e) => setFormUrutan(Number(e.target.value))}
                />
                {errors.urutan ? (
                  <p className="text-xs text-destructive">{errors.urutan}</p>
                ) : null}
              </div>
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

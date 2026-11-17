"use client";

import * as React from "react";
import { PlusIcon, EditIcon, Trash2Icon, BookOpenIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  createMapelAction,
  updateMapelAction,
  deleteMapelAction,
} from "@/app/admin/actions/kurikulum";
import { mapelSchema, type MapelFormValues } from "@/lib/validations/kurikulum";

export interface MapelRecord {
  id: string;
  nama: string;
  created_at: string;
}

export function MapelClient({ initialData }: { initialData: MapelRecord[] }) {
  const confirm = useConfirm();
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [editingItem, setEditingItem] = React.useState<MapelRecord | null>(null);
  const [isPending, startTransition] = React.useTransition();

  const [formNama, setFormNama] = React.useState("");
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const data = initialData;

  const openAddDialog = () => {
    setEditingItem(null);
    setFormNama("");
    setErrors({});
    setIsDialogOpen(true);
  };

  const openEditDialog = (item: MapelRecord) => {
    setEditingItem(item);
    setFormNama(item.nama);
    setErrors({});
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const formValues: MapelFormValues = {
      nama: formNama,
    };

    const parsed = mapelSchema.safeParse(formValues);
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
        const res = await updateMapelAction(editingItem.id, parsed.data);
        if (res.ok) {
          notify.success(res.message);
          setIsDialogOpen(false);
        } else {
          notify.error(res.message);
        }
      } else {
        const res = await createMapelAction(parsed.data);
        if (res.ok) {
          notify.success(res.message);
          setIsDialogOpen(false);
        } else {
          notify.error(res.message);
        }
      }
    });
  };

  const handleDelete = async (item: MapelRecord) => {
    const isConfirmed = await confirm({
      title: "Hapus Mata Pelajaran",
      description: `Apakah Anda yakin ingin menghapus mata pelajaran "${item.nama}"? Data yang masih digunakan dalam kurikulum marhalah tidak dapat dihapus.`,
      destructive: true,
      confirmText: "Hapus Mapel",
      cancelText: "Batal",
    });

    if (isConfirmed) {
      startTransition(async () => {
        const res = await deleteMapelAction(item.id);
        if (res.ok) {
          notify.success(res.message);
        } else {
          notify.error(res.message);
        }
      });
    }
  };

  const columns: ColumnDef<MapelRecord>[] = [
    {
      accessorKey: "nama",
      header: "Nama Mata Pelajaran",
      cell: ({ row }) => (
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
            <BookOpenIcon className="h-4 w-4" />
          </div>
          <span className="font-semibold text-zinc-900">{row.getValue("nama")}</span>
        </div>
      ),
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
              disabled={isPending}
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
            Master Mata Pelajaran
          </h2>
          <p className="text-xs text-zinc-500">
            Daftar seluruh mata pelajaran pesantren yang dapat dimasukkan ke kurikulum marhalah.
          </p>
        </div>
        <Button onClick={openAddDialog} size="sm" className="h-9">
          <PlusIcon className="mr-1.5 h-4 w-4" />
          Tambah Mata Pelajaran
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={data}
        searchKey="nama"
        searchPlaceholder="Cari mata pelajaran (mis. Fiqih, Nahwu)..."
      />

      {/* DIALOG TAMBAH / UBAH */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? "Ubah Mata Pelajaran" : "Tambah Mata Pelajaran"}
            </DialogTitle>
            <DialogDescription>
              Masukkan nama mata pelajaran (contoh: Fiqih, Nahwu, Shorof, Tauhid, Akhlak, Legalisir).
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="mapel-nama">Nama Mata Pelajaran</Label>
              <Input
                id="mapel-nama"
                placeholder="Fiqih"
                value={formNama}
                onChange={(e) => setFormNama(e.target.value)}
              />
              {errors.nama ? (
                <p className="text-xs text-destructive">{errors.nama}</p>
              ) : null}
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

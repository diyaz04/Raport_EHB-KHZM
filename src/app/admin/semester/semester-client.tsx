"use client";

import * as React from "react";
import { PlusIcon, EditIcon, Trash2Icon, CheckCircle2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  createSemesterAction,
  updateSemesterAction,
  deleteSemesterAction,
  setAktifSemesterAction,
} from "@/app/admin/actions/akademik";
import { semesterSchema, type SemesterFormValues } from "@/lib/validations/akademik";

export interface SemesterRecord {
  id: string;
  tahun_ajaran_id: string;
  jenis: "Ganjil" | "Genap";
  aktif: boolean;
  tahun_ajaran?: {
    nama: string;
    kode: string;
  };
}

export interface TahunAjaranOption {
  id: string;
  nama: string;
  kode: string;
}

export function SemesterClient({
  initialData,
  tahunAjaranList,
}: {
  initialData: SemesterRecord[];
  tahunAjaranList: TahunAjaranOption[];
}) {
  const confirm = useConfirm();
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [editingItem, setEditingItem] = React.useState<SemesterRecord | null>(null);
  const [isPending, startTransition] = React.useTransition();

  const [formTahunAjaranId, setFormTahunAjaranId] = React.useState(tahunAjaranList[0]?.id || "");
  const [formJenis, setFormJenis] = React.useState<"Ganjil" | "Genap">("Ganjil");
  const [formAktif, setFormAktif] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const data = initialData;

  const openAddDialog = () => {
    setEditingItem(null);
    setFormTahunAjaranId(tahunAjaranList[0]?.id || "");
    setFormJenis("Ganjil");
    setFormAktif(data.length === 0);
    setErrors({});
    setIsDialogOpen(true);
  };

  const openEditDialog = (item: SemesterRecord) => {
    setEditingItem(item);
    setFormTahunAjaranId(item.tahun_ajaran_id);
    setFormJenis(item.jenis);
    setFormAktif(item.aktif);
    setErrors({});
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const formValues: SemesterFormValues = {
      tahun_ajaran_id: formTahunAjaranId,
      jenis: formJenis,
      aktif: formAktif,
    };

    const parsed = semesterSchema.safeParse(formValues);
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
        const res = await updateSemesterAction(editingItem.id, parsed.data);
        if (res.ok) {
          notify.success(res.message);
          setIsDialogOpen(false);
        } else {
          notify.error(res.message);
        }
      } else {
        const res = await createSemesterAction(parsed.data);
        if (res.ok) {
          notify.success(res.message);
          setIsDialogOpen(false);
        } else {
          notify.error(res.message);
        }
      }
    });
  };

  const handleSetAktif = (item: SemesterRecord) => {
    startTransition(async () => {
      const res = await setAktifSemesterAction(item.id);
      if (res.ok) {
        notify.success(res.message);
      } else {
        notify.error(res.message);
      }
    });
  };

  const handleDelete = async (item: SemesterRecord) => {
    const isConfirmed = await confirm({
      title: "Hapus Semester",
      description: `Apakah Anda yakin ingin menghapus Semester ${item.jenis} (${item.tahun_ajaran?.nama})? Data nilai yang sudah ada pada semester ini akan terhapus.`,
      destructive: true,
      confirmText: "Hapus",
      cancelText: "Batal",
    });

    if (isConfirmed) {
      startTransition(async () => {
        const res = await deleteSemesterAction(item.id);
        if (res.ok) {
          notify.success(res.message);
        } else {
          notify.error(res.message);
        }
      });
    }
  };

  const columns: ColumnDef<SemesterRecord>[] = [
    {
      accessorKey: "tahun_ajaran.nama",
      header: "Tahun Ajaran",
      cell: ({ row }) => (
        <span className="font-semibold text-zinc-900">
          {row.original.tahun_ajaran?.nama ?? "-"}
        </span>
      ),
    },
    {
      accessorKey: "jenis",
      header: "Semester",
      cell: ({ row }) => (
        <Badge variant="outline" className="font-medium text-xs">
          Semester {row.original.jenis}
        </Badge>
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
            Kelola Semester
          </h2>
          <p className="text-xs text-zinc-500">
            Setiap tahun ajaran memiliki semester Ganjil dan Genap. Hanya satu semester yang boleh aktif secara bersamaan.
          </p>
        </div>
        <Button onClick={openAddDialog} size="sm" className="h-9">
          <PlusIcon className="mr-1.5 h-4 w-4" />
          Tambah Semester
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={data}
        searchKey="jenis"
        searchPlaceholder="Cari semester (Ganjil / Genap)..."
      />

      {/* DIALOG TAMBAH / UBAH */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? "Ubah Semester" : "Tambah Semester"}
            </DialogTitle>
            <DialogDescription>
              Tentukan tahun ajaran dan jenis semester (Ganjil atau Genap).
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Tahun Ajaran</Label>
              <Select
                value={formTahunAjaranId}
                onValueChange={setFormTahunAjaranId}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih Tahun Ajaran" />
                </SelectTrigger>
                <SelectContent>
                  {tahunAjaranList.map((ta) => (
                    <SelectItem key={ta.id} value={ta.id}>
                      {ta.nama} ({ta.kode})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.tahun_ajaran_id ? (
                <p className="text-xs text-destructive">{errors.tahun_ajaran_id}</p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <Label>Jenis Semester</Label>
              <Select
                value={formJenis}
                onValueChange={(val) => setFormJenis(val as "Ganjil" | "Genap")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih Jenis Semester" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Ganjil">Ganjil</SelectItem>
                  <SelectItem value="Genap">Genap</SelectItem>
                </SelectContent>
              </Select>
              {errors.jenis ? (
                <p className="text-xs text-destructive">{errors.jenis}</p>
              ) : null}
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                id="aktif-semester"
                type="checkbox"
                checked={formAktif}
                onChange={(e) => setFormAktif(e.target.checked)}
                className="h-4 w-4 rounded border-zinc-300 text-primary focus:ring-primary"
              />
              <Label htmlFor="aktif-semester" className="text-sm font-normal cursor-pointer">
                Jadikan semester ini aktif sekarang
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

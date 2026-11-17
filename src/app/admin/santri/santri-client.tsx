"use client";

import * as React from "react";
import {
  PlusIcon,
  EditIcon,
  Trash2Icon,
  RotateCcwIcon,
  ArrowRightLeftIcon,
  UserCheckIcon,
  UsersIcon,
  GraduationCapIcon,
  SearchIcon,
  FileSpreadsheetIcon,
  TrendingUpIcon,
} from "lucide-react";
import { useSessionStorageState } from "@/hooks/use-storage-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  createSantriAction,
  updateSantriAction,
  softDeleteSantriAction,
  restoreSantriAction,
  enrollSantriAction,
  pindahKelasAction,
} from "@/app/admin/actions/santri";
import { santriSchema, type SantriFormValues } from "@/lib/validations/santri";
import { ImportSantriDialog } from "@/components/admin/import-santri-dialog";
import { NaikKelasDialog, type EnrollmentRaw } from "@/components/admin/naik-kelas-dialog";

export interface MarhalahOption {
  id: string;
  nama: string;
  kode: string;
  urutan: number;
}

export interface TahunAjaranOption {
  id: string;
  nama: string;
  kode: string;
  aktif: boolean;
}

export interface SantriRecord {
  id: string;
  nis: string | null;
  nama: string;
  jenis_kelamin: "L" | "P";
  deleted_at: string | null;
  created_at: string;
  // Relasi enrollment pada tahun ajaran yang sedang aktif
  enrollment?: {
    id: string;
    marhalah_id: string;
    tahun_ajaran_id: string;
    marhalah?: {
      id: string;
      nama: string;
      kode: string;
    };
  } | null;
}

interface SantriClientProps {
  initialData: SantriRecord[];
  marhalahList: MarhalahOption[];
  tahunAjaranList: TahunAjaranOption[];
  allEnrollments: EnrollmentRaw[];
  activeTahunAjaranId: string | null;
}

export function SantriClient({
  initialData,
  marhalahList,
  tahunAjaranList,
  allEnrollments,
  activeTahunAjaranId,
}: SantriClientProps) {
  const confirm = useConfirm();
  const [isPending, startTransition] = React.useTransition();

  // Dialog State: Import Excel & Naik Kelas Massal
  const [isImportDialogOpen, setIsImportDialogOpen] = React.useState(false);
  const [isNaikKelasDialogOpen, setIsNaikKelasDialogOpen] = React.useState(false);

  // Filters State with browser sessionStorage persistence
  const [searchQuery, setSearchQuery] = React.useState("");
  const [filterMarhalahId, setFilterMarhalahId] = useSessionStorageState<string>(
    "santri_filter_marhalah",
    "all"
  );
  const [filterJk, setFilterJk] = React.useState<string>("all");
  const [filterStatus, setFilterStatus] = useSessionStorageState<string>(
    "santri_filter_status",
    "active"
  );

  // Dialog State: Tambah / Ubah Santri
  const [isSantriDialogOpen, setIsSantriDialogOpen] = React.useState(false);
  const [editingSantri, setEditingSantri] = React.useState<SantriRecord | null>(null);
  const [formNama, setFormNama] = React.useState("");
  const [formNis, setFormNis] = React.useState("");
  const [formJk, setFormJk] = React.useState<"L" | "P">("L");
  const [formMarhalahId, setFormMarhalahId] = React.useState<string>("none");
  const [formErrors, setFormErrors] = React.useState<Record<string, string>>({});

  // Dialog State: Tempatkan Santri
  const [isEnrollDialogOpen, setIsEnrollDialogOpen] = React.useState(false);
  const [selectedSantriForEnroll, setSelectedSantriForEnroll] = React.useState<SantriRecord | null>(null);
  const [enrollMarhalahId, setEnrollMarhalahId] = React.useState<string>(marhalahList[0]?.id || "");
  const [enrollTahunAjaranId, setEnrollTahunAjaranId] = React.useState<string>(
    activeTahunAjaranId || tahunAjaranList[0]?.id || ""
  );

  // Dialog State: Pindah Kelas
  const [isPindahDialogOpen, setIsPindahDialogOpen] = React.useState(false);
  const [selectedSantriForPindah, setSelectedSantriForPindah] = React.useState<SantriRecord | null>(null);
  const [pindahMarhalahBaruId, setPindahMarhalahBaruId] = React.useState<string>("");

  // Filtering Data
  const filteredData = React.useMemo(() => {
    return initialData.filter((item) => {
      // Filter status
      const isDeleted = Boolean(item.deleted_at);
      if (filterStatus === "active" && isDeleted) return false;
      if (filterStatus === "deleted" && !isDeleted) return false;

      // Filter jenis kelamin
      if (filterJk !== "all" && item.jenis_kelamin !== filterJk) return false;

      // Filter marhalah
      if (filterMarhalahId === "unassigned") {
        if (item.enrollment) return false;
      } else if (filterMarhalahId !== "all") {
        if (item.enrollment?.marhalah_id !== filterMarhalahId) return false;
      }

      // Search query (nama atau nis)
      if (searchQuery.trim().length > 0) {
        const query = searchQuery.toLowerCase();
        const matchNama = item.nama.toLowerCase().includes(query);
        const matchNis = item.nis ? item.nis.toLowerCase().includes(query) : false;
        if (!matchNama && !matchNis) return false;
      }

      return true;
    });
  }, [initialData, filterStatus, filterJk, filterMarhalahId, searchQuery]);

  // Form Openers
  const openAddSantriDialog = () => {
    setEditingSantri(null);
    setFormNama("");
    setFormNis("");
    setFormJk("L");
    setFormMarhalahId(marhalahList[0]?.id || "none");
    setFormErrors({});
    setIsSantriDialogOpen(true);
  };

  const openEditSantriDialog = (item: SantriRecord) => {
    setEditingSantri(item);
    setFormNama(item.nama);
    setFormNis(item.nis ?? "");
    setFormJk(item.jenis_kelamin);
    setFormErrors({});
    setIsSantriDialogOpen(true);
  };

  const openEnrollDialog = (item: SantriRecord) => {
    setSelectedSantriForEnroll(item);
    setEnrollMarhalahId(marhalahList[0]?.id || "");
    setEnrollTahunAjaranId(activeTahunAjaranId || tahunAjaranList[0]?.id || "");
    setIsEnrollDialogOpen(true);
  };

  const openPindahDialog = (item: SantriRecord) => {
    setSelectedSantriForPindah(item);
    // Pilih marhalah selain marhalah saat ini
    const otherMarhalah = marhalahList.filter(
      (m) => m.id !== item.enrollment?.marhalah_id
    );
    setPindahMarhalahBaruId(otherMarhalah[0]?.id || marhalahList[0]?.id || "");
    setIsPindahDialogOpen(true);
  };

  // Submit: Tambah / Ubah Santri
  const handleSantriSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});

    const formValues: SantriFormValues = {
      nama: formNama,
      nis: formNis.trim().length > 0 ? formNis.trim() : null,
      jenis_kelamin: formJk,
      marhalah_id: formMarhalahId !== "none" ? formMarhalahId : null,
      tahun_ajaran_id: activeTahunAjaranId,
    };

    const parsed = santriSchema.safeParse(formValues);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      parsed.error.issues.forEach((err) => {
        if (err.path[0]) fieldErrors[err.path[0].toString()] = err.message;
      });
      setFormErrors(fieldErrors);
      return;
    }

    startTransition(async () => {
      if (editingSantri) {
        const res = await updateSantriAction(editingSantri.id, {
          nama: parsed.data.nama,
          nis: parsed.data.nis,
          jenis_kelamin: parsed.data.jenis_kelamin,
        });

        if (res.ok) {
          notify.success(res.message);
          setIsSantriDialogOpen(false);
        } else {
          notify.error(res.message);
        }
      } else {
        const res = await createSantriAction(parsed.data);
        if (res.ok) {
          notify.success(res.message);
          setIsSantriDialogOpen(false);
        } else {
          notify.error(res.message);
        }
      }
    });
  };

  // Submit: Tempatkan Santri
  const handleEnrollSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSantriForEnroll) return;

    startTransition(async () => {
      const res = await enrollSantriAction({
        santri_id: selectedSantriForEnroll.id,
        marhalah_id: enrollMarhalahId,
        tahun_ajaran_id: enrollTahunAjaranId,
      });

      if (res.ok) {
        notify.success(res.message);
        setIsEnrollDialogOpen(false);
      } else {
        notify.error(res.message);
      }
    });
  };

  // Submit: Pindah Kelas
  const handlePindahSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSantriForPindah?.enrollment) return;

    startTransition(async () => {
      const res = await pindahKelasAction({
        enrollment_id: selectedSantriForPindah.enrollment!.id,
        marhalah_id_baru: pindahMarhalahBaruId,
      });

      if (res.ok) {
        notify.success(res.message);
        setIsPindahDialogOpen(false);
      } else {
        notify.error(res.message);
      }
    });
  };

  // Soft Delete
  const handleSoftDelete = async (item: SantriRecord) => {
    const isConfirmed = await confirm({
      title: "Hapus Santri",
      description: `Apakah Anda yakin ingin menonaktifkan santri "${item.nama}"? Data akan diarsipkan (soft delete).`,
      destructive: true,
      confirmText: "Hapus Santri",
      cancelText: "Batal",
    });

    if (isConfirmed) {
      startTransition(async () => {
        const res = await softDeleteSantriAction(item.id);
        if (res.ok) {
          notify.success(res.message);
        } else {
          notify.error(res.message);
        }
      });
    }
  };

  // Restore
  const handleRestore = async (item: SantriRecord) => {
    startTransition(async () => {
      const res = await restoreSantriAction(item.id);
      if (res.ok) {
        notify.success(res.message);
      } else {
        notify.error(res.message);
      }
    });
  };

  const columns: ColumnDef<SantriRecord>[] = [
    {
      accessorKey: "nis",
      header: "NIS",
      cell: ({ row }) => {
        const nis = row.original.nis;
        return (
          <span className="font-mono text-xs text-zinc-600 bg-zinc-100 px-2 py-0.5 rounded border border-zinc-200">
            {nis ? nis : "-"}
          </span>
        );
      },
    },
    {
      accessorKey: "nama",
      header: "Nama Santri",
      cell: ({ row }) => {
        const item = row.original;
        const isLaki = item.jenis_kelamin === "L";
        return (
          <div className="flex items-center gap-2.5">
            <div
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                isLaki ? "bg-sky-100 text-sky-800" : "bg-rose-100 text-rose-800"
              }`}
            >
              {isLaki ? "L" : "P"}
            </div>
            <div>
              <div className="font-semibold text-zinc-900">{item.nama}</div>
              <div className="text-[11px] text-zinc-400">
                {isLaki ? "Laki-laki" : "Perempuan"}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "enrollment",
      header: "Kelas / Marhalah",
      cell: ({ row }) => {
        const enroll = row.original.enrollment;
        if (enroll?.marhalah) {
          return (
            <Badge className="bg-emerald-700 text-white font-medium text-xs">
              <GraduationCapIcon className="mr-1 h-3.5 w-3.5" />
              {enroll.marhalah.nama} ({enroll.marhalah.kode})
            </Badge>
          );
        }
        return (
          <Badge variant="outline" className="text-zinc-400 border-dashed text-xs">
            Belum Ditempatkan
          </Badge>
        );
      },
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
        const isDeleted = Boolean(item.deleted_at);

        if (isDeleted) {
          return (
            <div className="flex items-center justify-end">
              <Button
                size="sm"
                variant="outline"
                disabled={isPending}
                onClick={() => handleRestore(item)}
                className="h-7 text-xs text-emerald-800 border-emerald-300 hover:bg-emerald-50"
              >
                <RotateCcwIcon className="mr-1 h-3 w-3" />
                Pulihkan
              </Button>
            </div>
          );
        }

        return (
          <div className="flex items-center justify-end gap-1.5">
            {/* Tombol Tempatkan Kelas atau Pindah Kelas */}
            {item.enrollment ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => openPindahDialog(item)}
                className="h-7 px-2 text-xs text-zinc-700 hover:text-zinc-900"
                title="Pindah Kelas"
              >
                <ArrowRightLeftIcon className="mr-1 h-3 w-3 text-primary" />
                Pindah
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={() => openEnrollDialog(item)}
                className="h-7 px-2 text-xs text-primary border-primary/30 hover:bg-emerald-50"
                title="Tempatkan ke Kelas"
              >
                <UserCheckIcon className="mr-1 h-3 w-3" />
                Tempatkan
              </Button>
            )}

            {/* Tombol Edit */}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => openEditSantriDialog(item)}
              className="h-7 w-7 p-0 text-zinc-600 hover:text-zinc-900"
            >
              <EditIcon className="h-3.5 w-3.5" />
              <span className="sr-only">Edit</span>
            </Button>

            {/* Tombol Hapus (Soft Delete) */}
            <Button
              size="sm"
              variant="ghost"
              disabled={isPending}
              onClick={() => handleSoftDelete(item)}
              className="h-7 w-7 p-0 text-zinc-400 hover:text-destructive hover:bg-red-50"
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
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-200 pb-5">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-zinc-900">
            Data Santri & Penempatan Kelas
          </h2>
          <p className="text-xs text-zinc-500">
            Kelola data induk santri, penempatan ke marhalah per tahun ajaran, dan mutasi pindah kelas.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={() => setIsImportDialogOpen(true)}
            variant="outline"
            size="sm"
            className="h-9 gap-1.5 text-zinc-700"
          >
            <FileSpreadsheetIcon className="h-4 w-4 text-emerald-800" />
            <span>Import Excel</span>
          </Button>

          <Button
            onClick={() => setIsNaikKelasDialogOpen(true)}
            variant="outline"
            size="sm"
            className="h-9 gap-1.5 text-zinc-700"
          >
            <TrendingUpIcon className="h-4 w-4 text-primary" />
            <span>Naik Kelas Massal</span>
          </Button>

          <Button onClick={openAddSantriDialog} size="sm" className="h-9 gap-1.5">
            <PlusIcon className="h-4 w-4" />
            <span>Tambah Santri Baru</span>
          </Button>
        </div>
      </div>

      {/* FILTER & PENCARIAN BAR */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4 bg-white p-4 rounded-lg border border-zinc-200 shadow-2xs">
        {/* Search Input */}
        <div className="space-y-1">
          <Label className="text-xs font-semibold text-zinc-600">Pencarian</Label>
          <div className="relative">
            <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-400" />
            <Input
              placeholder="Cari nama atau NIS..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>
        </div>

        {/* Filter Marhalah */}
        <div className="space-y-1">
          <Label className="text-xs font-semibold text-zinc-600">Filter Marhalah</Label>
          <Select value={filterMarhalahId} onValueChange={setFilterMarhalahId}>
            <SelectTrigger className="w-full h-9">
              <SelectValue placeholder="Semua Marhalah" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Marhalah</SelectItem>
              <SelectItem value="unassigned">Belum Ditempatkan</SelectItem>
              {marhalahList.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.nama} ({m.kode})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Filter Jenis Kelamin */}
        <div className="space-y-1">
          <Label className="text-xs font-semibold text-zinc-600">Jenis Kelamin</Label>
          <Select value={filterJk} onValueChange={setFilterJk}>
            <SelectTrigger className="w-full h-9">
              <SelectValue placeholder="Semua" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua (L & P)</SelectItem>
              <SelectItem value="L">Laki-laki (L)</SelectItem>
              <SelectItem value="P">Perempuan (P)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Filter Status */}
        <div className="space-y-1">
          <Label className="text-xs font-semibold text-zinc-600">Status Data</Label>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-full h-9">
              <SelectValue placeholder="Santri Aktif" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Santri Aktif</SelectItem>
              <SelectItem value="all">Semua Data</SelectItem>
              <SelectItem value="deleted">Terhapus (Arsip)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* STATS SUMMARY */}
      <div className="flex items-center justify-between px-1 text-xs text-zinc-500">
        <div className="flex items-center gap-2">
          <UsersIcon className="h-4 w-4 text-zinc-400" />
          <span>Menampilkan <strong>{filteredData.length}</strong> dari {initialData.length} total santri</span>
        </div>
      </div>

      {/* TABEL DATA SANTRI */}
      <DataTable columns={columns} data={filteredData} />

      {/* DIALOG TAMBAH / UBAH SANTRI */}
      <Dialog open={isSantriDialogOpen} onOpenChange={setIsSantriDialogOpen}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle>
              {editingSantri ? "Ubah Data Santri" : "Tambah Santri Baru"}
            </DialogTitle>
            <DialogDescription>
              Isi data identitas santri. NIS bersifat opsional dan harus unik.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSantriSubmit} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="santri-nama">Nama Lengkap Santri</Label>
              <Input
                id="santri-nama"
                placeholder="Muhammad Faiz"
                value={formNama}
                onChange={(e) => setFormNama(e.target.value)}
              />
              {formErrors.nama ? (
                <p className="text-xs text-destructive">{formErrors.nama}</p>
              ) : null}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="santri-nis">NIS (Opsional)</Label>
                <Input
                  id="santri-nis"
                  placeholder="202501001"
                  value={formNis}
                  onChange={(e) => setFormNis(e.target.value)}
                />
                {formErrors.nis ? (
                  <p className="text-xs text-destructive">{formErrors.nis}</p>
                ) : null}
              </div>

              <div className="space-y-1.5">
                <Label>Jenis Kelamin</Label>
                <Select
                  value={formJk}
                  onValueChange={(val) => setFormJk(val as "L" | "P")}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Pilih Jenis Kelamin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="L">Laki-laki (L)</SelectItem>
                    <SelectItem value="P">Perempuan (P)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Opsi penempatan marhalah langsung jika sedang tambah santri baru */}
            {!editingSantri ? (
              <div className="space-y-1.5 pt-2 border-t border-zinc-100">
                <Label>Penempatan Kelas Awal (Tahun Ajaran Aktif)</Label>
                <Select value={formMarhalahId} onValueChange={setFormMarhalahId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Pilih Marhalah" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">- Tempatkan Nanti Saja -</SelectItem>
                    {marhalahList.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.nama} ({m.kode})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-zinc-400">
                  Santri dapat langsung dimasukkan ke kelas marhalah pada tahun ajaran aktif.
                </p>
              </div>
            ) : null}

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsSantriDialogOpen(false)}
              >
                Batal
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Menyimpan..." : "Simpan Santri"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIALOG TEMPATKAN SANTRI KE KELAS */}
      <Dialog open={isEnrollDialogOpen} onOpenChange={setIsEnrollDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Tempatkan Santri ke Kelas</DialogTitle>
            <DialogDescription>
              Menempatkan <strong>{selectedSantriForEnroll?.nama}</strong> ke marhalah kelas.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEnrollSubmit} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Tahun Ajaran</Label>
              <Select value={enrollTahunAjaranId} onValueChange={setEnrollTahunAjaranId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih Tahun Ajaran" />
                </SelectTrigger>
                <SelectContent>
                  {tahunAjaranList.map((ta) => (
                    <SelectItem key={ta.id} value={ta.id}>
                      TA {ta.nama} ({ta.kode}) {ta.aktif ? "(Aktif)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Marhalah (Kelas)</Label>
              <Select value={enrollMarhalahId} onValueChange={setEnrollMarhalahId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih Marhalah" />
                </SelectTrigger>
                <SelectContent>
                  {marhalahList.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.nama} ({m.kode})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEnrollDialogOpen(false)}
              >
                Batal
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Menempatkan..." : "Tempatkan Sekarang"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIALOG PINDAH KELAS SATU SANTRI */}
      <Dialog open={isPindahDialogOpen} onOpenChange={setIsPindahDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Pindah Kelas Santri</DialogTitle>
            <DialogDescription>
              Memindahkan kelas untuk <strong>{selectedSantriForPindah?.nama}</strong>.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handlePindahSubmit} className="space-y-4 py-2">
            <div className="p-3 bg-zinc-50 rounded-md border border-zinc-200 text-xs space-y-1">
              <div className="text-zinc-500">Kelas Saat Ini:</div>
              <div className="font-semibold text-zinc-900 flex items-center gap-1.5">
                <GraduationCapIcon className="h-4 w-4 text-primary" />
                <span>{selectedSantriForPindah?.enrollment?.marhalah?.nama}</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Pilih Marhalah Tujuan Baru</Label>
              <Select value={pindahMarhalahBaruId} onValueChange={setPindahMarhalahBaruId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih Marhalah Tujuan" />
                </SelectTrigger>
                <SelectContent>
                  {marhalahList
                    .filter((m) => m.id !== selectedSantriForPindah?.enrollment?.marhalah_id)
                    .map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.nama} ({m.kode})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsPindahDialogOpen(false)}
              >
                Batal
              </Button>
              <Button type="submit" disabled={isPending || !pindahMarhalahBaruId}>
                {isPending ? "Memindahkan..." : "Simpan Pindah Kelas"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIALOG IMPORT SANTRI EXCEL */}
      <ImportSantriDialog
        open={isImportDialogOpen}
        onOpenChange={setIsImportDialogOpen}
        marhalahList={marhalahList}
        tahunAjaranList={tahunAjaranList}
        activeTahunAjaranId={activeTahunAjaranId}
      />

      {/* DIALOG NAIK KELAS MASSAL */}
      <NaikKelasDialog
        open={isNaikKelasDialogOpen}
        onOpenChange={setIsNaikKelasDialogOpen}
        marhalahList={marhalahList}
        tahunAjaranList={tahunAjaranList}
        allEnrollments={allEnrollments}
        activeTahunAjaranId={activeTahunAjaranId}
      />
    </div>
  );
}

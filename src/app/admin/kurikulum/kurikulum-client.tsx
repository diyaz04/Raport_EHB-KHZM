"use client";

import * as React from "react";
import {
  PlusIcon,
  CopyIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  EditIcon,
  Trash2Icon,
  BookOpenIcon,
  BookmarkIcon,
  CheckCircle2Icon,
  AlertTriangleIcon,
} from "lucide-react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Combobox } from "@/components/ui/combobox";
import { useConfirm } from "@/hooks/use-confirm";
import { notify } from "@/lib/notify";
import {
  createMarhalahMapelAction,
  updateMarhalahMapelAction,
  deleteMarhalahMapelAction,
  moveMarhalahMapelAction,
  salinKurikulumAction,
} from "@/app/admin/actions/kurikulum";

export interface MarhalahOption {
  id: string;
  nama: string;
  kode: string;
  urutan: number;
}

export interface SemesterOption {
  id: string;
  tahun_ajaran_id: string;
  jenis: "Ganjil" | "Genap";
  aktif: boolean;
  tahun_ajaran?: {
    nama: string;
    kode: string;
  };
}

export interface SimpleItemOption {
  id: string;
  nama: string;
}

export interface MarhalahMapelRecord {
  id: string;
  marhalah_id: string;
  semester_id: string;
  mapel_id: string;
  kitab_id: string | null;
  urutan: number;
  tipe: "nilai" | "kelengkapan";
  dihitung_total: boolean;
  mapel?: {
    nama: string;
  };
  kitab?: {
    nama: string;
  } | null;
}

interface KurikulumClientProps {
  marhalahList: MarhalahOption[];
  semesterList: SemesterOption[];
  mapelList: SimpleItemOption[];
  kitabList: SimpleItemOption[];
  initialData: MarhalahMapelRecord[];
}

export function KurikulumClient({
  marhalahList,
  semesterList,
  mapelList,
  kitabList,
  initialData,
}: KurikulumClientProps) {
  const confirm = useConfirm();
  const [isPending, startTransition] = React.useTransition();

  // Marhalah & Semester State
  const activeSemester = React.useMemo(
    () => semesterList.find((s) => s.aktif) ?? semesterList[0],
    [semesterList]
  );
  const [selectedMarhalahId, setSelectedMarhalahId] = React.useState<string>(
    marhalahList[0]?.id || ""
  );
  const [selectedSemesterId, setSelectedSemesterId] = React.useState<string>(
    activeSemester?.id || ""
  );

  // Dialog State: Tambah & Ubah Mapel
  const [isFormDialogOpen, setIsFormDialogOpen] = React.useState(false);
  const [editingItem, setEditingItem] = React.useState<MarhalahMapelRecord | null>(null);
  const [formMapelId, setFormMapelId] = React.useState<string>("");
  const [formKitabId, setFormKitabId] = React.useState<string>("");
  const [formTipe, setFormTipe] = React.useState<"nilai" | "kelengkapan">("nilai");
  const [formDihitungTotal, setFormDihitungTotal] = React.useState(true);

  // Dialog State: Salin dari Semester Lain
  const [isCopyDialogOpen, setIsCopyDialogOpen] = React.useState(false);
  const [sumberSemesterId, setSumberSemesterId] = React.useState<string>("");
  const [konfirmasiTimpa, setKonfirmasiTimpa] = React.useState(false);

  // Current Marhalah + Semester Rows (1-12)
  const currentItems = React.useMemo(() => {
    return initialData
      .filter(
        (item) =>
          item.marhalah_id === selectedMarhalahId &&
          item.semester_id === selectedSemesterId
      )
      .sort((a, b) => a.urutan - b.urutan);
  }, [initialData, selectedMarhalahId, selectedSemesterId]);

  const selectedMarhalah = React.useMemo(
    () => marhalahList.find((m) => m.id === selectedMarhalahId),
    [marhalahList, selectedMarhalahId]
  );

  const selectedSemester = React.useMemo(
    () => semesterList.find((s) => s.id === selectedSemesterId),
    [semesterList, selectedSemesterId]
  );

  // Combobox Options
  const mapelOptions = React.useMemo(() => {
    return mapelList.map((m) => ({ value: m.id, label: m.nama }));
  }, [mapelList]);

  const kitabOptions = React.useMemo(() => {
    const list = kitabList.map((k) => ({ value: k.id, label: k.nama }));
    return [{ value: "none", label: "- Tanpa Kitab -" }, ...list];
  }, [kitabList]);

  // Form Openers
  const openAddDialog = () => {
    if (currentItems.length >= 12) {
      notify.error("Maksimal 12 mata pelajaran per marhalah dalam satu semester.");
      return;
    }
    setEditingItem(null);
    setFormMapelId("");
    setFormKitabId("none");
    setFormTipe("nilai");
    setFormDihitungTotal(true);
    setIsFormDialogOpen(true);
  };

  const openEditDialog = (item: MarhalahMapelRecord) => {
    setEditingItem(item);
    setFormMapelId(item.mapel_id);
    setFormKitabId(item.kitab_id || "none");
    setFormTipe(item.tipe);
    setFormDihitungTotal(item.dihitung_total);
    setIsFormDialogOpen(true);
  };

  const openCopyDialog = () => {
    // Cari semester lain selain semester yang sedang aktif dipilih
    const otherSemesters = semesterList.filter((s) => s.id !== selectedSemesterId);
    setSumberSemesterId(otherSemesters[0]?.id || "");
    setKonfirmasiTimpa(false);
    setIsCopyDialogOpen(true);
  };

  // Tipe change handler: if kelengkapan, dihitung_total defaults to false
  const handleTipeChange = (tipe: "nilai" | "kelengkapan") => {
    setFormTipe(tipe);
    if (tipe === "kelengkapan") {
      setFormDihitungTotal(false);
    } else {
      setFormDihitungTotal(true);
    }
  };

  // Submit Handler: Tambah / Ubah
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formMapelId) {
      notify.error("Mata pelajaran wajib dipilih.");
      return;
    }

    const kitabValue = formKitabId === "none" ? null : formKitabId;

    startTransition(async () => {
      if (editingItem) {
        const res = await updateMarhalahMapelAction(editingItem.id, {
          mapel_id: formMapelId,
          kitab_id: kitabValue,
          tipe: formTipe,
          dihitung_total: formTipe === "kelengkapan" ? false : formDihitungTotal,
        });

        if (res.ok) {
          notify.success(res.message);
          setIsFormDialogOpen(false);
        } else {
          notify.error(res.message);
        }
      } else {
        const res = await createMarhalahMapelAction({
          marhalah_id: selectedMarhalahId,
          semester_id: selectedSemesterId,
          mapel_id: formMapelId,
          kitab_id: kitabValue,
          urutan: currentItems.length + 1,
          tipe: formTipe,
          dihitung_total: formTipe === "kelengkapan" ? false : formDihitungTotal,
        });

        if (res.ok) {
          notify.success(res.message);
          setIsFormDialogOpen(false);
        } else {
          notify.error(res.message);
        }
      }
    });
  };

  // Delete Handler
  const handleDelete = async (item: MarhalahMapelRecord) => {
    const isConfirmed = await confirm({
      title: "Hapus Mapel dari Kurikulum",
      description: `Apakah Anda yakin ingin menghapus "${item.mapel?.nama}" dari kurikulum ${selectedMarhalah?.nama}? Jika sudah ada nilai yang diinput, data tidak dapat dihapus.`,
      destructive: true,
      confirmText: "Hapus dari Kurikulum",
      cancelText: "Batal",
    });

    if (isConfirmed) {
      startTransition(async () => {
        const res = await deleteMarhalahMapelAction(
          item.id,
          selectedMarhalahId,
          selectedSemesterId
        );
        if (res.ok) {
          notify.success(res.message);
        } else {
          notify.error(res.message);
        }
      });
    }
  };

  // Move Urutan Handler
  const handleMove = (item: MarhalahMapelRecord, direction: "up" | "down") => {
    startTransition(async () => {
      const res = await moveMarhalahMapelAction(
        item.id,
        direction,
        selectedMarhalahId,
        selectedSemesterId
      );
      if (res.ok) {
        notify.success(res.message);
      } else {
        notify.error(res.message);
      }
    });
  };

  // Submit Handler: Salin dari Semester Lain
  const handleCopySubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!sumberSemesterId) {
      notify.error("Semester sumber wajib dipilih.");
      return;
    }

    if (currentItems.length > 0 && !konfirmasiTimpa) {
      notify.error("Harap centang persetujuan untuk menimpa data yang ada.");
      return;
    }

    startTransition(async () => {
      const res = await salinKurikulumAction({
        marhalah_id: selectedMarhalahId,
        target_semester_id: selectedSemesterId,
        sumber_semester_id: sumberSemesterId,
        konfirmasi_timpa: konfirmasiTimpa,
      });

      if (res.ok) {
        notify.success(res.message);
        setIsCopyDialogOpen(false);
      } else {
        notify.error(res.message);
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* HEADER & FILTER SELEKSI */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-200 pb-5">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-zinc-900">
            Konfigurasi Kurikulum per Marhalah
          </h2>
          <p className="text-xs text-zinc-500">
            Atur mata pelajaran (maks. 12 mapel), kitab, tipe, dan urutan untuk masing-masing jenjang marhalah & semester.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={openCopyDialog}
            variant="outline"
            size="sm"
            className="h-9 gap-1.5 text-zinc-700"
          >
            <CopyIcon className="h-4 w-4 text-zinc-500" />
            <span>Salin dari Semester Lain</span>
          </Button>

          <Button
            onClick={openAddDialog}
            size="sm"
            disabled={currentItems.length >= 12 || isPending}
            className="h-9 gap-1.5"
          >
            <PlusIcon className="h-4 w-4" />
            <span>Tambah Mapel</span>
          </Button>
        </div>
      </div>

      {/* FILTER BAR: MARHALAH & SEMESTER */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 bg-white p-4 rounded-lg border border-zinc-200 shadow-2xs">
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-zinc-600">Pilih Marhalah (Jenjang)</Label>
          <Select value={selectedMarhalahId} onValueChange={setSelectedMarhalahId}>
            <SelectTrigger className="w-full h-9">
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

        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-zinc-600">Pilih Semester</Label>
          <Select value={selectedSemesterId} onValueChange={setSelectedSemesterId}>
            <SelectTrigger className="w-full h-9">
              <SelectValue placeholder="Pilih Semester" />
            </SelectTrigger>
            <SelectContent>
              {semesterList.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  Semester {s.jenis} — TA {s.tahun_ajaran?.nama ?? "-"} {s.aktif ? "(Aktif)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* STATUS SLOT TERISI */}
      <div className="flex items-center justify-between px-1 text-xs text-zinc-600">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-zinc-900">
            {selectedMarhalah?.nama ?? "Marhalah"}
          </span>
          <span className="text-zinc-300">•</span>
          <span>Semester {selectedSemester?.jenis}</span>
          <span className="text-zinc-300">•</span>
          <span>TA {selectedSemester?.tahun_ajaran?.nama}</span>
        </div>
        <div className="flex items-center gap-2">
          <span>Terisi:</span>
          <Badge
            variant={currentItems.length === 12 ? "default" : "outline"}
            className={
              currentItems.length === 12
                ? "bg-primary text-white"
                : "border-primary/40 text-primary font-medium"
            }
          >
            {currentItems.length} / 12 Slot
          </Badge>
        </div>
      </div>

      {/* TABEL BARIS 1-12 */}
      <div className="rounded-lg border border-zinc-200 bg-white shadow-2xs overflow-hidden">
        <Table>
          <TableHeader className="bg-zinc-50/75">
            <TableRow>
              <TableHead className="w-16 text-center font-semibold text-zinc-700">Urutan</TableHead>
              <TableHead className="font-semibold text-zinc-700">Mata Pelajaran</TableHead>
              <TableHead className="font-semibold text-zinc-700">Kitab</TableHead>
              <TableHead className="w-32 font-semibold text-zinc-700">Tipe</TableHead>
              <TableHead className="w-36 font-semibold text-zinc-700">Dihitung Total</TableHead>
              <TableHead className="w-28 text-center font-semibold text-zinc-700">Geser</TableHead>
              <TableHead className="w-24 text-right font-semibold text-zinc-700">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentItems.length > 0 ? (
              currentItems.map((item, index) => {
                const isFirst = index === 0;
                const isLast = index === currentItems.length - 1;

                return (
                  <TableRow key={item.id} className="hover:bg-zinc-50/50">
                    {/* Urutan */}
                    <TableCell className="text-center font-mono text-xs font-bold text-zinc-600">
                      #{item.urutan}
                    </TableCell>

                    {/* Mata Pelajaran */}
                    <TableCell>
                      <div className="flex items-center gap-2 font-semibold text-zinc-900">
                        <BookOpenIcon className="h-4 w-4 text-primary shrink-0" />
                        <span>{item.mapel?.nama ?? "-"}</span>
                      </div>
                    </TableCell>

                    {/* Kitab */}
                    <TableCell>
                      {item.kitab?.nama ? (
                        <div className="flex items-center gap-1.5 text-zinc-800">
                          <BookmarkIcon className="h-3.5 w-3.5 text-emerald-700 shrink-0" />
                          <span>{item.kitab.nama}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-zinc-400 italic">- Tanpa Kitab -</span>
                      )}
                    </TableCell>

                    {/* Tipe Nilai */}
                    <TableCell>
                      {item.tipe === "nilai" ? (
                        <Badge className="bg-emerald-700 hover:bg-emerald-800 text-white font-normal text-xs">
                          Nilai Angka
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-sky-500/40 text-sky-700 bg-sky-50 font-normal text-xs">
                          Kelengkapan
                        </Badge>
                      )}
                    </TableCell>

                    {/* Dihitung Total */}
                    <TableCell>
                      {item.dihitung_total ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-800">
                          <CheckCircle2Icon className="h-3.5 w-3.5 text-emerald-700" />
                          Masuk Total
                        </span>
                      ) : (
                        <span className="text-xs text-zinc-400">Tidak Dihitung</span>
                      )}
                    </TableCell>

                    {/* Geser Urutan (Naik / Turun) */}
                    <TableCell>
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={isFirst || isPending}
                          onClick={() => handleMove(item, "up")}
                          className="h-7 w-7 p-0 text-zinc-600 hover:text-zinc-900"
                          title="Pindah ke Atas"
                        >
                          <ChevronUpIcon className="h-3.5 w-3.5" />
                          <span className="sr-only">Naik</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={isLast || isPending}
                          onClick={() => handleMove(item, "down")}
                          className="h-7 w-7 p-0 text-zinc-600 hover:text-zinc-900"
                          title="Pindah ke Bawah"
                        >
                          <ChevronDownIcon className="h-3.5 w-3.5" />
                          <span className="sr-only">Turun</span>
                        </Button>
                      </div>
                    </TableCell>

                    {/* Aksi Edit / Hapus */}
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openEditDialog(item)}
                          className="h-7 w-7 p-0 text-zinc-600 hover:text-zinc-900"
                          title="Edit"
                        >
                          <EditIcon className="h-3.5 w-3.5" />
                          <span className="sr-only">Edit</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={isPending}
                          onClick={() => handleDelete(item)}
                          className="h-7 w-7 p-0 text-zinc-400 hover:text-destructive hover:bg-red-50"
                          title="Hapus"
                        >
                          <Trash2Icon className="h-3.5 w-3.5" />
                          <span className="sr-only">Hapus</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-zinc-500">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <p className="text-sm">Belum ada mata pelajaran yang dikonfigurasi untuk marhalah ini.</p>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={openAddDialog} className="h-8 text-xs">
                        <PlusIcon className="mr-1 h-3.5 w-3.5" /> Tambah Mata Pelajaran
                      </Button>
                      <Button size="sm" variant="outline" onClick={openCopyDialog} className="h-8 text-xs">
                        <CopyIcon className="mr-1 h-3.5 w-3.5" /> Salin dari Semester Lain
                      </Button>
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* DIALOG TAMBAH / UBAH MATA PELAJARAN */}
      <Dialog open={isFormDialogOpen} onOpenChange={setIsFormDialogOpen}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? "Ubah Konfigurasi Mapel" : "Tambah Mapel ke Marhalah"}
            </DialogTitle>
            <DialogDescription>
              {selectedMarhalah?.nama} • Semester {selectedSemester?.jenis}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleFormSubmit} className="space-y-4 py-2">
            {/* Pilih Mapel dengan Combobox */}
            <div className="space-y-1.5">
              <Label>Mata Pelajaran</Label>
              <Combobox
                options={mapelOptions}
                value={formMapelId}
                onChange={setFormMapelId}
                placeholder="Pilih mata pelajaran..."
                searchPlaceholder="Cari mapel (Fiqih, Nahwu)..."
                emptyText="Mata pelajaran tidak ditemukan."
                disabled={Boolean(editingItem)} // Mapel tidak diubah saat edit, atau bisa diubah
              />
            </div>

            {/* Pilih Kitab dengan Combobox */}
            <div className="space-y-1.5">
              <Label>Kitab Kajian (Opsional)</Label>
              <Combobox
                options={kitabOptions}
                value={formKitabId}
                onChange={setFormKitabId}
                placeholder="Pilih kitab..."
                searchPlaceholder="Cari kitab (Safinatun Naja, Jurumiyyah)..."
                emptyText="Kitab tidak ditemukan."
              />
            </div>

            {/* Pilih Tipe Mapel */}
            <div className="space-y-1.5">
              <Label>Tipe Mata Pelajaran</Label>
              <Select
                value={formTipe}
                onValueChange={(val) => handleTipeChange(val as "nilai" | "kelengkapan")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih Tipe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nilai">Nilai Angka (Diinput angka 0 - 100)</SelectItem>
                  <SelectItem value="kelengkapan">
                    Kelengkapan (Mis. Legalisir / Kelengkapan Administrasi)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Dihitung Total */}
            <div className="flex items-center gap-2 pt-2">
              <input
                id="dihitung_total"
                type="checkbox"
                checked={formDihitungTotal}
                disabled={formTipe === "kelengkapan"}
                onChange={(e) => setFormDihitungTotal(e.target.checked)}
                className="h-4 w-4 rounded border-zinc-300 text-primary focus:ring-primary disabled:opacity-50"
              />
              <Label htmlFor="dihitung_total" className="text-sm font-normal cursor-pointer">
                Ikut dihitung dalam akumulasi Total Nilai & Rata-rata Raport
              </Label>
            </div>
            {formTipe === "kelengkapan" ? (
              <p className="text-[11px] text-zinc-500 italic pl-6">
                * Tipe kelengkapan secara otomatis dikecualikan dari perhitungan total dan rata-rata.
              </p>
            ) : null}

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsFormDialogOpen(false)}
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

      {/* DIALOG SALIN DARI SEMESTER LAIN */}
      <Dialog open={isCopyDialogOpen} onOpenChange={setIsCopyDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Salin Kurikulum dari Semester Lain</DialogTitle>
            <DialogDescription>
              Menyalin susunan mata pelajaran dan kitab marhalah {selectedMarhalah?.nama} dari semester sumber ke semester target saat ini.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCopySubmit} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Pilih Semester Sumber</Label>
              <Select value={sumberSemesterId} onValueChange={setSumberSemesterId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih Semester Sumber" />
                </SelectTrigger>
                <SelectContent>
                  {semesterList
                    .filter((s) => s.id !== selectedSemesterId)
                    .map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        Semester {s.jenis} — TA {s.tahun_ajaran?.nama ?? "-"}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {/* Peringatan jika target sudah memiliki data */}
            {currentItems.length > 0 ? (
              <div className="rounded-md bg-amber-50 border border-amber-200 p-3 space-y-2">
                <div className="flex items-start gap-2 text-amber-800">
                  <AlertTriangleIcon className="h-4 w-4 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <p className="font-semibold">Perhatian: Data Akan Ditimpa!</p>
                    <p className="mt-0.5">
                      Marhalah ini pada semester target sudah memiliki{" "}
                      <strong>{currentItems.length} mata pelajaran</strong>. Menyalin kurikulum
                      akan <u>menghapus dan menggantikan</u> seluruh susunan mapel saat ini.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1 border-t border-amber-200">
                  <input
                    id="konfirmasi-timpa"
                    type="checkbox"
                    checked={konfirmasiTimpa}
                    onChange={(e) => setKonfirmasiTimpa(e.target.checked)}
                    className="h-4 w-4 rounded border-amber-400 text-amber-600 focus:ring-amber-500"
                  />
                  <Label
                    htmlFor="konfirmasi-timpa"
                    className="text-xs font-medium text-amber-900 cursor-pointer"
                  >
                    Saya yakin dan mengonfirmasi penimpaan data kurikulum ini
                  </Label>
                </div>
              </div>
            ) : null}

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCopyDialogOpen(false)}
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={isPending || (currentItems.length > 0 && !konfirmasiTimpa)}
              >
                {isPending ? "Menyalin..." : "Salin Sekarang"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

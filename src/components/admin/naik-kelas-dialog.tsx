"use client";

import * as React from "react";
import {
  TrendingUpIcon,
  CheckSquareIcon,
  SquareIcon,
  GraduationCapIcon,
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
import { useConfirm } from "@/hooks/use-confirm";
import { notify } from "@/lib/notify";
import { naikKelasMassalAction } from "@/app/admin/actions/import-santri";

export interface MarhalahItem {
  id: string;
  nama: string;
  kode: string;
  urutan: number;
}

export interface TahunAjaranItem {
  id: string;
  nama: string;
  kode: string;
  aktif: boolean;
}

export interface EnrollmentRaw {
  id: string;
  santri_id: string;
  marhalah_id: string;
  tahun_ajaran_id: string;
  santri?: {
    id: string;
    nama: string;
    nis: string | null;
    jenis_kelamin: "L" | "P";
    deleted_at: string | null;
  };
}

interface NaikKelasDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  marhalahList: MarhalahItem[];
  tahunAjaranList: TahunAjaranItem[];
  allEnrollments: EnrollmentRaw[];
  activeTahunAjaranId: string | null;
}

export function NaikKelasDialog({
  open,
  onOpenChange,
  marhalahList,
  tahunAjaranList,
  allEnrollments,
  activeTahunAjaranId,
}: NaikKelasDialogProps) {
  const confirm = useConfirm();
  const [isPending, startTransition] = React.useTransition();

  // Asal: TA & Marhalah
  const [taAsalId, setTaAsalId] = React.useState<string>(
    activeTahunAjaranId || tahunAjaranList[0]?.id || ""
  );
  const [marhalahAsalId, setMarhalahAsalId] = React.useState<string>(
    marhalahList[0]?.id || ""
  );

  // Tujuan: TA & Marhalah
  const [taTujuanId, setTaTujuanId] = React.useState<string>(
    activeTahunAjaranId || tahunAjaranList[0]?.id || ""
  );
  const [marhalahTujuanId, setMarhalahTujuanId] = React.useState<string>(
    marhalahList[1]?.id || marhalahList[0]?.id || ""
  );

  // Selected Santri IDs to Promote
  const [selectedSantriIds, setSelectedSantriIds] = React.useState<Set<string>>(new Set());

  // Santri di kelas asal
  const santriDiKelasAsal = React.useMemo(() => {
    return allEnrollments
      .filter(
        (e) =>
          e.tahun_ajaran_id === taAsalId &&
          e.marhalah_id === marhalahAsalId &&
          !e.santri?.deleted_at
      )
      .map((e) => e.santri!)
      .sort((a, b) => a.nama.localeCompare(b.nama));
  }, [allEnrollments, taAsalId, marhalahAsalId]);

  // Santri yang sudah ada di TA tujuan
  const santriSudahDiTaTujuan = React.useMemo(() => {
    const set = new Set<string>();
    allEnrollments
      .filter((e) => e.tahun_ajaran_id === taTujuanId)
      .forEach((e) => set.add(e.santri_id));
    return set;
  }, [allEnrollments, taTujuanId]);

  const handleTaAsalChange = (val: string) => {
    setTaAsalId(val);
    setSelectedSantriIds(new Set());
  };

  const handleMarhalahAsalChange = (val: string) => {
    setMarhalahAsalId(val);
    setSelectedSantriIds(new Set());
  };

  const handleTaTujuanChange = (val: string) => {
    setTaTujuanId(val);
    setSelectedSantriIds(new Set());
  };

  // Toggle single santri
  const toggleSantri = (id: string) => {
    setSelectedSantriIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Toggle select all
  const eligibleSantri = React.useMemo(
    () => santriDiKelasAsal.filter((s) => !santriSudahDiTaTujuan.has(s.id)),
    [santriDiKelasAsal, santriSudahDiTaTujuan]
  );

  const isAllSelected =
    eligibleSantri.length > 0 &&
    eligibleSantri.every((s) => selectedSantriIds.has(s.id));

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedSantriIds(new Set());
    } else {
      const next = new Set<string>();
      eligibleSantri.forEach((s) => next.add(s.id));
      setSelectedSantriIds(next);
    }
  };

  // Submit Handler dengan AlertDialog Konfirmasi
  const handleSubmit = async () => {
    if (selectedSantriIds.size === 0) {
      notify.error("Pilih minimal satu santri untuk dinaikkan kelas.");
      return;
    }

    if (taAsalId === taTujuanId && marhalahAsalId === marhalahTujuanId) {
      notify.error("Kelas dan Tahun Ajaran tujuan tidak boleh sama dengan asal.");
      return;
    }

    const marhalahAsalObj = marhalahList.find((m) => m.id === marhalahAsalId);
    const marhalahTujuanObj = marhalahList.find((m) => m.id === marhalahTujuanId);
    const taAsalObj = tahunAjaranList.find((t) => t.id === taAsalId);
    const taTujuanObj = tahunAjaranList.find((t) => t.id === taTujuanId);

    // Buka AlertDialog Konfirmasi
    const isConfirmed = await confirm({
      title: "Konfirmasi Naik Kelas Massal",
      description: `Apakah Anda yakin ingin menaikkan ${selectedSantriIds.size} santri dari kelas ${marhalahAsalObj?.nama} (TA ${taAsalObj?.nama}) ke kelas ${marhalahTujuanObj?.nama} (TA ${taTujuanObj?.nama})?`,
      confirmText: "Ya, Naikkan Kelas",
      cancelText: "Batal",
      destructive: false,
    });

    if (isConfirmed) {
      startTransition(async () => {
        const res = await naikKelasMassalAction({
          santri_ids: Array.from(selectedSantriIds),
          tahun_ajaran_tujuan_id: taTujuanId,
          marhalah_tujuan_id: marhalahTujuanId,
        });

        if (res.ok) {
          notify.success(res.message);
          onOpenChange(false);
        } else {
          notify.error(res.message);
        }
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[750px] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-primary">
              <TrendingUpIcon className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle>Naik Kelas Massal</DialogTitle>
              <DialogDescription>
                Pindahkan rombongan santri dari kelas/TA asal ke marhalah jenjang berikutnya pada tahun ajaran tujuan.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-2">
          {/* PILIHAN KELAS ASAL & TUJUAN */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* KOTAK ASAL */}
            <div className="p-3.5 bg-zinc-50 border border-zinc-200 rounded-lg space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                <GraduationCapIcon className="h-3.5 w-3.5 text-zinc-400" />
                <span>Kelas & Tahun Ajaran Asal</span>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Tahun Ajaran Asal</Label>
                <Select value={taAsalId} onValueChange={handleTaAsalChange}>
                  <SelectTrigger className="w-full h-8 text-xs">
                    <SelectValue placeholder="Pilih TA Asal" />
                  </SelectTrigger>
                  <SelectContent>
                    {tahunAjaranList.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        TA {t.nama} {t.aktif ? "(Aktif)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Marhalah Asal</Label>
                <Select value={marhalahAsalId} onValueChange={handleMarhalahAsalChange}>
                  <SelectTrigger className="w-full h-8 text-xs">
                    <SelectValue placeholder="Pilih Marhalah Asal" />
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
            </div>

            {/* KOTAK TUJUAN */}
            <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-lg space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                <TrendingUpIcon className="h-3.5 w-3.5 text-primary" />
                <span>Kelas & Tahun Ajaran Tujuan</span>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Tahun Ajaran Tujuan</Label>
                <Select value={taTujuanId} onValueChange={handleTaTujuanChange}>
                  <SelectTrigger className="w-full h-8 text-xs bg-white">
                    <SelectValue placeholder="Pilih TA Tujuan" />
                  </SelectTrigger>
                  <SelectContent>
                    {tahunAjaranList.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        TA {t.nama} {t.aktif ? "(Aktif)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Marhalah Tujuan</Label>
                <Select value={marhalahTujuanId} onValueChange={setMarhalahTujuanId}>
                  <SelectTrigger className="w-full h-8 text-xs bg-white">
                    <SelectValue placeholder="Pilih Marhalah Tujuan" />
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
            </div>
          </div>

          {/* DAFTAR SANTRI CHECKLIST */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={toggleSelectAll}
                  disabled={eligibleSantri.length === 0}
                  className="h-7 text-xs px-2 gap-1.5 text-zinc-700"
                >
                  {isAllSelected ? (
                    <CheckSquareIcon className="h-3.5 w-3.5 text-primary" />
                  ) : (
                    <SquareIcon className="h-3.5 w-3.5 text-zinc-400" />
                  )}
                  <span>Pilih Semua yang Memenuhi Syarat</span>
                </Button>
              </div>

              <div className="font-semibold text-zinc-700">
                Terpilih: <span className="text-primary font-bold">{selectedSantriIds.size}</span> dari {santriDiKelasAsal.length} Santri
              </div>
            </div>

            {/* TABEL SANTRI */}
            <div className="rounded-md border border-zinc-200 overflow-hidden max-h-[36vh] overflow-y-auto">
              <Table>
                <TableHeader className="bg-zinc-50 sticky top-0 z-10">
                  <TableRow>
                    <TableHead className="w-10 text-center"></TableHead>
                    <TableHead className="w-24 text-xs">NIS</TableHead>
                    <TableHead className="text-xs">Nama Santri</TableHead>
                    <TableHead className="w-16 text-center text-xs">JK</TableHead>
                    <TableHead className="text-xs text-right">Status di TA Tujuan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {santriDiKelasAsal.length > 0 ? (
                    santriDiKelasAsal.map((santri) => {
                      const isAlreadyEnrolled = santriSudahDiTaTujuan.has(santri.id);
                      const isChecked = selectedSantriIds.has(santri.id);

                      return (
                        <TableRow
                          key={santri.id}
                          onClick={() => {
                            if (!isAlreadyEnrolled) toggleSantri(santri.id);
                          }}
                          className={`cursor-pointer transition-colors ${
                            isAlreadyEnrolled
                              ? "bg-zinc-50 text-zinc-400 cursor-not-allowed"
                              : isChecked
                              ? "bg-emerald-50/50 hover:bg-emerald-50"
                              : "hover:bg-zinc-50/50"
                          }`}
                        >
                          <TableCell className="text-center p-2">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              disabled={isAlreadyEnrolled}
                              onChange={() => toggleSantri(santri.id)}
                              className="h-4 w-4 rounded border-zinc-300 text-primary focus:ring-primary cursor-pointer disabled:cursor-not-allowed"
                            />
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {santri.nis ? santri.nis : "-"}
                          </TableCell>
                          <TableCell className="font-semibold text-xs">
                            {santri.nama}
                          </TableCell>
                          <TableCell className="text-center text-xs font-bold">
                            {santri.jenis_kelamin}
                          </TableCell>
                          <TableCell className="text-right text-xs">
                            {isAlreadyEnrolled ? (
                              <Badge variant="outline" className="text-zinc-500 bg-zinc-100 text-[10px]">
                                Sudah Terdaftar di TA Tujuan
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="border-emerald-300 text-emerald-800 text-[10px]">
                                Siap Naik
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center text-xs text-zinc-400">
                        Tidak ada santri yang terdaftar di kelas dan tahun ajaran asal terpilih.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>

        <DialogFooter className="pt-3 border-t border-zinc-100">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Batal
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isPending || selectedSantriIds.size === 0}
            className="gap-1.5"
          >
            <TrendingUpIcon className="h-4 w-4" />
            <span>Naikkan {selectedSantriIds.size} Santri</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  Plus,
  Edit2,
  Trash2,
  Lock,
  Unlock,
  ChevronRight,
  ClipboardList,
  DoorOpen,
  Clock,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { toast } from "sonner";
import {
  createEhbAction,
  updateEhbAction,
  deleteEhbAction,
} from "@/app/admin/actions/ehb";
import type { EhbFormInput } from "@/lib/validations/ehb";

export interface EhbListItem {
  id: string;
  nama: string;
  tahun_ajaran_id: string;
  semester_id: string;
  tanggal_mulai: string;
  tanggal_selesai: string;
  status: "draft" | "dikunci";
  tahun_ajaran?: { id: string; nama: string };
  semester?: { id: string; jenis: string };
  totalRuangan: number;
  totalSesi: number;
  totalJadwal: number;
}

interface EhbListClientProps {
  ehbList: EhbListItem[];
  tahunAjaranList: Array<{ id: string; nama: string; aktif: boolean }>;
  semesterList: Array<{ id: string; jenis: string; tahun_ajaran_id: string; aktif: boolean }>;
}

export function EhbListClient({
  ehbList,
  tahunAjaranList,
  semesterList,
}: EhbListClientProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEhb, setEditingEhb] = useState<EhbListItem | null>(null);

  // Form State
  const [nama, setNama] = useState("");
  const [tahunAjaranId, setTahunAjaranId] = useState("");
  const [semesterId, setSemesterId] = useState("");
  const [tanggalMulai, setTanggalMulai] = useState("");
  const [tanggalSelesai, setTanggalSelesai] = useState("");
  const [status, setStatus] = useState<"draft" | "dikunci">("draft");
  const [saving, setSaving] = useState(false);

  // Delete State
  const [deleteTarget, setDeleteTarget] = useState<EhbListItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const filteredSemesters = semesterList.filter(
    (s) => !tahunAjaranId || s.tahun_ajaran_id === tahunAjaranId
  );

  const handleOpenAdd = () => {
    setEditingEhb(null);
    setNama("");
    // Default ke tahun ajaran & semester aktif jika ada
    const activeTa = tahunAjaranList.find((t) => t.aktif);
    const activeSem = semesterList.find((s) => s.aktif);
    setTahunAjaranId(activeTa?.id || tahunAjaranList[0]?.id || "");
    setSemesterId(activeSem?.id || semesterList[0]?.id || "");

    const todayStr = new Date().toISOString().split("T")[0];
    setTanggalMulai(todayStr);
    setTanggalSelesai(todayStr);
    setStatus("draft");
    setDialogOpen(true);
  };

  const handleOpenEdit = (ehb: EhbListItem) => {
    setEditingEhb(ehb);
    setNama(ehb.nama);
    setTahunAjaranId(ehb.tahun_ajaran_id);
    setSemesterId(ehb.semester_id);
    setTanggalMulai(ehb.tanggal_mulai);
    setTanggalSelesai(ehb.tanggal_selesai);
    setStatus(ehb.status);
    setDialogOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nama.trim()) {
      toast.error("Nama EHB wajib diisi");
      return;
    }
    if (!tahunAjaranId || !semesterId) {
      toast.error("Tahun ajaran dan semester wajib dipilih");
      return;
    }
    if (tanggalSelesai < tanggalMulai) {
      toast.error("Tanggal selesai tidak boleh sebelum tanggal mulai");
      return;
    }

    setSaving(true);
    const payload: EhbFormInput = {
      nama: nama.trim(),
      tahun_ajaran_id: tahunAjaranId,
      semester_id: semesterId,
      tanggal_mulai: tanggalMulai,
      tanggal_selesai: tanggalSelesai,
      status,
    };

    try {
      const res = editingEhb
        ? await updateEhbAction(editingEhb.id, payload)
        : await createEhbAction(payload);

      if (res.ok) {
        toast.success(res.message);
        setDialogOpen(false);
      } else {
        toast.error(res.message);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan event EHB");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await deleteEhbAction(deleteTarget.id);
      if (res.ok) {
        toast.success(res.message);
        setDeleteTarget(null);
      } else {
        toast.error(res.message);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus event EHB");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-primary" />
            Evaluasi Hasil Belajar (EHB)
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Kelola event ujian semester, pembagian ruang ujian, sesi, dan jadwal mata pelajaran.
          </p>
        </div>

        <Button
          onClick={handleOpenAdd}
          size="sm"
          className="bg-emerald-700 hover:bg-emerald-800 text-white font-medium shadow-xs"
        >
          <Plus className="h-4 w-4 mr-1.5" />
          Buat Event EHB Baru
        </Button>
      </div>

      {/* Daftar Event EHB */}
      {ehbList.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 p-12 text-center bg-white shadow-2xs">
          <div className="mx-auto w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 mb-3">
            <ClipboardList className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-slate-800">Belum Ada Event EHB</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            Klik tombol &ldquo;Buat Event EHB Baru&rdquo; untuk merencanakan pelaksanaan evaluasi hasil belajar semester ini.
          </p>
          <Button
            onClick={handleOpenAdd}
            size="sm"
            variant="outline"
            className="mt-4 border-slate-300 text-slate-700"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Buat Event Sekarang
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {ehbList.map((item) => (
            <div
              key={item.id}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-bold text-slate-900 text-base leading-snug">
                    {item.nama}
                  </h3>
                  {item.status === "dikunci" ? (
                    <Badge variant="outline" className="border-amber-400 bg-amber-50 text-amber-800 text-[10px] shrink-0 gap-1 font-medium">
                      <Lock className="w-3 h-3 text-amber-600" /> Dikunci
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-800 text-[10px] shrink-0 gap-1 font-medium">
                      <Unlock className="w-3 h-3 text-emerald-600" /> Draft
                    </Badge>
                  )}
                </div>

                <div className="text-xs text-muted-foreground space-y-1 mb-4">
                  <div className="flex items-center gap-1.5">
                    <CalendarDays className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>
                      {item.tahun_ajaran?.nama || "-"} · Semester {item.semester?.jenis || "-"}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 pl-5">
                    Pelaksanaan: {item.tanggal_mulai} s/d {item.tanggal_selesai}
                  </div>
                </div>

                {/* Ringkasan Konfigurasi */}
                <div className="grid grid-cols-3 gap-2 py-2.5 px-3 bg-slate-50 rounded-lg text-center text-xs mb-4">
                  <div className="border-r border-slate-200 pr-1">
                    <div className="text-slate-400 text-[10px] uppercase font-semibold flex items-center justify-center gap-1">
                      <DoorOpen className="w-3 h-3" /> Ruang
                    </div>
                    <div className="font-bold text-slate-800 mt-0.5">{item.totalRuangan}</div>
                  </div>
                  <div className="border-r border-slate-200 pr-1">
                    <div className="text-slate-400 text-[10px] uppercase font-semibold flex items-center justify-center gap-1">
                      <Clock className="w-3 h-3" /> Sesi
                    </div>
                    <div className="font-bold text-slate-800 mt-0.5">{item.totalSesi}</div>
                  </div>
                  <div>
                    <div className="text-slate-400 text-[10px] uppercase font-semibold flex items-center justify-center gap-1">
                      <BookOpen className="w-3 h-3" /> Jadwal
                    </div>
                    <div className="font-bold text-slate-800 mt-0.5">{item.totalJadwal}</div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t flex items-center justify-between gap-2">
                <div className="flex items-center gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-slate-600 hover:text-slate-900"
                    onClick={() => handleOpenEdit(item)}
                    title="Ubah Event EHB"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => setDeleteTarget(item)}
                    title="Hapus Event EHB"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>

                <Button
                  asChild
                  size="sm"
                  className="bg-primary hover:bg-primary/90 text-white text-xs h-8 gap-1 font-medium"
                >
                  <Link href={`/admin/ehb/${item.id}`}>
                    Kelola EHB
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* DIALOG TAMBAH / UBAH EHB */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              {editingEhb ? "Ubah Event EHB" : "Buat Event EHB Baru"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Tentukan periode, tahun ajaran, dan status pelaksanaan ujian.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Nama Event EHB</Label>
              <Input
                placeholder="misal: EHB Semester Ganjil 1447/1448 H"
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                className="h-9 text-xs"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Tahun Ajaran</Label>
                <Select
                  value={tahunAjaranId}
                  onValueChange={(val) => {
                    setTahunAjaranId(val);
                    // Sesuaikan semester pertama dari TA bersangkutan
                    const sems = semesterList.filter((s) => s.tahun_ajaran_id === val);
                    if (sems.length > 0) setSemesterId(sems[0].id);
                  }}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Pilih TA" />
                  </SelectTrigger>
                  <SelectContent>
                    {tahunAjaranList.map((t) => (
                      <SelectItem key={t.id} value={t.id} className="text-xs">
                        {t.nama} {t.aktif && "(Aktif)"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Semester</Label>
                <Select value={semesterId} onValueChange={setSemesterId}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Pilih Semester" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredSemesters.map((s) => (
                      <SelectItem key={s.id} value={s.id} className="text-xs">
                        Semester {s.jenis} {s.aktif && "(Aktif)"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Tanggal Mulai</Label>
                <Input
                  type="date"
                  value={tanggalMulai}
                  onChange={(e) => setTanggalMulai(e.target.value)}
                  className="h-9 text-xs"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Tanggal Selesai</Label>
                <Input
                  type="date"
                  value={tanggalSelesai}
                  onChange={(e) => setTanggalSelesai(e.target.value)}
                  className="h-9 text-xs"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Status Event</Label>
              <Select value={status} onValueChange={(val) => setStatus(val as "draft" | "dikunci")}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft" className="text-xs">
                    Draft (Dapat diedit dan diubah jadwal)
                  </SelectItem>
                  <SelectItem value="dikunci" className="text-xs">
                    Dikunci (Konfigurasi dan jadwal difinalisasi)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDialogOpen(false)}
                disabled={saving}
              >
                Batal
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-emerald-700 hover:bg-emerald-800 text-white"
                disabled={saving}
              >
                {saving ? "Menyimpan..." : editingEhb ? "Simpan Perubahan" : "Buat Event"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ALERT DIALOG HAPUS EHB */}
      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold text-slate-900">
              Hapus Event EHB?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-slate-600">
              Apakah Anda yakin ingin menghapus event &ldquo;<strong>{deleteTarget?.nama}</strong>&rdquo;? Seluruh data ruangan, sesi, dan jadwal ujian yang terdaftar pada event ini akan ikut terhapus permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting} className="text-xs">Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 text-white text-xs"
            >
              {deleting ? "Menghapus..." : "Hapus Permanen"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

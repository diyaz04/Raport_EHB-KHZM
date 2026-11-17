"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  Lock,
  Unlock,
  Plus,
  Edit2,
  Trash2,
  DoorOpen,
  Clock,
  BookOpen,
  AlertTriangle,
  LayoutGrid,
  ListFilter,
  Users,
  Settings2,
  RefreshCw,
  Shuffle,
  Search,
  Filter,
  CheckCircle2,
  UserCheck,
  Printer,
  FileText,
  FileCheck,
  Download,
  ExternalLink,
  CreditCard,
} from "lucide-react";
import { useSessionStorageState } from "@/hooks/use-storage-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  createEhbRuanganAction,
  updateEhbRuanganAction,
  deleteEhbRuanganAction,
  createEhbSesiAction,
  updateEhbSesiAction,
  deleteEhbSesiAction,
  createEhbJadwalAction,
  deleteEhbJadwalAction,
  generatePesertaEhbAction,
  alokasiRuanganEhbAction,
  updatePesertaRuanganAction,
  updateFormatNomorPesertaAction,
} from "@/app/admin/actions/ehb";

export interface EhbDetail {
  id: string;
  nama: string;
  tahun_ajaran_id: string;
  semester_id: string;
  tanggal_mulai: string;
  tanggal_selesai: string;
  status: "draft" | "dikunci";
  format_nomor_peserta?: string;
  tahun_ajaran?: { id: string; nama: string };
  semester?: { id: string; jenis: string };
}

export interface EhbRuanganItem {
  id: string;
  ehb_id: string;
  nama: string;
  kapasitas: number;
}

export interface EhbSesiItem {
  id: string;
  ehb_id: string;
  tanggal: string;
  jam_mulai: string;
  jam_selesai: string;
}

export interface EhbJadwalItem {
  id: string;
  sesi_id: string;
  marhalah_id: string;
  marhalah_mapel_id: string;
  marhalah?: { id: string; nama: string; urutan?: number };
  marhalah_mapel?: {
    id: string;
    mapel?: { id: string; nama: string };
    kitab?: { id: string; nama: string } | null;
    urutan?: number;
    tipe?: string;
  };
}

export interface MarhalahOption {
  id: string;
  nama: string;
  kode?: string;
  urutan?: number;
}

export interface MarhalahMapelOption {
  id: string;
  marhalah_id: string;
  semester_id: string;
  mapel_id: string;
  kitab_id: string | null;
  mapelNama: string;
  kitabNama?: string | null;
  urutan?: number;
  tipe?: string;
}

export interface EhbPesertaItem {
  id: string;
  ehb_id: string;
  enrollment_id: string;
  no_peserta: string;
  ruangan_id: string | null;
  no_urut: number | null;
  santriNama: string;
  santriNis?: string | null;
  santriGender?: string | null;
  marhalahId: string;
  marhalahNama: string;
  marhalahKode?: string;
  marhalahUrutan?: number;
  ruanganNama?: string | null;
}

interface EhbDetailClientProps {
  ehb: EhbDetail;
  ruanganList: EhbRuanganItem[];
  sesiList: EhbSesiItem[];
  jadwalList: EhbJadwalItem[];
  marhalahList: MarhalahOption[];
  marhalahMapelList: MarhalahMapelOption[];
  pesertaList: EhbPesertaItem[];
  totalActiveEnrollments: number;
}

function formatDateIndo(dateStr: string) {
  if (!dateStr) return "-";
  try {
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      return d.toLocaleDateString("id-ID", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    }
    return dateStr;
  } catch {
    return dateStr;
  }
}

function formatTime(timeStr: string) {
  if (!timeStr) return "-";
  return timeStr.slice(0, 5);
}

function calculateDuration(start: string, end: string) {
  try {
    const [h1, m1] = start.split(":").map(Number);
    const [h2, m2] = end.split(":").map(Number);
    const minutes = h2 * 60 + m2 - (h1 * 60 + m1);
    return minutes > 0 ? `${minutes} Menit` : "-";
  } catch {
    return "-";
  }
}

export function EhbDetailClient({
  ehb,
  ruanganList,
  sesiList,
  jadwalList,
  marhalahList,
  marhalahMapelList,
  pesertaList,
  totalActiveEnrollments,
}: EhbDetailClientProps) {
  const router = useRouter();
  const isLocked = ehb.status === "dikunci";

  // Tab State with browser sessionStorage persistence
  const [activeTab, setActiveTab] = useSessionStorageState<string>(
    `ehb_tab_${ehb.id}`,
    "ruangan"
  );

  // ==========================================
  // 1. STATE RUANGAN
  // ==========================================
  const [ruanganDialogOpen, setRuanganDialogOpen] = useState(false);
  const [editingRuangan, setEditingRuangan] = useState<EhbRuanganItem | null>(null);
  const [ruanganNama, setRuanganNama] = useState("");
  const [ruanganKapasitas, setRuanganKapasitas] = useState<number>(30);
  const [ruanganSaving, setRuanganSaving] = useState(false);
  const [ruanganDeleteTarget, setRuanganDeleteTarget] = useState<EhbRuanganItem | null>(null);
  const [ruanganDeleting, setRuanganDeleting] = useState(false);

  const handleOpenAddRuangan = () => {
    setEditingRuangan(null);
    setRuanganNama(`Ruang 0${ruanganList.length + 1}`);
    setRuanganKapasitas(30);
    setRuanganDialogOpen(true);
  };

  const handleOpenEditRuangan = (r: EhbRuanganItem) => {
    setEditingRuangan(r);
    setRuanganNama(r.nama);
    setRuanganKapasitas(r.kapasitas);
    setRuanganDialogOpen(true);
  };

  const handleSaveRuangan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruanganNama.trim()) {
      toast.error("Nama ruangan wajib diisi");
      return;
    }
    if (ruanganKapasitas < 1) {
      toast.error("Kapasitas minimal 1 santri");
      return;
    }

    setRuanganSaving(true);
    try {
      if (editingRuangan) {
        const res = await updateEhbRuanganAction(editingRuangan.id, {
          ehb_id: ehb.id,
          nama: ruanganNama.trim(),
          kapasitas: Number(ruanganKapasitas),
        });
        if (res.ok) {
          toast.success(res.message);
          setRuanganDialogOpen(false);
          router.refresh();
        } else {
          toast.error(res.message);
        }
      } else {
        const res = await createEhbRuanganAction({
          ehb_id: ehb.id,
          nama: ruanganNama.trim(),
          kapasitas: Number(ruanganKapasitas),
        });
        if (res.ok) {
          toast.success(res.message);
          setRuanganDialogOpen(false);
          router.refresh();
        } else {
          toast.error(res.message);
        }
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan ruangan");
    } finally {
      setRuanganSaving(false);
    }
  };

  const handleDeleteRuangan = async () => {
    if (!ruanganDeleteTarget) return;
    setRuanganDeleting(true);
    try {
      const res = await deleteEhbRuanganAction(ruanganDeleteTarget.id, ehb.id);
      if (res.ok) {
        toast.success(res.message);
        setRuanganDeleteTarget(null);
        router.refresh();
      } else {
        toast.error(res.message);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus ruangan");
    } finally {
      setRuanganDeleting(false);
    }
  };

  // ==========================================
  // 2. STATE SESI
  // ==========================================
  const [sesiDialogOpen, setSesiDialogOpen] = useState(false);
  const [editingSesi, setEditingSesi] = useState<EhbSesiItem | null>(null);
  const [sesiTanggal, setSesiTanggal] = useState(ehb.tanggal_mulai);
  const [sesiJamMulai, setSesiJamMulai] = useState("08:00");
  const [sesiJamSelesai, setSesiJamSelesai] = useState("09:30");
  const [sesiSaving, setSesiSaving] = useState(false);
  const [sesiDeleteTarget, setSesiDeleteTarget] = useState<EhbSesiItem | null>(null);
  const [sesiDeleting, setSesiDeleting] = useState(false);

  const handleOpenAddSesi = () => {
    setEditingSesi(null);
    const defaultDate = sesiList.length > 0 ? sesiList[sesiList.length - 1].tanggal : ehb.tanggal_mulai;
    setSesiTanggal(defaultDate);
    setSesiJamMulai("08:00");
    setSesiJamSelesai("09:30");
    setSesiDialogOpen(true);
  };

  const handleOpenEditSesi = (s: EhbSesiItem) => {
    setEditingSesi(s);
    setSesiTanggal(s.tanggal);
    setSesiJamMulai(formatTime(s.jam_mulai));
    setSesiJamSelesai(formatTime(s.jam_selesai));
    setSesiDialogOpen(true);
  };

  const handleSaveSesi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sesiTanggal) {
      toast.error("Tanggal sesi wajib diisi");
      return;
    }
    const cleanStart = sesiJamMulai.slice(0, 5);
    const cleanEnd = sesiJamSelesai.slice(0, 5);

    if (cleanEnd <= cleanStart) {
      toast.error("Jam selesai harus setelah jam mulai");
      return;
    }

    setSesiSaving(true);
    try {
      if (editingSesi) {
        const res = await updateEhbSesiAction(editingSesi.id, {
          ehb_id: ehb.id,
          tanggal: sesiTanggal,
          jam_mulai: cleanStart,
          jam_selesai: cleanEnd,
        });
        if (res.ok) {
          toast.success(res.message);
          setSesiDialogOpen(false);
          router.refresh();
        } else {
          toast.error(res.message);
        }
      } else {
        const res = await createEhbSesiAction({
          ehb_id: ehb.id,
          tanggal: sesiTanggal,
          jam_mulai: cleanStart,
          jam_selesai: cleanEnd,
        });
        if (res.ok) {
          toast.success(res.message);
          setSesiDialogOpen(false);
          router.refresh();
        } else {
          toast.error(res.message);
        }
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan sesi");
    } finally {
      setSesiSaving(false);
    }
  };

  const handleDeleteSesi = async () => {
    if (!sesiDeleteTarget) return;
    setSesiDeleting(true);
    try {
      const res = await deleteEhbSesiAction(sesiDeleteTarget.id, ehb.id);
      if (res.ok) {
        toast.success(res.message);
        setSesiDeleteTarget(null);
        router.refresh();
      } else {
        toast.error(res.message);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus sesi");
    } finally {
      setSesiDeleting(false);
    }
  };

  // ==========================================
  // 3. STATE JADWAL
  // ==========================================
  const [jadwalDialogOpen, setJadwalDialogOpen] = useState(false);
  const [jadwalSesiId, setJadwalSesiId] = useState<string>("");
  const [jadwalMarhalahId, setJadwalMarhalahId] = useState<string>("");
  const [jadwalMapelId, setJadwalMapelId] = useState<string>("");
  const [jadwalSaving, setJadwalSaving] = useState(false);
  const [jadwalDeleteTarget, setJadwalDeleteTarget] = useState<EhbJadwalItem | null>(null);
  const [jadwalDeleting, setJadwalDeleting] = useState(false);
  const [jadwalViewMode, setJadwalViewMode] = useState<"card" | "matrix">("card");

  const availableMapel = marhalahMapelList.filter(
    (m) => m.marhalah_id === jadwalMarhalahId
  );

  const handleOpenAddJadwal = (preselectedSesiId?: string, preselectedMarhalahId?: string) => {
    setJadwalSesiId(preselectedSesiId || (sesiList[0]?.id ?? ""));
    const firstMarhalah = preselectedMarhalahId || (marhalahList[0]?.id ?? "");
    setJadwalMarhalahId(firstMarhalah);

    const mapels = marhalahMapelList.filter((m) => m.marhalah_id === firstMarhalah);
    setJadwalMapelId(mapels[0]?.id ?? "");
    setJadwalDialogOpen(true);
  };

  const handleSaveJadwal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jadwalSesiId) {
      toast.error("Pilih sesi ujian terlebih dahulu");
      return;
    }
    if (!jadwalMarhalahId) {
      toast.error("Pilih tingkatan marhalah terlebih dahulu");
      return;
    }
    if (!jadwalMapelId) {
      toast.error("Pilih mata pelajaran yang akan diujikan");
      return;
    }

    const existing = jadwalList.find(
      (j) => j.sesi_id === jadwalSesiId && j.marhalah_id === jadwalMarhalahId
    );
    if (existing) {
      toast.error("Marhalah ini sudah memiliki mata pelajaran pada sesi tersebut.");
      return;
    }

    setJadwalSaving(true);
    try {
      const res = await createEhbJadwalAction(
        {
          sesi_id: jadwalSesiId,
          marhalah_id: jadwalMarhalahId,
          marhalah_mapel_id: jadwalMapelId,
        },
        ehb.id
      );

      if (res.ok) {
        toast.success(res.message);
        setJadwalDialogOpen(false);
        router.refresh();
      } else {
        toast.error(res.message);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menjadwalkan mapel");
    } finally {
      setJadwalSaving(false);
    }
  };

  const handleDeleteJadwal = async () => {
    if (!jadwalDeleteTarget) return;
    setJadwalDeleting(true);
    try {
      const res = await deleteEhbJadwalAction(jadwalDeleteTarget.id, ehb.id);
      if (res.ok) {
        toast.success(res.message);
        setJadwalDeleteTarget(null);
        router.refresh();
      } else {
        toast.error(res.message);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus jadwal");
    } finally {
      setJadwalDeleting(false);
    }
  };

  // ==========================================
  // 4. STATE PESERTA & PENEMPATAN RUANGAN (STEP 22)
  // ==========================================
  const [pesertaSearch, setPesertaSearch] = useState("");
  const [filterMarhalah, setFilterMarhalah] = useState("all");
  const [filterRuangan, setFilterRuangan] = useState("all");

  // Format Dialog
  const [formatDialogOpen, setFormatDialogOpen] = useState(false);
  const [formatInput, setFormatInput] = useState(
    ehb.format_nomor_peserta || "{kode TA}-{kode marhalah}-{urut 3 digit}"
  );
  const [formatSaving, setFormatSaving] = useState(false);

  // Sync / Regenerate
  const [syncing, setSyncing] = useState(false);
  const [regenerateAlertOpen, setRegenerateAlertOpen] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  // Alokasi Ruangan Dialog
  const [alokasiDialogOpen, setAlokasiDialogOpen] = useState(false);
  const [alokasiMode, setAlokasiMode] = useState<"per_marhalah" | "campur">("per_marhalah");
  const [alokasiSaving, setAlokasiSaving] = useState(false);

  // Geser Manual Ruangan via Combobox
  const [movingPesertaId, setMovingPesertaId] = useState<string | null>(null);

  // ==========================================
  // 5. STATE CETAK DOKUMEN EHB (STEP 23)
  // ==========================================
  const [daftarHadirDialogOpen, setDaftarHadirDialogOpen] = useState(false);
  const [dhCakupan, setDhCakupan] = useState<"per_sesi" | "semua_sesi">("per_sesi");
  const [dhSesiId, setDhSesiId] = useState<string>("all");
  const [dhRuanganId, setDhRuanganId] = useState<string>("all");

  const [beritaAcaraDialogOpen, setBeritaAcaraDialogOpen] = useState(false);
  const [baSesiId, setBaSesiId] = useState<string>("all");
  const [baRuanganId, setBaRuanganId] = useState<string>("all");

  // Preview Modal
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);
  const [previewPdfTitle, setPreviewPdfTitle] = useState<string>("");

  const getDaftarHadirUrl = () => {
    return `/api/ehb/daftar-hadir?ehbId=${ehb.id}&cakupan=${dhCakupan}&sesiId=${dhSesiId}&ruanganId=${dhRuanganId}`;
  };

  const getBeritaAcaraUrl = () => {
    return `/api/ehb/berita-acara?ehbId=${ehb.id}&sesiId=${baSesiId}&ruanganId=${baRuanganId}`;
  };

  const handleOpenDhPreview = () => {
    setPreviewPdfTitle(
      dhCakupan === "semua_sesi"
        ? "Preview Daftar Hadir - Rekap Semua Sesi (Landscape)"
        : "Preview Daftar Hadir - Per Sesi (Portrait)"
    );
    setPreviewPdfUrl(getDaftarHadirUrl());
  };

  const handleOpenBaPreview = () => {
    setPreviewPdfTitle("Preview Berita Acara Ujian EHB (Portrait)");
    setPreviewPdfUrl(getBeritaAcaraUrl());
  };

  // State & Handler Cetak Kartu Peserta EHB (Step 24)
  const [kartuDialogOpen, setKartuDialogOpen] = useState(false);
  const [kartuScope, setKartuScope] = useState<"semua" | "ruangan" | "marhalah" | "peserta">("semua");
  const [kartuRuanganId, setKartuRuanganId] = useState<string>("all");
  const [kartuMarhalahId, setKartuMarhalahId] = useState<string>("all");
  const [kartuPesertaId, setKartuPesertaId] = useState<string>("all");

  const getKartuUrl = () => {
    const pId = kartuScope === "peserta" ? kartuPesertaId : "all";
    const rId = kartuScope === "ruangan" ? kartuRuanganId : "all";
    const mId = kartuScope === "marhalah" ? kartuMarhalahId : "all";
    return `/api/ehb/kartu-peserta?ehbId=${ehb.id}&pesertaId=${pId}&ruanganId=${rId}&marhalahId=${mId}`;
  };

  const handleOpenKartuPreview = () => {
    let scopeDesc = "Semua Peserta";
    if (kartuScope === "ruangan") {
      const r = ruanganList.find((x) => x.id === kartuRuanganId);
      scopeDesc = `Ruang ${r?.nama || kartuRuanganId}`;
    } else if (kartuScope === "marhalah") {
      const m = marhalahList.find((x) => x.id === kartuMarhalahId);
      scopeDesc = `Kelas ${m?.nama || kartuMarhalahId}`;
    } else if (kartuScope === "peserta") {
      const p = pesertaList.find((x) => x.id === kartuPesertaId);
      scopeDesc = p?.santriNama || "Santri";
    }

    setPreviewPdfTitle(`Preview Kartu Evaluasi Hasil Belajar (EHB) - ${scopeDesc}`);
    setPreviewPdfUrl(getKartuUrl());
    setKartuDialogOpen(false);
  };

  // Handle Save Format
  const handleSaveFormat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formatInput.trim()) {
      toast.error("Format nomor peserta tidak boleh kosong");
      return;
    }
    setFormatSaving(true);
    try {
      const res = await updateFormatNomorPesertaAction({
        ehbId: ehb.id,
        format: formatInput.trim(),
      });
      if (res.ok) {
        toast.success(res.message);
        setFormatDialogOpen(false);
        router.refresh();
      } else {
        toast.error(res.message);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan format");
    } finally {
      setFormatSaving(false);
    }
  };

  // Handle Sync Santri Baru (Nomor Stabil)
  const handleSyncSantri = async () => {
    setSyncing(true);
    try {
      const res = await generatePesertaEhbAction({
        ehbId: ehb.id,
        forceRegenerate: false,
        formatNomorPeserta: ehb.format_nomor_peserta,
      });
      if (res.ok) {
        toast.success(res.message);
        router.refresh();
      } else {
        toast.error(res.message);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal melakukan sinkronisasi");
    } finally {
      setSyncing(false);
    }
  };

  // Handle Force Regenerate Nomor Peserta
  const handleForceRegenerate = async () => {
    setRegenerating(true);
    try {
      const res = await generatePesertaEhbAction({
        ehbId: ehb.id,
        forceRegenerate: true,
        formatNomorPeserta: formatInput,
      });
      if (res.ok) {
        toast.success(res.message);
        setRegenerateAlertOpen(false);
        router.refresh();
      } else {
        toast.error(res.message);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal generate ulang nomor");
    } finally {
      setRegenerating(false);
    }
  };

  // Handle Alokasi Ruangan Otomatis
  const handleExecuteAlokasi = async () => {
    if (ruanganList.length === 0) {
      toast.error("Tambahkan ruangan ujian terlebih dahulu pada tab Ruangan.");
      return;
    }
    if (pesertaList.length === 0) {
      toast.error("Generate nomor peserta terlebih dahulu sebelum alokasi ruangan.");
      return;
    }
    setAlokasiSaving(true);
    try {
      const res = await alokasiRuanganEhbAction({
        ehbId: ehb.id,
        mode: alokasiMode,
      });
      if (res.ok) {
        toast.success(res.message);
        setAlokasiDialogOpen(false);
        router.refresh();
      } else {
        toast.error(res.message);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal alokasi ruangan");
    } finally {
      setAlokasiSaving(false);
    }
  };

  // Handle Manual Room Move via Combobox
  const handleManualRoomChange = async (pesertaId: string, targetRuanganId: string | null) => {
    setMovingPesertaId(pesertaId);
    try {
      const res = await updatePesertaRuanganAction({
        pesertaId,
        ehbId: ehb.id,
        ruanganId: targetRuanganId,
      });
      if (res.ok) {
        toast.success(res.message);
        router.refresh();
      } else {
        toast.error(res.message);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal memindahkan ruangan");
    } finally {
      setMovingPesertaId(null);
    }
  };

  // Filtered Peserta List
  const filteredPeserta = useMemo(() => {
    return pesertaList.filter((p) => {
      const query = pesertaSearch.toLowerCase().trim();
      const matchSearch =
        !query ||
        p.santriNama.toLowerCase().includes(query) ||
        (p.santriNis && p.santriNis.toLowerCase().includes(query)) ||
        p.no_peserta.toLowerCase().includes(query);

      const matchMarhalah = filterMarhalah === "all" || p.marhalahId === filterMarhalah;

      const matchRuangan =
        filterRuangan === "all" ||
        (filterRuangan === "_unassigned" && !p.ruangan_id) ||
        p.ruangan_id === filterRuangan;

      return matchSearch && matchMarhalah && matchRuangan;
    });
  }, [pesertaList, pesertaSearch, filterMarhalah, filterRuangan]);

  // Calculate summary metrics
  const totalKapasitasRuangan = ruanganList.reduce((acc, curr) => acc + curr.kapasitas, 0);
  const totalPesertaDapatRuangan = pesertaList.filter((p) => p.ruangan_id !== null).length;
  const totalPesertaBelumRuangan = pesertaList.length - totalPesertaDapatRuangan;

  // Live preview of format
  const previewNoPeserta = useMemo(() => {
    const fmt = formatInput || "{kode TA}-{kode marhalah}-{urut 3 digit}";
    return fmt
      .replace(/{kode TA}|{kode_ta}/g, "2526")
      .replace(/{kode marhalah}|{kode_marhalah}/g, "01")
      .replace(/{urut 3 digit}|{urut}/g, "001");
  }, [formatInput]);

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link
            href="/admin/ehb"
            className="inline-flex items-center text-xs text-muted-foreground hover:text-emerald-700 transition-colors mb-2 font-medium"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1" />
            Kembali ke Daftar EHB
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              {ehb.nama}
            </h1>
            {isLocked ? (
              <Badge variant="outline" className="border-amber-400 bg-amber-50 text-amber-800 text-xs gap-1 font-medium">
                <Lock className="w-3 h-3 text-amber-600" /> Dikunci
              </Badge>
            ) : (
              <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-800 text-xs gap-1 font-medium">
                <Unlock className="w-3 h-3 text-emerald-600" /> Draft (Dapat Diedit)
              </Badge>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground mt-1.5">
            <span className="flex items-center gap-1">
              <CalendarDays className="w-3.5 h-3.5 text-slate-400" />
              {ehb.tahun_ajaran?.nama || "-"} · Semester {ehb.semester?.jenis || "-"}
            </span>
            <span className="text-slate-300">•</span>
            <span>
              Periode Ujian: <strong>{formatDateIndo(ehb.tanggal_mulai)}</strong> s/d <strong>{formatDateIndo(ehb.tanggal_selesai)}</strong>
            </span>
          </div>
        </div>

        {/* Action Buttons Cetak Dokumen Ujian (Step 23) */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={() => setDaftarHadirDialogOpen(true)}
            size="sm"
            variant="outline"
            className="border-slate-300 text-slate-800 text-xs h-9 shadow-2xs hover:border-emerald-700 hover:text-emerald-800"
          >
            <FileText className="w-3.5 h-3.5 mr-1.5 text-emerald-700" />
            Cetak Daftar Hadir
          </Button>

          <Button
            onClick={() => setBeritaAcaraDialogOpen(true)}
            size="sm"
            variant="outline"
            className="border-slate-300 text-slate-800 text-xs h-9 shadow-2xs hover:border-emerald-700 hover:text-emerald-800"
          >
            <FileCheck className="w-3.5 h-3.5 mr-1.5 text-emerald-700" />
            Cetak Berita Acara
          </Button>

          <Button
            onClick={() => setKartuDialogOpen(true)}
            size="sm"
            variant="outline"
            className="border-slate-300 text-slate-800 text-xs h-9 shadow-2xs hover:border-emerald-700 hover:text-emerald-800"
          >
            <CreditCard className="w-3.5 h-3.5 mr-1.5 text-emerald-700" />
            Cetak Kartu Ujian
          </Button>
        </div>
      </div>

      {/* Lock Notice Alert */}
      {isLocked && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-4 flex items-start gap-3 shadow-2xs">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-900 space-y-0.5">
            <p className="font-semibold text-sm text-amber-950">
              Evaluasi Hasil Belajar ini Berstatus DIKUNCI
            </p>
            <p className="text-amber-800">
              Konfigurasi ruangan, sesi ujian, jadwal, serta alokasi peserta dan nomor ujian terkunci demi menjaga integritas data.
              Untuk mengubah pengaturan, buka menu utama EHB lalu ubah status kembali menjadi &ldquo;Draft&rdquo;.
            </p>
          </div>
        </div>
      )}

      {/* Metric Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="shadow-2xs border-slate-200 bg-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Ruangan</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">{ruanganList.length} Ruang</h3>
              <p className="text-[11px] text-emerald-700 font-medium mt-0.5">
                Kapasitas: {totalKapasitasRuangan} santri
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <DoorOpen className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-2xs border-slate-200 bg-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Sesi Ujian</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">{sesiList.length} Sesi</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Tersebar di {new Set(sesiList.map((s) => s.tanggal)).size} hari ujian
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-2xs border-slate-200 bg-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Mapel Terjadwal</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">{jadwalList.length} Jadwal</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Untuk {marhalahList.length} tingkatan marhalah
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-2xs border-slate-200 bg-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Peserta Ujian</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">{pesertaList.length} Santri</h3>
              <p className="text-[11px] text-slate-600 mt-0.5">
                {totalPesertaDapatRuangan}/{pesertaList.length} sudah dapat kursi
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabbed Setup Interface */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-slate-100/90 p-1.5 rounded-xl border border-slate-200 w-full grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-1.5 shadow-2xs">
          <TabsTrigger
            value="ruangan"
            className="text-xs sm:text-sm font-semibold data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-950 data-[state=active]:shadow-xs data-[state=active]:border data-[state=active]:border-emerald-400/40 data-[state=active]:ring-1 data-[state=active]:ring-emerald-500/20 py-2.5 px-3 rounded-lg flex items-center justify-center transition-all hover:text-slate-900"
          >
            <DoorOpen className="w-4 h-4 mr-1.5 text-emerald-700 shrink-0" />
            <span>1. Ruangan</span>
            <span className="ml-1.5 px-1.5 py-0.5 bg-slate-200 text-slate-700 text-[11px] rounded-full font-bold">
              {ruanganList.length}
            </span>
          </TabsTrigger>
          <TabsTrigger
            value="sesi"
            className="text-xs sm:text-sm font-semibold data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-950 data-[state=active]:shadow-xs data-[state=active]:border data-[state=active]:border-emerald-400/40 data-[state=active]:ring-1 data-[state=active]:ring-emerald-500/20 py-2.5 px-3 rounded-lg flex items-center justify-center transition-all hover:text-slate-900"
          >
            <Clock className="w-4 h-4 mr-1.5 text-emerald-700 shrink-0" />
            <span>2. Sesi Ujian</span>
            <span className="ml-1.5 px-1.5 py-0.5 bg-slate-200 text-slate-700 text-[11px] rounded-full font-bold">
              {sesiList.length}
            </span>
          </TabsTrigger>
          <TabsTrigger
            value="jadwal"
            className="text-xs sm:text-sm font-semibold data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-950 data-[state=active]:shadow-xs data-[state=active]:border data-[state=active]:border-emerald-400/40 data-[state=active]:ring-1 data-[state=active]:ring-emerald-500/20 py-2.5 px-3 rounded-lg flex items-center justify-center transition-all hover:text-slate-900"
          >
            <BookOpen className="w-4 h-4 mr-1.5 text-emerald-700 shrink-0" />
            <span>3. Jadwal Mapel</span>
            <span className="ml-1.5 px-1.5 py-0.5 bg-slate-200 text-slate-700 text-[11px] rounded-full font-bold">
              {jadwalList.length}
            </span>
          </TabsTrigger>
          <TabsTrigger
            value="peserta"
            className="text-xs sm:text-sm font-semibold data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-950 data-[state=active]:shadow-xs data-[state=active]:border data-[state=active]:border-emerald-400/40 data-[state=active]:ring-1 data-[state=active]:ring-emerald-500/20 py-2.5 px-3 rounded-lg flex items-center justify-center transition-all hover:text-slate-900"
          >
            <Users className="w-4 h-4 mr-1.5 text-emerald-700 shrink-0" />
            <span>4. Peserta & Penempatan</span>
            <span className="ml-1.5 px-1.5 py-0.5 bg-slate-200 text-slate-700 text-[11px] rounded-full font-bold">
              {pesertaList.length}
            </span>
          </TabsTrigger>
          <TabsTrigger
            value="dokumen"
            className="text-xs sm:text-sm font-semibold data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-950 data-[state=active]:shadow-xs data-[state=active]:border data-[state=active]:border-emerald-400/40 data-[state=active]:ring-1 data-[state=active]:ring-emerald-500/20 py-2.5 px-3 rounded-lg flex items-center justify-center transition-all hover:text-slate-900 col-span-2 sm:col-span-1"
          >
            <Printer className="w-4 h-4 mr-1.5 text-emerald-700 shrink-0" />
            <span>5. Berkas & Cetak</span>
          </TabsTrigger>
        </TabsList>

        {/* ========================================================================= */}
        {/* TAB 1: RUANGAN */}
        {/* ========================================================================= */}
        <TabsContent value="ruangan" className="w-full mt-4 space-y-4">
          <Card className="border-slate-200 shadow-2xs bg-white">
            <CardHeader className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <DoorOpen className="w-4 h-4 text-emerald-700" />
                  Daftar Ruang Ujian
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-0.5">
                  Tentukan ruangan ujian beserta kapasitas maksimal santri per ruangan.
                </CardDescription>
              </div>

              {!isLocked && (
                <Button
                  onClick={handleOpenAddRuangan}
                  size="sm"
                  className="bg-emerald-700 hover:bg-emerald-800 text-white font-medium text-xs shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5 mr-1.5" />
                  Tambah Ruangan
                </Button>
              )}
            </CardHeader>

            <CardContent className="p-0">
              {ruanganList.length === 0 ? (
                <div className="p-10 text-center">
                  <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-2">
                    <DoorOpen className="w-5 h-5" />
                  </div>
                  <h4 className="text-sm font-semibold text-slate-800">Belum Ada Ruang Ujian</h4>
                  <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                    Tambahkan ruang ujian terlebih dahulu agar dapat mengalokasikan kursi dan ruangan santri.
                  </p>
                  {!isLocked && (
                    <Button
                      onClick={handleOpenAddRuangan}
                      size="sm"
                      variant="outline"
                      className="mt-3 text-xs border-slate-300"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" /> Tambah Ruang Pertama
                    </Button>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-4 w-12 text-center">No</th>
                        <th className="py-2.5 px-4">Nama Ruangan</th>
                        <th className="py-2.5 px-4 text-center">Kapasitas Kursi</th>
                        <th className="py-2.5 px-4 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {ruanganList.map((r, idx) => (
                        <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 px-4 text-center font-medium text-slate-400">
                            {idx + 1}
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-900">
                            {r.nama}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <Badge variant="secondary" className="font-semibold text-slate-800">
                              {r.kapasitas} Kursi / Santri
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                disabled={isLocked}
                                onClick={() => handleOpenEditRuangan(r)}
                                className="h-7 w-7 p-0 text-slate-600 hover:text-slate-900"
                                title="Edit Ruangan"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                disabled={isLocked}
                                onClick={() => setRuanganDeleteTarget(r)}
                                className="h-7 w-7 p-0 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                                title="Hapus Ruangan"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-50/90 border-t border-slate-200 font-semibold text-slate-900">
                      <tr>
                        <td colSpan={2} className="py-2.5 px-4 text-right">
                          Total Kapasitas Seluruh Ruangan:
                        </td>
                        <td className="py-2.5 px-4 text-center font-bold text-emerald-800">
                          {totalKapasitasRuangan} Santri
                        </td>
                        <td className="py-2.5 px-4"></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ========================================================================= */}
        {/* TAB 2: SESI UJIAN */}
        {/* ========================================================================= */}
        <TabsContent value="sesi" className="w-full mt-4 space-y-4">
          <Card className="border-slate-200 shadow-2xs bg-white">
            <CardHeader className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-700" />
                  Daftar Sesi Waktu Ujian
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-0.5">
                  Atur jadwal hari dan jam sesi evaluasi hasil belajar.
                </CardDescription>
              </div>

              {!isLocked && (
                <Button
                  onClick={handleOpenAddSesi}
                  size="sm"
                  className="bg-emerald-700 hover:bg-emerald-800 text-white font-medium text-xs shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5 mr-1.5" />
                  Tambah Sesi Ujian
                </Button>
              )}
            </CardHeader>

            <CardContent className="p-0">
              {sesiList.length === 0 ? (
                <div className="p-10 text-center">
                  <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-2">
                    <Clock className="w-5 h-5" />
                  </div>
                  <h4 className="text-sm font-semibold text-slate-800">Belum Ada Sesi Ujian</h4>
                  <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                    Tentukan sesi waktu pelaksanaan ujian untuk mengatur jadwal mata pelajaran per marhalah.
                  </p>
                  {!isLocked && (
                    <Button
                      onClick={handleOpenAddSesi}
                      size="sm"
                      variant="outline"
                      className="mt-3 text-xs border-slate-300"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" /> Tambah Sesi Pertama
                    </Button>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-4 w-12 text-center">No</th>
                        <th className="py-2.5 px-4">Tanggal Ujian</th>
                        <th className="py-2.5 px-4 text-center">Waktu Pelaksanaan</th>
                        <th className="py-2.5 px-4 text-center">Durasi</th>
                        <th className="py-2.5 px-4 text-center">Mapel Terjadwal</th>
                        <th className="py-2.5 px-4 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {sesiList.map((s, idx) => {
                        const scheduledCount = jadwalList.filter((j) => j.sesi_id === s.id).length;
                        return (
                          <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-3 px-4 text-center font-medium text-slate-400">
                              {idx + 1}
                            </td>
                            <td className="py-3 px-4 font-semibold text-slate-900">
                              {formatDateIndo(s.tanggal)}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className="font-mono bg-slate-100 px-2.5 py-1 rounded-md text-slate-800 font-semibold text-[11px]">
                                {formatTime(s.jam_mulai)} - {formatTime(s.jam_selesai)} WIB
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center text-slate-600 font-medium">
                              {calculateDuration(s.jam_mulai, s.jam_selesai)}
                            </td>
                            <td className="py-3 px-4 text-center">
                              {scheduledCount > 0 ? (
                                <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-none font-medium">
                                  {scheduledCount} Marhalah Terisi
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-slate-400 border-slate-200">
                                  Kosong
                                </Badge>
                              )}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  disabled={isLocked}
                                  onClick={() => handleOpenEditSesi(s)}
                                  className="h-7 w-7 p-0 text-slate-600 hover:text-slate-900"
                                  title="Edit Sesi"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  disabled={isLocked}
                                  onClick={() => setSesiDeleteTarget(s)}
                                  className="h-7 w-7 p-0 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                                  title="Hapus Sesi"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ========================================================================= */}
        {/* TAB 3: JADWAL MAPEL PER MARHALAH */}
        {/* ========================================================================= */}
        <TabsContent value="jadwal" className="w-full mt-4 space-y-4">
          <Card className="border-slate-200 shadow-2xs bg-white">
            <CardHeader className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-emerald-700" />
                  Jadwal Mata Pelajaran Ujian per Sesi & Marhalah
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-0.5">
                  Petakan mata pelajaran dan kitab yang diujikan pada setiap sesi untuk masing-masing tingkatan marhalah.
                </CardDescription>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setJadwalViewMode("card")}
                    className={`h-7 px-2 text-xs font-semibold rounded-md ${
                      jadwalViewMode === "card"
                        ? "bg-white text-slate-900 shadow-2xs"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <ListFilter className="w-3.5 h-3.5 mr-1" />
                    Per Sesi
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setJadwalViewMode("matrix")}
                    className={`h-7 px-2 text-xs font-semibold rounded-md ${
                      jadwalViewMode === "matrix"
                        ? "bg-white text-slate-900 shadow-2xs"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <LayoutGrid className="w-3.5 h-3.5 mr-1" />
                    Matriks Jadwal
                  </Button>
                </div>

                {!isLocked && sesiList.length > 0 && (
                  <Button
                    onClick={() => handleOpenAddJadwal()}
                    size="sm"
                    className="bg-emerald-700 hover:bg-emerald-800 text-white font-medium text-xs shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1.5" />
                    Jadwalkan Mapel
                  </Button>
                )}
              </div>
            </CardHeader>

            <CardContent className="p-4 sm:p-5">
              {sesiList.length === 0 ? (
                <div className="p-10 text-center">
                  <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-2">
                    <Clock className="w-5 h-5" />
                  </div>
                  <h4 className="text-sm font-semibold text-slate-800">Sesi Ujian Belum Dibuat</h4>
                  <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                    Buat sesi waktu ujian terlebih dahulu pada tab &ldquo;2. Sesi Ujian&rdquo; sebelum memetakan mata pelajaran.
                  </p>
                  <Button
                    onClick={() => setActiveTab("sesi")}
                    size="sm"
                    variant="outline"
                    className="mt-3 text-xs border-slate-300"
                  >
                    Buka Tab Sesi Ujian
                  </Button>
                </div>
              ) : jadwalViewMode === "card" ? (
                <div className="space-y-4">
                  {sesiList.map((sesi, sIdx) => {
                    const sesiJadwal = jadwalList.filter((j) => j.sesi_id === sesi.id);
                    return (
                      <div
                        key={sesi.id}
                        className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-2xs"
                      >
                        <div className="bg-slate-50/80 p-3.5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-emerald-700 text-white text-[11px] font-bold flex items-center justify-center shrink-0">
                              {sIdx + 1}
                            </span>
                            <div>
                              <h4 className="font-bold text-slate-900 text-xs sm:text-sm">
                                {formatDateIndo(sesi.tanggal)} · {formatTime(sesi.jam_mulai)} - {formatTime(sesi.jam_selesai)} WIB
                              </h4>
                              <p className="text-[11px] text-muted-foreground">
                                Durasi {calculateDuration(sesi.jam_mulai, sesi.jam_selesai)} · {sesiJadwal.length} dari {marhalahList.length} Marhalah terjadwal
                              </p>
                            </div>
                          </div>

                          {!isLocked && (
                            <Button
                              onClick={() => handleOpenAddJadwal(sesi.id)}
                              size="sm"
                              variant="outline"
                              className="text-xs h-7 border-slate-300 hover:border-emerald-600 hover:text-emerald-700"
                            >
                              <Plus className="w-3 h-3 mr-1" /> Tambah Marhalah ke Sesi Ini
                            </Button>
                          )}
                        </div>

                        {sesiJadwal.length === 0 ? (
                          <div className="p-6 text-center text-xs text-muted-foreground bg-slate-50/30">
                            Belum ada mata pelajaran yang dijadwalkan pada sesi ini.
                          </div>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs text-left">
                              <thead className="bg-slate-50/50 text-slate-500 font-semibold border-b border-slate-100">
                                <tr>
                                  <th className="py-2 px-4 w-44">Tingkat Marhalah</th>
                                  <th className="py-2 px-4">Mata Pelajaran</th>
                                  <th className="py-2 px-4">Kitab Pengantar</th>
                                  <th className="py-2 px-4 text-center w-28">Tipe Nilai</th>
                                  <th className="py-2 px-4 text-right w-16">Aksi</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 text-slate-700">
                                {sesiJadwal.map((j) => (
                                  <tr key={j.id} className="hover:bg-slate-50/50">
                                    <td className="py-2.5 px-4 font-semibold text-slate-900">
                                      <Badge variant="outline" className="border-slate-300 bg-white font-semibold">
                                        {j.marhalah?.nama || "-"}
                                      </Badge>
                                    </td>
                                    <td className="py-2.5 px-4 font-bold text-slate-900">
                                      {j.marhalah_mapel?.mapel?.nama || "-"}
                                    </td>
                                    <td className="py-2.5 px-4 text-slate-600 italic">
                                      {j.marhalah_mapel?.kitab?.nama || "-"}
                                    </td>
                                    <td className="py-2.5 px-4 text-center">
                                      {j.marhalah_mapel?.tipe === "nilai" ? (
                                        <Badge className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-medium">
                                          Angka
                                        </Badge>
                                      ) : (
                                        <Badge variant="outline" className="text-slate-600 text-[10px]">
                                          Kelengkapan
                                        </Badge>
                                      )}
                                    </td>
                                    <td className="py-2.5 px-4 text-right">
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        disabled={isLocked}
                                        onClick={() => setJadwalDeleteTarget(j)}
                                        className="h-6 w-6 p-0 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                                        title="Hapus Jadwal"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </Button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-2xs">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-4 w-40 sticky left-0 bg-slate-50 border-r border-slate-200 z-10">
                          Sesi & Jam Ujian
                        </th>
                        {marhalahList.map((m) => (
                          <th key={m.id} className="py-3 px-4 min-w-[170px] text-center border-r border-slate-200 last:border-r-0">
                            {m.nama}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {sesiList.map((sesi, idx) => (
                        <tr key={sesi.id} className="hover:bg-slate-50/50">
                          <td className="py-3 px-4 sticky left-0 bg-white border-r border-slate-200 z-10 font-medium">
                            <div className="font-bold text-slate-900">Sesi {idx + 1}</div>
                            <div className="text-[11px] text-muted-foreground">{formatDateIndo(sesi.tanggal)}</div>
                            <div className="text-[10px] font-mono text-emerald-800 font-semibold mt-0.5">
                              {formatTime(sesi.jam_mulai)} - {formatTime(sesi.jam_selesai)}
                            </div>
                          </td>

                          {marhalahList.map((marhalah) => {
                            const entry = jadwalList.find(
                              (j) => j.sesi_id === sesi.id && j.marhalah_id === marhalah.id
                            );

                            return (
                              <td
                                key={marhalah.id}
                                className="py-2.5 px-3 text-center align-middle border-r border-slate-200 last:border-r-0"
                              >
                                {entry ? (
                                  <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-left relative group">
                                    <div className="font-bold text-emerald-950 text-xs">
                                      {entry.marhalah_mapel?.mapel?.nama || "-"}
                                    </div>
                                    <div className="text-[11px] text-emerald-800 italic truncate">
                                      {entry.marhalah_mapel?.kitab?.nama || "-"}
                                    </div>
                                    {!isLocked && (
                                      <button
                                        type="button"
                                        onClick={() => setJadwalDeleteTarget(entry)}
                                        className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity p-1 text-rose-600 hover:text-rose-800"
                                        title="Hapus dari Sesi Ini"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    )}
                                  </div>
                                ) : (
                                  !isLocked && (
                                    <button
                                      type="button"
                                      onClick={() => handleOpenAddJadwal(sesi.id, marhalah.id)}
                                      className="w-full py-2 px-2 rounded-lg border border-dashed border-slate-300 hover:border-emerald-600 hover:bg-emerald-50/50 text-[11px] text-slate-400 hover:text-emerald-700 transition-colors flex items-center justify-center gap-1"
                                    >
                                      <Plus className="w-3 h-3" /> Tambah
                                    </button>
                                  )
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ========================================================================= */}
        {/* TAB 4: PESERTA & PENEMPATAN RUANGAN (STEP 22) */}
        {/* ========================================================================= */}
        <TabsContent value="peserta" className="w-full mt-4 space-y-4">
          <Card className="border-slate-200 shadow-2xs bg-white">
            <CardHeader className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-700" />
                  Alokasi Peserta & Penempatan Ruang Ujian
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-0.5">
                  Generate nomor peserta ujian secara stabil dan atur penempatan ruangan santri (otomatis atau geser manual via combobox).
                </CardDescription>
              </div>

              {/* Action Buttons Toolbar */}
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  onClick={() => setFormatDialogOpen(true)}
                  size="sm"
                  variant="outline"
                  className="text-xs h-8 border-slate-300 text-slate-700"
                  disabled={isLocked}
                >
                  <Settings2 className="w-3.5 h-3.5 mr-1 text-slate-500" />
                  Format No: <span className="font-mono ml-1 text-emerald-800 font-semibold">{previewNoPeserta}</span>
                </Button>

                {!isLocked && (
                  <>
                    <Button
                      onClick={handleSyncSantri}
                      disabled={syncing}
                      size="sm"
                      variant="outline"
                      className="text-xs h-8 border-slate-300 text-slate-700 hover:text-emerald-800"
                      title="Sinkronkan santri baru tanpa mengubah nomor peserta yang sudah ada"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 mr-1 ${syncing ? "animate-spin" : ""}`} />
                      Sinkronkan Santri Baru
                    </Button>

                    <Button
                      onClick={() => setRegenerateAlertOpen(true)}
                      size="sm"
                      variant="outline"
                      className="text-xs h-8 border-amber-300 text-amber-900 bg-amber-50 hover:bg-amber-100"
                    >
                      <RefreshCw className="w-3.5 h-3.5 mr-1 text-amber-700" />
                      Generate Ulang
                    </Button>

                    <Button
                      onClick={() => setAlokasiDialogOpen(true)}
                      size="sm"
                      className="bg-emerald-700 hover:bg-emerald-800 text-white font-medium text-xs h-8 shadow-xs"
                    >
                      <Shuffle className="w-3.5 h-3.5 mr-1" />
                      Alokasi Ruangan Otomatis
                    </Button>
                  </>
                )}
              </div>
            </CardHeader>

            <CardContent className="p-4 sm:p-5 space-y-4">
              {/* Ruangan Occupancy Badges */}
              <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                    <DoorOpen className="w-3.5 h-3.5 text-emerald-700" />
                    Keterisian Ruang Ujian:
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    Total Kapasitas: <strong>{totalKapasitasRuangan} Kursi</strong> · Santri Terdaftar: <strong>{pesertaList.length} Santri</strong>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
                  {ruanganList.map((r) => {
                    const countInRoom = pesertaList.filter((p) => p.ruangan_id === r.id).length;
                    const isFull = countInRoom >= r.kapasitas;
                    const isOver = countInRoom > r.kapasitas;
                    return (
                      <div
                        key={r.id}
                        className={`p-2 rounded-lg border text-center ${
                          isOver
                            ? "bg-rose-50 border-rose-300 text-rose-900"
                            : isFull
                            ? "bg-amber-50 border-amber-300 text-amber-900"
                            : "bg-white border-slate-200 text-slate-800"
                        }`}
                      >
                        <div className="font-bold text-xs truncate">{r.nama}</div>
                        <div className="text-[11px] font-mono mt-0.5">
                          {countInRoom} / {r.kapasitas} kursi
                        </div>
                      </div>
                    );
                  })}

                  <div
                    className={`p-2 rounded-lg border text-center ${
                      totalPesertaBelumRuangan > 0
                        ? "bg-amber-50/70 border-amber-300 text-amber-900"
                        : "bg-white border-slate-200 text-slate-600"
                    }`}
                  >
                    <div className="font-bold text-xs truncate">Tanpa Ruangan</div>
                    <div className="text-[11px] font-mono mt-0.5">
                      {totalPesertaBelumRuangan} santri
                    </div>
                  </div>
                </div>
              </div>

              {/* Filter & Search Bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
                <div className="relative flex-1 sm:max-w-xs">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                  <Input
                    placeholder="Cari nama, NIS, atau no peserta..."
                    value={pesertaSearch}
                    onChange={(e) => setPesertaSearch(e.target.value)}
                    className="pl-8 h-8 text-xs bg-white"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5">
                    <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <Select value={filterMarhalah} onValueChange={setFilterMarhalah}>
                      <SelectTrigger className="h-8 text-xs w-[150px] bg-white">
                        <SelectValue placeholder="Semua Marhalah" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all" className="text-xs">
                          Semua Marhalah
                        </SelectItem>
                        {marhalahList.map((m) => (
                          <SelectItem key={m.id} value={m.id} className="text-xs">
                            {m.nama}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Select value={filterRuangan} onValueChange={setFilterRuangan}>
                    <SelectTrigger className="h-8 text-xs w-[160px] bg-white">
                      <SelectValue placeholder="Semua Ruangan" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="text-xs">
                        Semua Ruangan
                      </SelectItem>
                      <SelectItem value="_unassigned" className="text-xs text-amber-800">
                        Belum Ada Ruangan
                      </SelectItem>
                      {ruanganList.map((r) => (
                        <SelectItem key={r.id} value={r.id} className="text-xs">
                          {r.nama}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Tabel Peserta */}
              {pesertaList.length === 0 ? (
                <div className="p-10 text-center rounded-xl border border-dashed border-slate-300">
                  <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-2">
                    <Users className="w-5 h-5" />
                  </div>
                  <h4 className="text-sm font-semibold text-slate-800">Nomor Peserta Belum Dibuat</h4>
                  <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                    Terdapat {totalActiveEnrollments} santri aktif pada tahun ajaran ini. Klik tombol di bawah untuk membuat nomor peserta ujian dalam satu transaksi.
                  </p>
                  {!isLocked && (
                    <Button
                      onClick={handleSyncSantri}
                      disabled={syncing}
                      size="sm"
                      className="mt-4 bg-emerald-700 hover:bg-emerald-800 text-white font-medium text-xs shadow-xs"
                    >
                      <UserCheck className="w-3.5 h-3.5 mr-1.5" />
                      Generate Nomor Peserta ({totalActiveEnrollments} Santri)
                    </Button>
                  )}
                </div>
              ) : filteredPeserta.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  Tidak ada peserta yang cocok dengan kriteria pencarian atau filter.
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-2xs">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3 w-10 text-center">No</th>
                        <th className="py-2.5 px-3">No. Peserta</th>
                        <th className="py-2.5 px-3">Nama Santri</th>
                        <th className="py-2.5 px-3">Marhalah</th>
                        <th className="py-2.5 px-3 min-w-[180px]">Ruangan Ujian (Geser Manual)</th>
                        <th className="py-2.5 px-3 text-center w-24">No. Meja</th>
                        <th className="py-2.5 px-3 text-center w-36">Status</th>
                        <th className="py-2.5 px-3 text-center w-16">Kartu</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {filteredPeserta.map((p, idx) => (
                        <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-2.5 px-3 text-center text-slate-400 font-medium">
                            {idx + 1}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                              {p.no_peserta}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-slate-900">
                            <div>{p.santriNama}</div>
                            {p.santriNis && (
                              <div className="text-[10px] text-muted-foreground font-mono">NIS: {p.santriNis}</div>
                            )}
                          </td>
                          <td className="py-2.5 px-3">
                            <Badge variant="outline" className="border-slate-300 bg-white font-medium">
                              {p.marhalahNama}
                            </Badge>
                          </td>
                          {/* Combobox Geser Manual Ruangan */}
                          <td className="py-2.5 px-3">
                            <Select
                              value={p.ruangan_id || "_none"}
                              disabled={isLocked || movingPesertaId === p.id}
                              onValueChange={(val) =>
                                handleManualRoomChange(p.id, val === "_none" ? null : val)
                              }
                            >
                              <SelectTrigger className="h-7 text-xs bg-white border-slate-300 w-full min-w-[150px]">
                                <SelectValue placeholder="Pilih Ruang" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="_none" className="text-xs text-amber-700 italic font-medium">
                                  Belum Ditentukan
                                </SelectItem>
                                {ruanganList.map((r) => {
                                  const countInRoom = pesertaList.filter((x) => x.ruangan_id === r.id).length;
                                  return (
                                    <SelectItem key={r.id} value={r.id} className="text-xs">
                                      {r.nama} ({countInRoom}/{r.kapasitas})
                                    </SelectItem>
                                  );
                                })}
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-900">
                            {p.no_urut ? `Meja ${p.no_urut}` : "-"}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {p.ruangan_id ? (
                              <Badge className="bg-emerald-50 text-emerald-800 border-emerald-200 border text-[10px] font-medium gap-1">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                {p.ruanganNama} #{p.no_urut}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-800 text-[10px] font-medium">
                                Belum Dapat Meja
                              </Badge>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50"
                              title="Cetak Kartu Ujian Santri"
                              onClick={() => {
                                setPreviewPdfTitle(`Kartu Ujian EHB - ${p.santriNama}`);
                                setPreviewPdfUrl(`/api/ehb/kartu-peserta?ehbId=${ehb.id}&pesertaId=${p.id}`);
                              }}
                            >
                              <CreditCard className="w-3.5 h-3.5" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ========================================================================= */}
        {/* TAB 5: CETAK DOKUMEN & BERKAS EHB (STEP 23 & 24) */}
        {/* ========================================================================= */}
        <TabsContent value="dokumen" className="w-full mt-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Card 1: Daftar Hadir Peserta */}
            <Card className="border-slate-200 shadow-2xs bg-white flex flex-col justify-between">
              <CardHeader className="p-5">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center mb-3">
                  <FileText className="w-5 h-5" />
                </div>
                <CardTitle className="text-base font-bold text-slate-900">
                  Daftar Hadir Peserta EHB
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Cetak lembar presensi resmi bertanda tangan santri per ruangan. Tersedia dalam dua pilihan format tata letak:
                </CardDescription>

                <div className="mt-3 space-y-2 text-xs text-slate-700">
                  <div className="flex items-start gap-2 p-2 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="font-bold text-emerald-800 text-[11px] shrink-0">1. Per Sesi (Portrait):</span>
                    <span className="text-[11px] text-muted-foreground">
                      Format standar A4 tegak per sesi ujian untuk satu ruangan atau seluruh ruangan.
                    </span>
                  </div>
                  <div className="flex items-start gap-2 p-2 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="font-bold text-emerald-800 text-[11px] shrink-0">2. Semua Sesi (Landscape):</span>
                    <span className="text-[11px] text-muted-foreground">
                      Format rekap A4 mendatar seluruh sesi (dipecah per 6 sesi bila lebih dengan pengulangan kolom identitas santri).
                    </span>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-5 pt-0">
                <Button
                  onClick={() => setDaftarHadirDialogOpen(true)}
                  className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-medium text-xs h-9 shadow-xs"
                >
                  <FileText className="w-3.5 h-3.5 mr-1.5" />
                  Atur & Cetak Daftar Hadir
                </Button>
              </CardContent>
            </Card>

            {/* Card 2: Berita Acara Ujian */}
            <Card className="border-slate-200 shadow-2xs bg-white flex flex-col justify-between">
              <CardHeader className="p-5">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-800 flex items-center justify-center mb-3">
                  <FileCheck className="w-5 h-5" />
                </div>
                <CardTitle className="text-base font-bold text-slate-900">
                  Berita Acara Pelaksanaan EHB
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Cetak dokumen Berita Acara resmi per ruangan per sesi ujian sebagai laporan pertanggungjawaban jalannya evaluasi hasil belajar santri:
                </CardDescription>

                <div className="mt-3 space-y-2 text-xs text-slate-700">
                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-muted-foreground space-y-1">
                    <div>• Hari, tanggal, waktu, sesi, dan ruang ujian pelaksanaan</div>
                    <div>• Rincian mata pelajaran & kitab yang diujikan</div>
                    <div>• Rekapitulasi peserta (seharusnya, hadir, tidak hadir)</div>
                    <div>• Kolom catatan kejadian khusus selama ujian</div>
                    <div>• Kolom tanda tangan resmi Pengawas Ruang I dan II</div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-5 pt-0">
                <Button
                  onClick={() => setBeritaAcaraDialogOpen(true)}
                  className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-medium text-xs h-9 shadow-xs"
                >
                  <FileCheck className="w-3.5 h-3.5 mr-1.5" />
                  Atur & Cetak Berita Acara
                </Button>
              </CardContent>
            </Card>

            {/* Card 3: Kartu Peserta Ujian (Step 24) */}
            <Card className="border-slate-200 shadow-2xs bg-white flex flex-col justify-between">
              <CardHeader className="p-5">
                <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-800 flex items-center justify-center mb-3">
                  <CreditCard className="w-5 h-5" />
                </div>
                <CardTitle className="text-base font-bold text-slate-900">
                  Kartu Peserta Ujian (EHB)
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Cetak kartu ujian santri format A4 portrait (2 kartu per lembar dipisahkan garis potong tengah):
                </CardDescription>

                <div className="mt-3 space-y-2 text-xs text-slate-700">
                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-muted-foreground space-y-1">
                    <div>• Kop resmi & identitas lengkap santri (Nama, NIS, Marhalah)</div>
                    <div>• Nomor peserta unik & nama ruang ujian teralokasi</div>
                    <div>• Kotak pasfoto santri ukuran 3x4</div>
                    <div>• Tabel jadwal lengkap mata pelajaran & kolom paraf</div>
                    <div>• Catatan tata tertib & tanda tangan santri dan Panitia</div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-5 pt-0">
                <Button
                  onClick={() => setKartuDialogOpen(true)}
                  className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-medium text-xs h-9 shadow-xs"
                >
                  <CreditCard className="w-3.5 h-3.5 mr-1.5" />
                  Atur & Cetak Kartu Ujian
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* ========================================================================= */}
      {/* DIALOG 1: RUANGAN (TAMBAH / EDIT) */}
      {/* ========================================================================= */}
      <Dialog open={ruanganDialogOpen} onOpenChange={setRuanganDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              {editingRuangan ? "Edit Ruang Ujian" : "Tambah Ruang Ujian Baru"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Masukkan nama ruangan dan kapasitas kursi maksimal untuk santri.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveRuangan} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Nama Ruangan</Label>
              <Input
                placeholder="Misal: Ruang 01, Kelas Awal, Aula Timur"
                value={ruanganNama}
                onChange={(e) => setRuanganNama(e.target.value)}
                className="h-9 text-xs"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Kapasitas Maksimal Kursi</Label>
              <Input
                type="number"
                min={1}
                value={ruanganKapasitas}
                onChange={(e) => setRuanganKapasitas(Number(e.target.value))}
                className="h-9 text-xs"
                required
              />
              <p className="text-[11px] text-muted-foreground">
                Jumlah santri maksimal yang dapat dialokasikan pada ruangan ini saat EHB.
              </p>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setRuanganDialogOpen(false)}
                disabled={ruanganSaving}
                className="text-xs"
              >
                Batal
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={ruanganSaving}
                className="bg-emerald-700 hover:bg-emerald-800 text-white font-medium text-xs shadow-xs"
              >
                {ruanganSaving ? "Menyimpan..." : "Simpan Ruangan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ALERT DIALOG: HAPUS RUANGAN */}
      <AlertDialog open={!!ruanganDeleteTarget} onOpenChange={(open) => !open && setRuanganDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold text-slate-900">
              Hapus Ruang Ujian?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground">
              Anda yakin ingin menghapus ruangan <strong>&ldquo;{ruanganDeleteTarget?.nama}&rdquo;</strong>?
              Data alokasi peserta atau pengawas pada ruangan ini akan ikut terhapus.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={ruanganDeleting} className="text-xs">
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteRuangan}
              disabled={ruanganDeleting}
              className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-medium"
            >
              {ruanganDeleting ? "Menghapus..." : "Ya, Hapus Ruangan"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ========================================================================= */}
      {/* DIALOG 2: SESI UJIAN (TAMBAH / EDIT) */}
      {/* ========================================================================= */}
      <Dialog open={sesiDialogOpen} onOpenChange={setSesiDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              {editingSesi ? "Edit Sesi Ujian" : "Tambah Sesi Ujian Baru"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Tentukan tanggal pelaksanaan dan rentang waktu (jam mulai dan jam selesai).
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveSesi} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Tanggal Pelaksanaan</Label>
              <Input
                type="date"
                min={ehb.tanggal_mulai}
                max={ehb.tanggal_selesai}
                value={sesiTanggal}
                onChange={(e) => setSesiTanggal(e.target.value)}
                className="h-9 text-xs"
                required
              />
              <p className="text-[11px] text-muted-foreground">
                Dalam rentang: {ehb.tanggal_mulai} s/d {ehb.tanggal_selesai}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Jam Mulai (WIB)</Label>
                <Input
                  type="time"
                  value={sesiJamMulai}
                  onChange={(e) => setSesiJamMulai(e.target.value)}
                  className="h-9 text-xs"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Jam Selesai (WIB)</Label>
                <Input
                  type="time"
                  value={sesiJamSelesai}
                  onChange={(e) => setSesiJamSelesai(e.target.value)}
                  className="h-9 text-xs"
                  required
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSesiDialogOpen(false)}
                disabled={sesiSaving}
                className="text-xs"
              >
                Batal
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={sesiSaving}
                className="bg-emerald-700 hover:bg-emerald-800 text-white font-medium text-xs shadow-xs"
              >
                {sesiSaving ? "Menyimpan..." : "Simpan Sesi"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ALERT DIALOG: HAPUS SESI */}
      <AlertDialog open={!!sesiDeleteTarget} onOpenChange={(open) => !open && setSesiDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold text-slate-900">
              Hapus Sesi Ujian?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground">
              Menghapus sesi tanggal <strong>{sesiDeleteTarget ? formatDateIndo(sesiDeleteTarget.tanggal) : ""}</strong> ({sesiDeleteTarget ? `${formatTime(sesiDeleteTarget.jam_mulai)} - ${formatTime(sesiDeleteTarget.jam_selesai)}` : ""}) juga akan menghapus seluruh jadwal mata pelajaran pada sesi ini. Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={sesiDeleting} className="text-xs">
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSesi}
              disabled={sesiDeleting}
              className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-medium"
            >
              {sesiDeleting ? "Menghapus..." : "Ya, Hapus Sesi"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ========================================================================= */}
      {/* DIALOG 3: JADWAL MAPEL (TAMBAH JADWAL) */}
      {/* ========================================================================= */}
      <Dialog open={jadwalDialogOpen} onOpenChange={setJadwalDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              Jadwalkan Mata Pelajaran Ujian
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Pilih sesi, tingkat marhalah, dan mata pelajaran yang akan diujikan.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveJadwal} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Sesi Waktu Ujian</Label>
              <Select value={jadwalSesiId} onValueChange={setJadwalSesiId}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Pilih Sesi Ujian" />
                </SelectTrigger>
                <SelectContent>
                  {sesiList.map((s, idx) => (
                    <SelectItem key={s.id} value={s.id} className="text-xs">
                      Sesi {idx + 1}: {formatDateIndo(s.tanggal)} ({formatTime(s.jam_mulai)} - {formatTime(s.jam_selesai)} WIB)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Tingkat Marhalah</Label>
              <Select
                value={jadwalMarhalahId}
                onValueChange={(val) => {
                  setJadwalMarhalahId(val);
                  const mapels = marhalahMapelList.filter((m) => m.marhalah_id === val);
                  setJadwalMapelId(mapels[0]?.id ?? "");
                }}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Pilih Marhalah" />
                </SelectTrigger>
                <SelectContent>
                  {marhalahList.map((m) => (
                    <SelectItem key={m.id} value={m.id} className="text-xs">
                      {m.nama}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Mata Pelajaran & Kitab</Label>
              <Select value={jadwalMapelId} onValueChange={setJadwalMapelId}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Pilih Mata Pelajaran" />
                </SelectTrigger>
                <SelectContent>
                  {availableMapel.length === 0 ? (
                    <SelectItem value="_empty" disabled className="text-xs text-muted-foreground">
                      Tidak ada mapel untuk marhalah ini pada semester bersangkutan
                    </SelectItem>
                  ) : (
                    availableMapel.map((m) => (
                      <SelectItem key={m.id} value={m.id} className="text-xs">
                        {m.mapelNama} {m.kitabNama ? `(Kitab: ${m.kitabNama})` : ""}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">
                Hanya menampilkan kurikulum mapel pada semester aktif EHB.
              </p>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setJadwalDialogOpen(false)}
                disabled={jadwalSaving}
                className="text-xs"
              >
                Batal
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={jadwalSaving || !jadwalMapelId}
                className="bg-emerald-700 hover:bg-emerald-800 text-white font-medium text-xs shadow-xs"
              >
                {jadwalSaving ? "Menyimpan..." : "Simpan Jadwal"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ALERT DIALOG: HAPUS JADWAL */}
      <AlertDialog open={!!jadwalDeleteTarget} onOpenChange={(open) => !open && setJadwalDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold text-slate-900">
              Hapus Mata Pelajaran dari Sesi Ini?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground">
              Anda yakin ingin menghapus jadwal ujian{" "}
              <strong>&ldquo;{jadwalDeleteTarget?.marhalah_mapel?.mapel?.nama}&rdquo;</strong>{" "}
              untuk marhalah <strong>&ldquo;{jadwalDeleteTarget?.marhalah?.nama}&rdquo;</strong> pada sesi tersebut?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={jadwalDeleting} className="text-xs">
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteJadwal}
              disabled={jadwalDeleting}
              className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-medium"
            >
              {jadwalDeleting ? "Menghapus..." : "Ya, Hapus Jadwal"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ========================================================================= */}
      {/* DIALOG 4: KONFIGURASI FORMAT NOMOR PESERTA (STEP 22) */}
      {/* ========================================================================= */}
      <Dialog open={formatDialogOpen} onOpenChange={setFormatDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-emerald-700" />
              Konfigurasi Format Nomor Peserta
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Atur format pola penomoran peserta ujian. Format tersimpan sebagai konfigurasi basis data dan bukan di-hardcode.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveFormat} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Pola Format Nomor</Label>
              <Input
                value={formatInput}
                onChange={(e) => setFormatInput(e.target.value)}
                placeholder="{kode TA}-{kode marhalah}-{urut 3 digit}"
                className="h-9 font-mono text-xs"
                required
              />
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2 text-xs">
              <div className="text-[11px] font-semibold text-slate-700">Pratinjau Hasil Penomoran:</div>
              <div className="font-mono text-sm font-bold text-emerald-800 bg-white p-2 rounded border border-emerald-200 text-center">
                {previewNoPeserta}
              </div>
              <div className="text-[11px] text-muted-foreground space-y-1 pt-1 border-t border-slate-200">
                <div><code className="text-slate-800 font-bold">&#123;kode TA&#125;</code>: Kode Tahun Ajaran (contoh: 2526)</div>
                <div><code className="text-slate-800 font-bold">&#123;kode marhalah&#125;</code>: Kode Marhalah (contoh: 01, 1A)</div>
                <div><code className="text-slate-800 font-bold">&#123;urut 3 digit&#125;</code>: Nomor urut alfabetis 3 digit (contoh: 001)</div>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setFormatDialogOpen(false)}
                disabled={formatSaving}
                className="text-xs"
              >
                Batal
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={formatSaving}
                className="bg-emerald-700 hover:bg-emerald-800 text-white font-medium text-xs shadow-xs"
              >
                {formatSaving ? "Menyimpan..." : "Simpan Format"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* ALERT DIALOG: GENERATE ULANG NOMOR PESERTA (STEP 22) */}
      {/* ========================================================================= */}
      <AlertDialog open={regenerateAlertOpen} onOpenChange={setRegenerateAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold text-amber-950 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              Generate Ulang Seluruh Nomor Peserta?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-slate-600 space-y-2">
              <p>
                Tindakan ini akan <strong>menghapus nomor peserta lama</strong> dan mengurutkan ulang seluruh santri aktif secara alfabetis per marhalah dari nomor urut awal (001).
              </p>
              <p className="text-amber-800 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
                <strong>Perhatian:</strong> Penempatan meja dan ruangan santri yang sudah dilakukan akan direset kembali. Pastikan Anda melakukan generate ulang hanya bila daftar santri telah final.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={regenerating} className="text-xs">
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleForceRegenerate}
              disabled={regenerating}
              className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium"
            >
              {regenerating ? "Memproses..." : "Ya, Generate Ulang Nomor"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ========================================================================= */}
      {/* DIALOG 5: ALOKASI RUANGAN OTOMATIS (STEP 22) */}
      {/* ========================================================================= */}
      <Dialog open={alokasiDialogOpen} onOpenChange={setAlokasiDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Shuffle className="w-4 h-4 text-emerald-700" />
              Alokasi Penempatan Ruangan Otomatis
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Pilih mode alokasi santri ke ruang ujian sesuai kapasitas kursi masing-masing ruangan.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Pilih Mode Penempatan:</Label>
              <div className="grid grid-cols-1 gap-2.5">
                <div
                  onClick={() => setAlokasiMode("per_marhalah")}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    alokasiMode === "per_marhalah"
                      ? "border-emerald-600 bg-emerald-50/60 ring-1 ring-emerald-600"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-900">1. Mode Berkelompok per Marhalah</span>
                    {alokasiMode === "per_marhalah" && (
                      <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Santri dari marhalah yang sama ditempatkan berurutan di ruangan yang sama hingga kapasitas ruangan penuh.
                  </p>
                </div>

                <div
                  onClick={() => setAlokasiMode("campur")}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    alokasiMode === "campur"
                      ? "border-emerald-600 bg-emerald-50/60 ring-1 ring-emerald-600"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-900">2. Mode Campur Antar Marhalah (Selang-Seling)</span>
                    {alokasiMode === "campur" && (
                      <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Santri antar marhalah ditempatkan bergantian/selang-seling di setiap ruangan untuk menjaga ketertiban dan mencegah kecurangan.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
              <div className="flex justify-between text-slate-600">
                <span>Total Santri Terdaftar:</span>
                <span className="font-bold text-slate-900">{pesertaList.length} Santri</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Daya Tampung Ruangan:</span>
                <span className="font-bold text-emerald-800">{totalKapasitasRuangan} Kursi</span>
              </div>
              {totalKapasitasRuangan < pesertaList.length && (
                <div className="text-[11px] text-rose-600 font-semibold pt-1 border-t border-slate-200">
                  Perhatian: Kapasitas ruangan ({totalKapasitasRuangan}) kurang dari jumlah santri ({pesertaList.length}). {pesertaList.length - totalKapasitasRuangan} santri tidak akan mendapatkan ruangan.
                </div>
              )}
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setAlokasiDialogOpen(false)}
                disabled={alokasiSaving}
                className="text-xs"
              >
                Batal
              </Button>
              <Button
                type="button"
                onClick={handleExecuteAlokasi}
                size="sm"
                disabled={alokasiSaving}
                className="bg-emerald-700 hover:bg-emerald-800 text-white font-medium text-xs shadow-xs"
              >
                {alokasiSaving ? "Memproses..." : "Jalankan Penempatan"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* DIALOG 6: CETAK DAFTAR HADIR (STEP 23) */}
      {/* ========================================================================= */}
      <Dialog open={daftarHadirDialogOpen} onOpenChange={setDaftarHadirDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-700" />
              Cetak Daftar Hadir Peserta EHB
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Pilih cakupan format presensi, sesi waktu ujian, dan ruangan yang akan dicetak.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {/* Pilihan Cakupan */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Cakupan Tata Letak Dokumen</Label>
              <Select value={dhCakupan} onValueChange={(v: "per_sesi" | "semua_sesi") => setDhCakupan(v)}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="per_sesi" className="text-xs">
                    Per Sesi (Portrait A4) - Presensi Sesi Tertentu
                  </SelectItem>
                  <SelectItem value="semua_sesi" className="text-xs">
                    Semua Sesi (Landscape A4) - Rekap Lengkap Tiap Sesi
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">
                {dhCakupan === "semua_sesi"
                  ? "Format mendatar untuk seluruh sesi (otomatis dipecah per 6 sesi dengan kolom identitas santri diulang)."
                  : "Format tegak per sesi ujian dengan tanda tangan bergantian kiri/kanan."}
              </p>
            </div>

            {/* Pilihan Sesi (hanya aktif jika per_sesi) */}
            {dhCakupan === "per_sesi" && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Pilih Sesi Ujian</Label>
                <Select value={dhSesiId} onValueChange={setDhSesiId}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-xs">
                      Semua Sesi Ujian ({sesiList.length} Sesi)
                    </SelectItem>
                    {sesiList.map((s, idx) => (
                      <SelectItem key={s.id} value={s.id} className="text-xs">
                        Sesi {idx + 1}: {formatDateIndo(s.tanggal)} ({formatTime(s.jam_mulai)} - {formatTime(s.jam_selesai)} WIB)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Pilihan Ruangan */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Pilih Ruang Ujian</Label>
              <Select value={dhRuanganId} onValueChange={setDhRuanganId}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">
                    Semua Ruangan ({ruanganList.length} Ruang)
                  </SelectItem>
                  {ruanganList.map((r) => (
                    <SelectItem key={r.id} value={r.id} className="text-xs">
                      {r.nama} (Kapasitas: {r.kapasitas} Kursi)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="pt-2 flex flex-col sm:flex-row gap-2 sm:justify-between">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDaftarHadirDialogOpen(false)}
                className="text-xs"
              >
                Batal
              </Button>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleOpenDhPreview}
                  className="text-xs border-slate-300 text-slate-800 hover:border-emerald-700"
                >
                  Pratinjau PDF
                </Button>
                <Button
                  asChild
                  size="sm"
                  className="bg-emerald-700 hover:bg-emerald-800 text-white font-medium text-xs shadow-xs"
                >
                  <a href={getDaftarHadirUrl()} target="_blank" rel="noreferrer" download>
                    <Download className="w-3.5 h-3.5 mr-1.5" />
                    Unduh PDF
                  </a>
                </Button>
              </div>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* DIALOG 7: CETAK BERITA ACARA (STEP 23) */}
      {/* ========================================================================= */}
      <Dialog open={beritaAcaraDialogOpen} onOpenChange={setBeritaAcaraDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-emerald-700" />
              Cetak Berita Acara Pelaksanaan EHB
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Dokumen resmi Berita Acara per ruangan per sesi memuat rekapitulasi kehadiran, catatan kejadian pengawas, dan tanda tangan.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Pilih Sesi Ujian</Label>
              <Select value={baSesiId} onValueChange={setBaSesiId}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">
                    Semua Sesi Ujian ({sesiList.length} Sesi)
                  </SelectItem>
                  {sesiList.map((s, idx) => (
                    <SelectItem key={s.id} value={s.id} className="text-xs">
                      Sesi {idx + 1}: {formatDateIndo(s.tanggal)} ({formatTime(s.jam_mulai)} - {formatTime(s.jam_selesai)} WIB)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Pilih Ruang Ujian</Label>
              <Select value={baRuanganId} onValueChange={setBaRuanganId}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">
                    Semua Ruangan ({ruanganList.length} Ruang)
                  </SelectItem>
                  {ruanganList.map((r) => (
                    <SelectItem key={r.id} value={r.id} className="text-xs">
                      {r.nama} (Kapasitas: {r.kapasitas} Kursi)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="pt-2 flex flex-col sm:flex-row gap-2 sm:justify-between">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setBeritaAcaraDialogOpen(false)}
                className="text-xs"
              >
                Batal
              </Button>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleOpenBaPreview}
                  className="text-xs border-slate-300 text-slate-800 hover:border-emerald-700"
                >
                  Pratinjau PDF
                </Button>
                <Button
                  asChild
                  size="sm"
                  className="bg-emerald-700 hover:bg-emerald-800 text-white font-medium text-xs shadow-xs"
                >
                  <a href={getBeritaAcaraUrl()} target="_blank" rel="noreferrer" download>
                    <Download className="w-3.5 h-3.5 mr-1.5" />
                    Unduh PDF
                  </a>
                </Button>
              </div>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* DIALOG 8: CETAK KARTU PESERTA EHB (STEP 24) */}
      {/* ========================================================================= */}
      <Dialog open={kartuDialogOpen} onOpenChange={setKartuDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-emerald-700" />
              Cetak Kartu Peserta Ujian (EHB)
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Pilih cakupan santri yang akan dicetak kartu ujiannya. Tiap lembar A4 portrait memuat 2 kartu ujian lengkap dengan jadwal dan tata tertib.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {/* Pilihan Cakupan */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Cakupan Cetak Kartu</Label>
              <Select
                value={kartuScope}
                onValueChange={(v: "semua" | "ruangan" | "marhalah" | "peserta") => setKartuScope(v)}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="semua" className="text-xs">
                    Semua Santri Terdaftar ({pesertaList.length} Santri)
                  </SelectItem>
                  <SelectItem value="ruangan" className="text-xs">
                    Per Ruangan Ujian
                  </SelectItem>
                  <SelectItem value="marhalah" className="text-xs">
                    Per Tingkat / Marhalah
                  </SelectItem>
                  <SelectItem value="peserta" className="text-xs">
                    Per Santri Tertentu
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Pilihan Ruangan jika scope === ruangan */}
            {kartuScope === "ruangan" && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Pilih Ruang Ujian</Label>
                <Select value={kartuRuanganId} onValueChange={setKartuRuanganId}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-xs">
                      Semua Ruangan ({ruanganList.length} Ruang)
                    </SelectItem>
                    {ruanganList.map((r) => (
                      <SelectItem key={r.id} value={r.id} className="text-xs">
                        {r.nama} ({pesertaList.filter((p) => p.ruangan_id === r.id).length} Santri)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Pilihan Marhalah jika scope === marhalah */}
            {kartuScope === "marhalah" && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Pilih Tingkat Marhalah</Label>
                <Select value={kartuMarhalahId} onValueChange={setKartuMarhalahId}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-xs">
                      Semua Marhalah ({marhalahList.length} Marhalah)
                    </SelectItem>
                    {marhalahList.map((m) => (
                      <SelectItem key={m.id} value={m.id} className="text-xs">
                        {m.nama} ({pesertaList.filter((p) => p.marhalahId === m.id).length} Santri)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Pilihan Peserta jika scope === peserta */}
            {kartuScope === "peserta" && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Pilih Santri</Label>
                <Select value={kartuPesertaId} onValueChange={setKartuPesertaId}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Pilih Santri" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {pesertaList.map((p) => (
                      <SelectItem key={p.id} value={p.id} className="text-xs">
                        {p.no_peserta} - {p.santriNama} ({p.marhalahNama})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <DialogFooter className="pt-2 flex flex-col sm:flex-row gap-2 sm:justify-between">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setKartuDialogOpen(false)}
                className="text-xs"
              >
                Batal
              </Button>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleOpenKartuPreview}
                  disabled={kartuScope === "peserta" && kartuPesertaId === "all"}
                  className="text-xs border-slate-300 text-slate-800 hover:border-emerald-700"
                >
                  Pratinjau PDF
                </Button>
                <Button
                  asChild
                  size="sm"
                  disabled={kartuScope === "peserta" && kartuPesertaId === "all"}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white font-medium text-xs shadow-xs"
                >
                  <a href={getKartuUrl()} target="_blank" rel="noreferrer" download>
                    <Download className="w-3.5 h-3.5 mr-1.5" />
                    Unduh PDF
                  </a>
                </Button>
              </div>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* DIALOG 9: PRATINJAU PDF INTERAKTIF (STEP 23 & 24) */}
      {/* ========================================================================= */}
      <Dialog open={!!previewPdfUrl} onOpenChange={(open) => !open && setPreviewPdfUrl(null)}>
        <DialogContent className="max-w-5xl h-[88vh] flex flex-col p-4 bg-white">
          <DialogHeader className="flex flex-row items-center justify-between border-b pb-2">
            <div>
              <DialogTitle className="text-base font-bold text-slate-900">
                {previewPdfTitle}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Pratinjau langsung sebelum dicetak atau diunduh.
              </DialogDescription>
            </div>
            {previewPdfUrl && (
              <div className="flex items-center gap-2 pr-6">
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="text-xs h-8 border-slate-300"
                >
                  <a href={previewPdfUrl} target="_blank" rel="noreferrer">
                    <ExternalLink className="w-3.5 h-3.5 mr-1.5 text-slate-600" />
                    Buka Tab Baru
                  </a>
                </Button>
                <Button
                  asChild
                  size="sm"
                  className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs h-8 shadow-xs"
                >
                  <a href={previewPdfUrl} target="_blank" rel="noreferrer" download>
                    <Download className="w-3.5 h-3.5 mr-1.5" />
                    Unduh PDF
                  </a>
                </Button>
              </div>
            )}
          </DialogHeader>

          <div className="flex-1 w-full bg-slate-100 rounded-lg overflow-hidden mt-2 border border-slate-200">
            {previewPdfUrl && (
              <iframe
                src={previewPdfUrl}
                className="w-full h-full border-0"
                title="Pratinjau PDF"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

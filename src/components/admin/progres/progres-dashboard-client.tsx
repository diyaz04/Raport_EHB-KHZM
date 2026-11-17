"use client";

import * as React from "react";
import Link from "next/link";
import {
  GraduationCapIcon,
  CheckCircle2Icon,
  ClockIcon,
  LockIcon,
  AlertTriangleIcon,
  UserXIcon,
  TableIcon,
  Maximize2Icon,
  EyeIcon,
  LayersIcon,
  FilterIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  type ProgresKelasRecord,
  type DrilldownDataResult,
  getProgresKelasListAction,
  getProgresDrilldownData,
} from "@/app/admin/actions/progres";
import { ProgresDrilldownClient } from "./progres-drilldown-client";

export interface TahunAjaranOption {
  id: string;
  nama: string;
  kode: string;
  aktif: boolean;
}

export interface SemesterOption {
  id: string;
  jenis: "Ganjil" | "Genap";
  aktif: boolean;
  tahun_ajaran_id: string;
}

interface ProgresDashboardClientProps {
  initialData: ProgresKelasRecord[];
  tahunAjaranList: TahunAjaranOption[];
  semesterList: SemesterOption[];
  activeTahunAjaranId?: string | null;
  activeSemesterId?: string | null;
}

export function ProgresDashboardClient({
  initialData,
  tahunAjaranList,
  semesterList,
  activeTahunAjaranId,
  activeSemesterId,
}: ProgresDashboardClientProps) {
  const [selectedTaId, setSelectedTaId] = React.useState<string>(
    activeTahunAjaranId || tahunAjaranList[0]?.id || "all"
  );
  const [selectedSemId, setSelectedSemId] = React.useState<string>(
    activeSemesterId || semesterList[0]?.id || "all"
  );

  const [dataList, setDataList] = React.useState<ProgresKelasRecord[]>(initialData);
  const [isPending, startTransition] = React.useTransition();

  // State untuk Drill-down Modal Dialog
  const [drilldownLoading, setDrilldownLoading] = React.useState(false);
  const [drilldownData, setDrilldownData] = React.useState<DrilldownDataResult | null>(null);
  const [isDrilldownOpen, setIsDrilldownOpen] = React.useState(false);

  // Trigger filter reload
  const handleFilterChange = (taId: string, semId: string) => {
    setSelectedTaId(taId);
    setSelectedSemId(semId);

    startTransition(async () => {
      const records = await getProgresKelasListAction(taId, semId);
      setDataList(records);
    });
  };

  // Open Drilldown Modal
  const handleOpenDrilldown = async (marhalahId: string, semesterId: string) => {
    setIsDrilldownOpen(true);
    setDrilldownLoading(true);
    setDrilldownData(null);

    const result = await getProgresDrilldownData(marhalahId, semesterId);
    setDrilldownData(result);
    setDrilldownLoading(false);
  };

  // Filter semester options based on selected TA
  const availableSemesters = React.useMemo(() => {
    if (selectedTaId === "all") return semesterList;
    return semesterList.filter((s) => s.tahun_ajaran_id === selectedTaId);
  }, [selectedTaId, semesterList]);

  // Status Badge Helper: 'Belum mulai' / 'Proses' / 'Final'
  const renderStatusBadge = (item: ProgresKelasRecord) => {
    if (item.status_raport === "final") {
      return (
        <Badge className="bg-zinc-800 hover:bg-zinc-800 text-white text-xs gap-1 py-0.5 px-2">
          <LockIcon className="h-3 w-3" />
          Final
        </Badge>
      );
    }

    if (item.sel_nilai_terisi === 0 && item.catatan_terisi === 0) {
      return (
        <Badge
          variant="outline"
          className="border-amber-300 bg-amber-50 text-amber-800 text-xs gap-1 py-0.5 px-2 font-medium"
        >
          <ClockIcon className="h-3 w-3 text-amber-600" />
          Belum mulai
        </Badge>
      );
    }

    return (
      <Badge
        variant="outline"
        className="border-blue-300 bg-blue-50 text-blue-900 text-xs gap-1 py-0.5 px-2 font-medium"
      >
        <CheckCircle2Icon className="h-3 w-3 text-blue-600" />
        Proses
      </Badge>
    );
  };

  // Summary Metrics
  const totalKelas = dataList.length;
  const countFinal = dataList.filter((d) => d.status_raport === "final").length;
  const countBelumMulai = dataList.filter(
    (d) => d.status_raport !== "final" && d.sel_nilai_terisi === 0 && d.catatan_terisi === 0
  ).length;
  const countProses = dataList.filter(
    (d) => d.status_raport !== "final" && (d.sel_nilai_terisi > 0 || d.catatan_terisi > 0)
  ).length;

  let totalSemuaSel = 0;
  let totalSemuaTerisi = 0;
  dataList.forEach((d) => {
    totalSemuaSel += d.total_sel_nilai;
    totalSemuaTerisi += d.sel_nilai_terisi;
  });
  const overallPercent =
    totalSemuaSel > 0 ? Math.round((totalSemuaTerisi / totalSemuaSel) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* FILTER BAR */}
      <div className="rounded-lg border border-zinc-200 bg-white p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <FilterIcon className="h-4 w-4 text-primary shrink-0" />
            <div>
              <h3 className="font-bold text-sm text-zinc-900">
                Monitoring Progres Pengisian Nilai & Raport
              </h3>
              <p className="text-xs text-zinc-500">
                Pantau kelengkapan sel nilai dan catatan perwalian per marhalah dari view sistem.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Filter Tahun Ajaran */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-zinc-500 uppercase">
                Tahun Ajaran
              </label>
              <Select
                value={selectedTaId}
                onValueChange={(val) => handleFilterChange(val, selectedSemId)}
              >
                <SelectTrigger className="w-[180px] h-8 text-xs bg-zinc-50">
                  <SelectValue placeholder="Pilih Tahun Ajaran" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Tahun Ajaran</SelectItem>
                  {tahunAjaranList.map((ta) => (
                    <SelectItem key={ta.id} value={ta.id}>
                      {ta.nama} {ta.aktif ? "(Aktif)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filter Semester */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-zinc-500 uppercase">
                Semester
              </label>
              <Select
                value={selectedSemId}
                onValueChange={(val) => handleFilterChange(selectedTaId, val)}
              >
                <SelectTrigger className="w-[160px] h-8 text-xs bg-zinc-50">
                  <SelectValue placeholder="Pilih Semester" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Semester</SelectItem>
                  {availableSemesters.map((sem) => (
                    <SelectItem key={sem.id} value={sem.id}>
                      Semester {sem.jenis} {sem.aktif ? "(Aktif)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {/* METRIC CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="rounded-lg border border-zinc-200 bg-white p-3.5">
          <div className="text-xs text-zinc-500 flex items-center justify-between">
            <span>Total Marhalah</span>
            <LayersIcon className="h-4 w-4 text-zinc-400" />
          </div>
          <div className="text-2xl font-bold text-zinc-900 mt-1">{totalKelas}</div>
          <div className="text-[11px] text-zinc-400 mt-0.5">Jenjang aktif</div>
        </div>

        <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-3.5">
          <div className="text-xs text-amber-800 flex items-center justify-between font-medium">
            <span>Belum Mulai</span>
            <ClockIcon className="h-4 w-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-amber-900 mt-1">{countBelumMulai}</div>
          <div className="text-[11px] text-amber-700 mt-0.5">0 sel terisi</div>
        </div>

        <div className="rounded-lg border border-blue-200 bg-blue-50/60 p-3.5">
          <div className="text-xs text-blue-800 flex items-center justify-between font-medium">
            <span>Sedang Proses</span>
            <CheckCircle2Icon className="h-4 w-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-blue-900 mt-1">{countProses}</div>
          <div className="text-[11px] text-blue-700 mt-0.5">Pengisian berjalan</div>
        </div>

        <div className="rounded-lg border border-zinc-300 bg-zinc-900 text-white p-3.5">
          <div className="text-xs text-zinc-300 flex items-center justify-between">
            <span>Status Final</span>
            <LockIcon className="h-4 w-4 text-zinc-400" />
          </div>
          <div className="text-2xl font-bold mt-1">{countFinal}</div>
          <div className="text-[11px] text-zinc-400 mt-0.5">Terkunci & siap cetak</div>
        </div>

        <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-3.5 col-span-2 sm:col-span-1">
          <div className="text-xs text-emerald-800 flex items-center justify-between font-medium">
            <span>Kelengkapan Total</span>
            <GraduationCapIcon className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-900 mt-1">{overallPercent}%</div>
          <div className="text-[11px] text-emerald-700 mt-0.5">
            {totalSemuaTerisi} / {totalSemuaSel} sel
          </div>
        </div>
      </div>

      {/* TABEL PROGRES KELAS */}
      <div className="rounded-lg border border-zinc-200 bg-white shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-zinc-100 flex items-center justify-between">
          <div>
            <h4 className="font-bold text-sm text-zinc-900">
              Daftar Progres Kelas ({dataList.length})
            </h4>
            <p className="text-xs text-zinc-500">
              Klik &quot;Drill-Down&quot; untuk memeriksa sel kosong nilai santri dan penugasan guru pengampu.
            </p>
          </div>
          {isPending && (
            <span className="text-xs text-zinc-400 animate-pulse">Memuat data...</span>
          )}
        </div>

        <div className="overflow-x-auto">
          <Table className="text-xs">
            <TableHeader className="bg-zinc-50">
              <TableRow>
                <TableHead className="w-12 text-center">No</TableHead>
                <TableHead className="min-w-[160px]">Marhalah (Kelas)</TableHead>
                <TableHead className="min-w-[140px]">Wali Kelas</TableHead>
                <TableHead className="w-24 text-center">Santri</TableHead>
                <TableHead className="w-24 text-center">Mapel</TableHead>
                <TableHead className="min-w-[200px]">Progres Nilai (Sel Terisi)</TableHead>
                <TableHead className="w-28 text-center">Catatan</TableHead>
                <TableHead className="w-28 text-center">Status Raport</TableHead>
                <TableHead className="w-36 text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {dataList.length > 0 ? (
                dataList.map((item, idx) => {
                  const percent =
                    item.total_sel_nilai > 0
                      ? Math.round((item.sel_nilai_terisi / item.total_sel_nilai) * 100)
                      : 0;
                  const hasUnassignedPengampu = item.mapel_tanpa_pengampu_count > 0;

                  return (
                    <TableRow key={`${item.marhalah_id}_${item.semester_id}`} className="hover:bg-zinc-50/70">
                      <TableCell className="text-center font-mono text-zinc-500">
                        {idx + 1}
                      </TableCell>

                      <TableCell>
                        <div className="font-bold text-zinc-900 flex items-center gap-1.5">
                          <span>{item.nama_marhalah}</span>
                          <Badge variant="outline" className="font-mono text-[10px] py-0 px-1">
                            {item.kode_marhalah}
                          </Badge>
                        </div>
                        <div className="text-[11px] text-zinc-400 mt-0.5">
                          Semester {item.semester_jenis} • TA {item.nama_tahun_ajaran}
                        </div>
                        {hasUnassignedPengampu && (
                          <div className="mt-1 flex items-center gap-1 text-[11px] font-medium text-amber-700">
                            <UserXIcon className="h-3 w-3 shrink-0" />
                            <span>{item.mapel_tanpa_pengampu_count} mapel tanpa pengampu</span>
                          </div>
                        )}
                      </TableCell>

                      <TableCell>
                        {item.wali_kelas_nama ? (
                          <div className="font-medium text-zinc-800 flex items-center gap-1">
                            <GraduationCapIcon className="h-3.5 w-3.5 text-primary shrink-0" />
                            <span>{item.wali_kelas_nama}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-amber-700 italic flex items-center gap-1">
                            <AlertTriangleIcon className="h-3 w-3 shrink-0" />
                            Belum ditentukan
                          </span>
                        )}
                      </TableCell>

                      <TableCell className="text-center font-mono">
                        {item.jumlah_santri}
                      </TableCell>

                      <TableCell className="text-center font-mono">
                        {item.total_mapel_nilai}
                      </TableCell>

                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-bold text-zinc-800">{percent}%</span>
                            <span className="text-zinc-500 font-mono">
                              {item.sel_nilai_terisi} / {item.total_sel_nilai}
                            </span>
                          </div>
                          {/* Progress Bar */}
                          <div className="h-2 w-full rounded-full bg-zinc-100 overflow-hidden border border-zinc-200">
                            <div
                              className={`h-full transition-all duration-300 ${
                                percent === 100
                                  ? "bg-emerald-600"
                                  : percent > 50
                                  ? "bg-blue-600"
                                  : percent > 0
                                  ? "bg-amber-500"
                                  : "bg-zinc-200"
                              }`}
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="text-center font-mono text-[11px]">
                        {item.catatan_terisi} / {item.jumlah_santri}
                      </TableCell>

                      <TableCell className="text-center">
                        {renderStatusBadge(item)}
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Drill-down Button */}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenDrilldown(item.marhalah_id, item.semester_id)}
                            className="h-8 px-2 text-xs border-primary/40 text-primary hover:bg-primary/5"
                            title="Drill-down matriks nilai per kelas"
                          >
                            <EyeIcon className="mr-1 h-3.5 w-3.5" />
                            Drill-Down
                          </Button>

                          {/* Lembar Nilai Link */}
                          <Button
                            size="sm"
                            variant="ghost"
                            asChild
                            className="h-8 w-8 p-0 text-zinc-500 hover:text-zinc-900"
                            title="Buka Lembar Nilai"
                          >
                            <Link href={`/admin/kelas/${item.marhalah_id}/nilai`}>
                              <TableIcon className="h-3.5 w-3.5" />
                            </Link>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={9} className="h-32 text-center text-xs text-zinc-400">
                    Tidak ada marhalah yang ditemukan untuk filter tahun ajaran dan semester ini.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* MODAL DIALOG DRILL-DOWN */}
      <Dialog open={isDrilldownOpen} onOpenChange={setIsDrilldownOpen}>
        <DialogContent className="sm:max-w-[96vw] max-h-[94vh] flex flex-col p-4 sm:p-6 overflow-hidden">
          <DialogHeader className="pb-2 border-b border-zinc-100 shrink-0">
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2 text-lg">
                <Maximize2Icon className="h-5 w-5 text-primary" />
                Drill-Down Monitoring Nilai & Pengampu Kelas
              </DialogTitle>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto py-2">
            {drilldownLoading ? (
              <div className="flex flex-col items-center justify-center py-20 text-zinc-400 space-y-2">
                <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-xs">Memuat matriks nilai santri & pengampu...</p>
              </div>
            ) : drilldownData && drilldownData.ok && drilldownData.marhalah && drilldownData.semester ? (
              <ProgresDrilldownClient
                marhalah={drilldownData.marhalah}
                semester={drilldownData.semester}
                waliKelas={drilldownData.wali_kelas ?? null}
                statusRaport={drilldownData.status_raport ?? "draft"}
                mapelColumns={drilldownData.mapelColumns ?? []}
                santriRows={drilldownData.santriRows ?? []}
                totalMapelTanpaPengampu={drilldownData.totalMapelTanpaPengampu ?? 0}
                totalSelKosong={drilldownData.totalSelKosong ?? 0}
                backUrl="/admin/dashboard"
              />
            ) : (
              <div className="text-center py-12 text-sm text-red-600">
                {drilldownData?.message ?? "Gagal memuat rincian drill-down kelas."}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

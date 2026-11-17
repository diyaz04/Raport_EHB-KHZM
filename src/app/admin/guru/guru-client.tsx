"use client";

import * as React from "react";
import {
  UserPlusIcon,
  EditIcon,
  ShieldAlertIcon,
  CheckCircle2Icon,
  XCircleIcon,
  CopyIcon,
  CheckIcon,
  GraduationCapIcon,
  BookOpenIcon,
  UserCheckIcon,
  BookmarkIcon,
  UsersIcon,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DataTable, type ColumnDef } from "@/components/ui/data-table";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { useConfirm } from "@/hooks/use-confirm";
import { notify } from "@/lib/notify";
import {
  createGuruAccountAction,
  updateGuruAction,
  setAktifGuruAction,
  setWaliKelasAction,
  setPengampuAction,
} from "@/app/admin/actions/guru";
import {
  createGuruSchema,
  updateGuruSchema,
  type CreateGuruFormValues,
} from "@/lib/validations/guru";

export interface GuruRecord {
  id: string;
  nama: string;
  email: string;
  aktif: boolean;
  waliKelasDi?: string[];
  jumlahMapelPengampu?: number;
  created_at: string;
}

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

export interface WaliKelasRecord {
  id: string;
  guru_id: string;
  marhalah_id: string;
  tahun_ajaran_id: string;
  guru?: {
    nama: string;
  };
}

export interface MarhalahMapelOption {
  id: string;
  marhalah_id: string;
  semester_id: string;
  mapel_id: string;
  kitab_id: string | null;
  urutan: number;
  tipe: "nilai" | "kelengkapan";
  mapel?: {
    nama: string;
  };
  kitab?: {
    nama: string;
  } | null;
  pengampu?: {
    id: string;
    guru_id: string;
    guru?: {
      nama: string;
    };
  } | null;
}

interface GuruClientProps {
  guruList: GuruRecord[];
  marhalahList: MarhalahOption[];
  tahunAjaranList: TahunAjaranOption[];
  semesterList: SemesterOption[];
  waliKelasList: WaliKelasRecord[];
  marhalahMapelList: MarhalahMapelOption[];
  activeTaId: string | null;
}

export function GuruClient({
  guruList,
  marhalahList,
  tahunAjaranList,
  semesterList,
  waliKelasList,
  marhalahMapelList,
  activeTaId,
}: GuruClientProps) {
  const confirm = useConfirm();
  const [isPending, startTransition] = React.useTransition();

  // Active Tab with browser sessionStorage persistence
  const [activeTab, setActiveTab] = useSessionStorageState<string>(
    "admin_guru_tab",
    "daftar-guru"
  );

  // Dialog State: Buat Guru Baru
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [formNama, setFormNama] = React.useState("");
  const [formEmail, setFormEmail] = React.useState("");
  const [formPassword, setFormPassword] = React.useState("");
  const [formErrors, setFormErrors] = React.useState<Record<string, string>>({});

  // Dialog State: Tampilkan Password Sementara Sekali Saja
  const [tempPasswordData, setTempPasswordData] = React.useState<{
    nama: string;
    email: string;
    password: string;
  } | null>(null);
  const [copied, setCopied] = React.useState(false);

  // Dialog State: Ubah Guru
  const [editingGuru, setEditingGuru] = React.useState<GuruRecord | null>(null);
  const [editNama, setEditNama] = React.useState("");

  // Tab 2 (Wali Kelas) State
  const [selectedTaWaliId, setSelectedTaWaliId] = React.useState<string>(
    activeTaId || tahunAjaranList[0]?.id || ""
  );

  // Tab 3 (Pengampu Mapel) State
  const [selectedMarhalahPengampuId, setSelectedMarhalahPengampuId] = React.useState<string>(
    marhalahList[0]?.id || ""
  );
  const activeSemester = semesterList.find((s) => s.aktif) ?? semesterList[0];
  const [selectedSemesterPengampuId, setSelectedSemesterPengampuId] = React.useState<string>(
    activeSemester?.id || ""
  );

  // Combobox Options Guru yang Aktif
  const activeGuruOptions: ComboboxOption[] = React.useMemo(() => {
    const list = guruList
      .filter((g) => g.aktif)
      .map((g) => ({
        value: g.id,
        label: `${g.nama} (${g.email})`,
      }));
    return [{ value: "none", label: "- Belum Ditugaskan -" }, ...list];
  }, [guruList]);

  // Open Dialogs
  const openCreateDialog = () => {
    setFormNama("");
    setFormEmail("");
    setFormPassword("");
    setFormErrors({});
    setIsCreateOpen(true);
  };

  const openEditDialog = (guru: GuruRecord) => {
    setEditingGuru(guru);
    setEditNama(guru.nama);
    setIsCreateOpen(false);
  };

  // Submit Buat Guru
  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});

    const formValues: CreateGuruFormValues = {
      nama: formNama,
      email: formEmail,
      password: formPassword.trim().length > 0 ? formPassword.trim() : "",
    };

    const parsed = createGuruSchema.safeParse(formValues);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      parsed.error.issues.forEach((err) => {
        if (err.path[0]) fieldErrors[err.path[0].toString()] = err.message;
      });
      setFormErrors(fieldErrors);
      return;
    }

    startTransition(async () => {
      const res = await createGuruAccountAction(parsed.data);
      if (res.ok && res.temporaryPassword) {
        setIsCreateOpen(false);
        setTempPasswordData({
          nama: res.nama || parsed.data.nama,
          email: res.email || parsed.data.email,
          password: res.temporaryPassword,
        });
        setCopied(false);
        notify.success(res.message);
      } else {
        notify.error(res.message);
      }
    });
  };

  // Submit Ubah Guru
  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGuru) return;

    const parsed = updateGuruSchema.safeParse({ nama: editNama });
    if (!parsed.success) {
      notify.error(parsed.error.issues[0]?.message ?? "Validasi gagal.");
      return;
    }

    startTransition(async () => {
      const res = await updateGuruAction(editingGuru.id, parsed.data);
      if (res.ok) {
        notify.success(res.message);
        setEditingGuru(null);
      } else {
        notify.error(res.message);
      }
    });
  };

  // Toggle Aktif / Nonaktifkan Guru
  const handleToggleAktif = async (guru: GuruRecord) => {
    const isActivating = !guru.aktif;
    const isConfirmed = await confirm({
      title: isActivating ? "Aktifkan Akun Guru" : "Nonaktifkan Akun Guru",
      description: isActivating
        ? `Apakah Anda ingin mengaktifkan kembali akun ${guru.nama}? Guru dapat kembali login dan mengakses nilai.`
        : `Apakah Anda yakin ingin menonaktifkan akun ${guru.nama}? Guru tidak akan dapat login ke panel guru.`,
      destructive: !isActivating,
      confirmText: isActivating ? "Aktifkan" : "Nonaktifkan",
      cancelText: "Batal",
    });

    if (isConfirmed) {
      startTransition(async () => {
        const res = await setAktifGuruAction(guru.id, isActivating);
        if (res.ok) {
          notify.success(res.message);
        } else {
          notify.error(res.message);
        }
      });
    }
  };

  // Copy password to clipboard
  const handleCopyPassword = () => {
    if (tempPasswordData?.password) {
      navigator.clipboard.writeText(tempPasswordData.password);
      setCopied(true);
      notify.success("Password sementara disalin ke clipboard!");
      setTimeout(() => setCopied(false), 3000);
    }
  };

  // Penugasan Wali Kelas Change
  const handleWaliKelasChange = (marhalah_id: string, guru_id_val: string) => {
    const guru_id = guru_id_val === "none" ? null : guru_id_val;

    startTransition(async () => {
      const res = await setWaliKelasAction({
        marhalah_id,
        tahun_ajaran_id: selectedTaWaliId,
        guru_id,
      });

      if (res.ok) {
        notify.success(res.message);
      } else {
        notify.error(res.message);
      }
    });
  };

  // Penugasan Pengampu Mapel Change
  const handlePengampuChange = (marhalah_mapel_id: string, guru_id_val: string) => {
    const guru_id = guru_id_val === "none" ? null : guru_id_val;

    startTransition(async () => {
      const res = await setPengampuAction({
        marhalah_mapel_id,
        guru_id,
      });

      if (res.ok) {
        notify.success(res.message);
      } else {
        notify.error(res.message);
      }
    });
  };

  // Kolom TanStack Table Guru
  const columns: ColumnDef<GuruRecord>[] = [
    {
      accessorKey: "nama",
      header: "Nama Lengkap Guru",
      cell: ({ row }) => {
        const g = row.original;
        return (
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-primary text-xs font-bold">
              {g.nama.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="font-semibold text-zinc-900">{g.nama}</div>
              <div className="text-xs text-zinc-500 font-mono">{g.email}</div>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "aktif",
      header: "Status",
      cell: ({ row }) => {
        const isAktif = row.original.aktif;
        return isAktif ? (
          <Badge className="bg-emerald-700 text-white text-xs">
            <CheckCircle2Icon className="mr-1 h-3 w-3" />
            Aktif
          </Badge>
        ) : (
          <Badge variant="outline" className="text-zinc-500 border-zinc-300 bg-zinc-100 text-xs">
            <XCircleIcon className="mr-1 h-3 w-3 text-zinc-400" />
            Nonaktif
          </Badge>
        );
      },
    },
    {
      id: "penugasan",
      header: "Tugas Wali Kelas",
      cell: ({ row }) => {
        const wali = row.original.waliKelasDi;
        if (wali && wali.length > 0) {
          return (
            <div className="flex flex-wrap gap-1">
              {wali.map((w, idx) => (
                <Badge key={idx} variant="outline" className="border-primary/40 text-primary text-[11px]">
                  <GraduationCapIcon className="mr-1 h-3 w-3" />
                  {w}
                </Badge>
              ))}
            </div>
          );
        }
        return <span className="text-xs text-zinc-400 italic">-</span>;
      },
    },
    {
      accessorKey: "jumlahMapelPengampu",
      header: "Mapel Diampu",
      cell: ({ row }) => {
        const count = row.original.jumlahMapelPengampu ?? 0;
        return (
          <span className="font-mono text-xs font-semibold text-zinc-700">
            {count} Mapel
          </span>
        );
      },
    },
    {
      id: "actions",
      header: () => <div className="text-right">Aksi</div>,
      cell: ({ row }) => {
        const g = row.original;
        return (
          <div className="flex items-center justify-end gap-1.5">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => openEditDialog(g)}
              className="h-8 w-8 p-0 text-zinc-600 hover:text-zinc-900"
              title="Edit Nama"
            >
              <EditIcon className="h-3.5 w-3.5" />
              <span className="sr-only">Edit</span>
            </Button>

            <Button
              size="sm"
              variant="ghost"
              disabled={isPending}
              onClick={() => handleToggleAktif(g)}
              className={`h-8 px-2 text-xs ${
                g.aktif
                  ? "text-zinc-400 hover:text-destructive hover:bg-red-50"
                  : "text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50"
              }`}
            >
              {g.aktif ? "Nonaktifkan" : "Aktifkan"}
            </Button>
          </div>
        );
      },
    },
  ];

  // Filter marhalah mapel untuk tab 3
  const currentMarhalahMapels = React.useMemo(() => {
    return marhalahMapelList
      .filter(
        (mm) =>
          mm.marhalah_id === selectedMarhalahPengampuId &&
          mm.semester_id === selectedSemesterPengampuId
      )
      .sort((a, b) => a.urutan - b.urutan);
  }, [marhalahMapelList, selectedMarhalahPengampuId, selectedSemesterPengampuId]);

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-200 pb-5">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-zinc-900">
            Guru & Penugasan Akademik
          </h2>
          <p className="text-xs text-zinc-500">
            Kelola akun guru, penugasan wali kelas per marhalah, dan pengampu mata pelajaran kurikulum.
          </p>
        </div>
        <Button onClick={openCreateDialog} size="sm" className="h-9 gap-1.5">
          <UserPlusIcon className="h-4 w-4" />
          <span>Buat Akun Guru Baru</span>
        </Button>
      </div>

      {/* TABS UTAMA */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-zinc-100 p-1">
          <TabsTrigger value="daftar-guru" className="gap-1.5 text-xs font-semibold">
            <UsersIcon className="h-3.5 w-3.5" />
            <span>Daftar Guru ({guruList.length})</span>
          </TabsTrigger>
          <TabsTrigger value="wali-kelas" className="gap-1.5 text-xs font-semibold">
            <GraduationCapIcon className="h-3.5 w-3.5" />
            <span>Penugasan Wali Kelas</span>
          </TabsTrigger>
          <TabsTrigger value="pengampu-mapel" className="gap-1.5 text-xs font-semibold">
            <BookOpenIcon className="h-3.5 w-3.5" />
            <span>Pengampu Mata Pelajaran</span>
          </TabsTrigger>
        </TabsList>

        {/* ============================================================ */}
        {/* TAB 1: DAFTAR GURU */}
        {/* ============================================================ */}
        <TabsContent value="daftar-guru" className="space-y-4">
          <DataTable
            columns={columns}
            data={guruList}
            searchKey="nama"
            searchPlaceholder="Cari nama guru..."
          />
        </TabsContent>

        {/* ============================================================ */}
        {/* TAB 2: PENUGASAN WALI KELAS */}
        {/* ============================================================ */}
        <TabsContent value="wali-kelas" className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-zinc-200 shadow-2xs">
            <div className="space-y-0.5">
              <div className="text-sm font-bold text-zinc-900">
                Pilih Tahun Ajaran Penugasan
              </div>
              <div className="text-xs text-zinc-500">
                Penugasan wali kelas berlaku untuk seluruh marhalah pada tahun ajaran yang dipilih.
              </div>
            </div>

            <div className="w-64">
              <Select value={selectedTaWaliId} onValueChange={setSelectedTaWaliId}>
                <SelectTrigger className="h-9">
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
          </div>

          {/* TABEL MARHALAH & WALI KELAS */}
          <div className="rounded-lg border border-zinc-200 bg-white shadow-2xs overflow-hidden">
            <Table>
              <TableHeader className="bg-zinc-50/75">
                <TableRow>
                  <TableHead className="w-16 text-center font-semibold text-zinc-700">Urutan</TableHead>
                  <TableHead className="w-48 font-semibold text-zinc-700">Marhalah / Jenjang</TableHead>
                  <TableHead className="w-36 font-semibold text-zinc-700">Wali Kelas Saat Ini</TableHead>
                  <TableHead className="font-semibold text-zinc-700">Tentukan Wali Kelas (Combobox)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {marhalahList.map((m) => {
                  const assignment = waliKelasList.find(
                    (wk) => wk.marhalah_id === m.id && wk.tahun_ajaran_id === selectedTaWaliId
                  );
                  const currentGuruId = assignment?.guru_id || "none";

                  return (
                    <TableRow key={m.id} className="hover:bg-zinc-50/50">
                      <TableCell className="text-center font-mono text-xs font-semibold text-zinc-500">
                        #{m.urutan}
                      </TableCell>
                      <TableCell>
                        <div className="font-semibold text-zinc-900">{m.nama}</div>
                        <div className="text-[11px] font-mono text-zinc-400">Kode: {m.kode}</div>
                      </TableCell>
                      <TableCell>
                        {assignment?.guru?.nama ? (
                          <Badge className="bg-emerald-700 text-white text-xs">
                            <UserCheckIcon className="mr-1 h-3 w-3" />
                            {assignment.guru.nama}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-zinc-400 border-dashed text-xs">
                            Belum Ditugaskan
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="max-w-md">
                        <Combobox
                          options={activeGuruOptions}
                          value={currentGuruId}
                          onChange={(val) => handleWaliKelasChange(m.id, val)}
                          placeholder="Pilih guru wali kelas..."
                          searchPlaceholder="Cari nama guru..."
                          emptyText="Guru tidak ditemukan."
                          disabled={isPending}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* ============================================================ */}
        {/* TAB 3: PENGAMPU MATA PELAJARAN */}
        {/* ============================================================ */}
        <TabsContent value="pengampu-mapel" className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-white rounded-lg border border-zinc-200 shadow-2xs">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-zinc-600">Pilih Marhalah</Label>
              <Select value={selectedMarhalahPengampuId} onValueChange={setSelectedMarhalahPengampuId}>
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
              <Select value={selectedSemesterPengampuId} onValueChange={setSelectedSemesterPengampuId}>
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

          {/* TABEL MAPEL 1-12 & GURU PENGAMPU */}
          <div className="rounded-lg border border-zinc-200 bg-white shadow-2xs overflow-hidden">
            <Table>
              <TableHeader className="bg-zinc-50/75">
                <TableRow>
                  <TableHead className="w-16 text-center font-semibold text-zinc-700">Urutan</TableHead>
                  <TableHead className="w-48 font-semibold text-zinc-700">Mata Pelajaran</TableHead>
                  <TableHead className="w-40 font-semibold text-zinc-700">Kitab</TableHead>
                  <TableHead className="w-28 font-semibold text-zinc-700">Tipe</TableHead>
                  <TableHead className="w-40 font-semibold text-zinc-700">Pengampu Saat Ini</TableHead>
                  <TableHead className="font-semibold text-zinc-700">Tentukan Pengampu (Combobox)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentMarhalahMapels.length > 0 ? (
                  currentMarhalahMapels.map((mm) => {
                    const currentGuruId = mm.pengampu?.guru_id || "none";

                    return (
                      <TableRow key={mm.id} className="hover:bg-zinc-50/50">
                        <TableCell className="text-center font-mono text-xs font-semibold text-zinc-500">
                          #{mm.urutan}
                        </TableCell>
                        <TableCell>
                          <div className="font-semibold text-zinc-900 flex items-center gap-1.5">
                            <BookOpenIcon className="h-4 w-4 text-primary shrink-0" />
                            <span>{mm.mapel?.nama ?? "-"}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {mm.kitab?.nama ? (
                            <div className="flex items-center gap-1 text-zinc-700 text-xs">
                              <BookmarkIcon className="h-3.5 w-3.5 text-emerald-700 shrink-0" />
                              <span>{mm.kitab.nama}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-zinc-400 italic">- Tanpa Kitab -</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {mm.tipe === "nilai" ? (
                            <Badge className="bg-emerald-700 text-white text-[10px]">Nilai</Badge>
                          ) : (
                            <Badge variant="outline" className="text-sky-700 border-sky-300 text-[10px]">
                              Kelengkapan
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {mm.pengampu?.guru?.nama ? (
                            <Badge className="bg-emerald-700 text-white text-xs">
                              <UserCheckIcon className="mr-1 h-3 w-3" />
                              {mm.pengampu.guru.nama}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-zinc-400 border-dashed text-xs">
                              Belum Ditugaskan
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="max-w-md">
                          <Combobox
                            options={activeGuruOptions}
                            value={currentGuruId}
                            onChange={(val) => handlePengampuChange(mm.id, val)}
                            placeholder="Pilih guru pengampu..."
                            searchPlaceholder="Cari nama guru..."
                            emptyText="Guru tidak ditemukan."
                            disabled={isPending}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-xs text-zinc-400">
                      Belum ada mata pelajaran yang dikonfigurasi pada marhalah dan semester ini. Silakan atur kurikulum terlebih dahulu.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* DIALOG BUAT AKUN GURU BARU */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>Buat Akun Guru Baru</DialogTitle>
            <DialogDescription>
              Akun akan didaftarkan ke Supabase Auth dengan hak akses guru raport.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateSubmit} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="guru-nama">Nama Lengkap Guru</Label>
              <Input
                id="guru-nama"
                placeholder="Ust. Ahmad Dahlan, S.Pd."
                value={formNama}
                onChange={(e) => setFormNama(e.target.value)}
              />
              {formErrors.nama ? (
                <p className="text-xs text-destructive">{formErrors.nama}</p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="guru-email">Alamat Email Login</Label>
              <Input
                id="guru-email"
                type="email"
                placeholder="ahmad@pesantren.com"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
              />
              {formErrors.email ? (
                <p className="text-xs text-destructive">{formErrors.email}</p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="guru-password">Password Sementara (Opsional)</Label>
              <Input
                id="guru-password"
                type="text"
                placeholder="Kosongkan untuk generate acak otomatis"
                value={formPassword}
                onChange={(e) => setFormPassword(e.target.value)}
              />
              <p className="text-[11px] text-zinc-400">
                Bila dikosongkan, sistem akan membuat password acak 10 karakter.
              </p>
              {formErrors.password ? (
                <p className="text-xs text-destructive">{formErrors.password}</p>
              ) : null}
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Membuat Akun..." : "Buat Akun Guru"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIALOG PASSWORD SEMENTARA GURU (TAMPIL SEKALI SAJA) */}
      <Dialog
        open={Boolean(tempPasswordData)}
        onOpenChange={(open) => {
          if (!open) setTempPasswordData(null);
        }}
      >
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-primary mb-1">
              <CheckCircle2Icon className="h-5 w-5" />
            </div>
            <DialogTitle>Akun Guru Berhasil Dibuat!</DialogTitle>
            <DialogDescription>
              Berikan informasi login di bawah ini kepada guru bersangkutan.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2.5 text-amber-900 text-xs">
              <ShieldAlertIcon className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <strong>Penting:</strong> Password sementara ini <u>hanya ditampilkan sekali</u> pada dialog ini demi keamanan. Harap catat atau salin sekarang sebelum menutup.
              </div>
            </div>

            <div className="space-y-2.5 bg-zinc-50 p-3.5 rounded-lg border border-zinc-200 text-xs">
              <div>
                <span className="text-zinc-500">Nama Guru:</span>
                <div className="font-semibold text-zinc-900 text-sm mt-0.5">
                  {tempPasswordData?.nama}
                </div>
              </div>

              <div>
                <span className="text-zinc-500">Email Login:</span>
                <div className="font-mono text-zinc-900 text-sm mt-0.5">
                  {tempPasswordData?.email}
                </div>
              </div>

              <div className="pt-1">
                <span className="text-zinc-500 font-semibold">Password Sementara:</span>
                <div className="flex items-center gap-2 mt-1">
                  <div className="font-mono font-bold text-base bg-white px-3 py-1.5 rounded border border-zinc-300 text-emerald-800 flex-1 select-all">
                    {tempPasswordData?.password}
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleCopyPassword}
                    className="h-9 px-3 gap-1.5"
                  >
                    {copied ? (
                      <>
                        <CheckIcon className="h-3.5 w-3.5 text-primary" />
                        <span className="text-xs text-primary font-semibold">Tersalin</span>
                      </>
                    ) : (
                      <>
                        <CopyIcon className="h-3.5 w-3.5" />
                        <span className="text-xs">Salin</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              onClick={() => setTempPasswordData(null)}
              className="w-full sm:w-auto"
            >
              Saya Sudah Menyimpan Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG UBAH NAMA GURU */}
      <Dialog
        open={Boolean(editingGuru)}
        onOpenChange={(open) => {
          if (!open) setEditingGuru(null);
        }}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Ubah Data Guru</DialogTitle>
            <DialogDescription>
              Email login: <span className="font-mono">{editingGuru?.email}</span>
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEditSubmit} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="edit-guru-nama">Nama Lengkap Guru</Label>
              <Input
                id="edit-guru-nama"
                value={editNama}
                onChange={(e) => setEditNama(e.target.value)}
              />
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setEditingGuru(null)}>
                Batal
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Menyimpan..." : "Simpan Perubahan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

"use client";

import * as React from "react";
import ExcelJS from "exceljs";
import {
  UploadIcon,
  DownloadIcon,
  FileSpreadsheetIcon,
  CheckCircle2Icon,
  XCircleIcon,
  AlertCircleIcon,
  ChevronRightIcon,
  ChevronLeftIcon,
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
import { notify } from "@/lib/notify";
import { generateTemplateSantriBuffer, type MarhalahRef } from "@/lib/excel/template-santri";
import {
  importSantriMassalAction,
  type ImportSantriRow,
  type ImportResult,
} from "@/app/admin/actions/import-santri";

export interface MarhalahItem {
  id: string;
  nama: string;
  kode: string;
}

export interface TahunAjaranItem {
  id: string;
  nama: string;
  kode: string;
  aktif: boolean;
}

interface ParsedRow {
  rowNumber: number;
  nis: string | null;
  nama: string;
  marhalahRaw: string;
  marhalahId: string | null;
  marhalahNama: string | null;
  jk: "L" | "P" | null;
  isValid: boolean;
  errors: string[];
}

interface ImportSantriDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  marhalahList: MarhalahItem[];
  tahunAjaranList: TahunAjaranItem[];
  activeTahunAjaranId: string | null;
}

export function ImportSantriDialog({
  open,
  onOpenChange,
  marhalahList,
  tahunAjaranList,
  activeTahunAjaranId,
}: ImportSantriDialogProps) {
  // Steps: 1: Upload, 2: Preview & Validasi, 3: Konfirmasi, 4: Ringkasan
  const [step, setStep] = React.useState<1 | 2 | 3 | 4>(1);
  const [isPending, startTransition] = React.useTransition();

  const [selectedTaId, setSelectedTaId] = React.useState<string>(
    activeTahunAjaranId || tahunAjaranList[0]?.id || ""
  );
  const [file, setFile] = React.useState<File | null>(null);
  const [parsedRows, setParsedRows] = React.useState<ParsedRow[]>([]);
  const [importResult, setImportResult] = React.useState<ImportResult | null>(null);

  const resetForm = () => {
    setStep(1);
    setFile(null);
    setParsedRows([]);
    setImportResult(null);
  };

  const handleDialogClose = (isOpen: boolean) => {
    if (!isOpen) {
      resetForm();
    }
    onOpenChange(isOpen);
  };

  // Unduh Template Excel
  const handleDownloadTemplate = async () => {
    try {
      const refs: MarhalahRef[] = marhalahList.map((m) => ({ nama: m.nama, kode: m.kode }));
      const buffer = await generateTemplateSantriBuffer(refs);
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "template_import_santri.xlsx";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      notify.success("Template Excel berhasil diunduh.");
    } catch {
      notify.error("Gagal mengunduh template Excel.");
    }
  };

  // Baca & Parse File Excel
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    setFile(selectedFile);
  };

  const handleParseExcel = async () => {
    if (!file) {
      notify.error("Silakan pilih file Excel terlebih dahulu.");
      return;
    }

    try {
      const buffer = await file.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);

      const worksheet = workbook.worksheets[0];
      if (!worksheet) {
        notify.error("Lembar kerja Excel tidak ditemukan.");
        return;
      }

      const rows: ParsedRow[] = [];
      const seenNis = new Set<string>();

      // Pemetaan marhalah untuk pencocokan cepat (kode dan nama)
      const marhalahMap = new Map<string, MarhalahItem>();
      marhalahList.forEach((m) => {
        marhalahMap.set(m.kode.trim().toLowerCase(), m);
        marhalahMap.set(m.nama.trim().toLowerCase(), m);
      });

      // Mulai dari baris ke-2 (mengabaikan baris 1 header)
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;

        const nisRaw = row.getCell(1).text?.trim();
        const namaRaw = row.getCell(2).text?.trim();
        const marhalahRaw = row.getCell(3).text?.trim();
        const jkRaw = row.getCell(4).text?.trim().toUpperCase();

        // Lewati jika seluruh baris kosong
        if (!nisRaw && !namaRaw && !marhalahRaw && !jkRaw) return;

        const rowErrors: string[] = [];

        // 1. Validasi Nama
        if (!namaRaw || namaRaw.length === 0) {
          rowErrors.push("Nama santri wajib diisi");
        }

        // 2. Validasi Jenis Kelamin
        let parsedJk: "L" | "P" | null = null;
        if (jkRaw === "L" || jkRaw === "LAKI-LAKI" || jkRaw === "LAKI") {
          parsedJk = "L";
        } else if (jkRaw === "P" || jkRaw === "PEREMPUAN") {
          parsedJk = "P";
        } else {
          rowErrors.push(`Jenis kelamin '${jkRaw || ""}' tidak valid (harus L / P)`);
        }

        // 3. Validasi Marhalah
        let matchedMarhalah: MarhalahItem | null = null;
        if (marhalahRaw && marhalahRaw.length > 0) {
          const match = marhalahMap.get(marhalahRaw.toLowerCase());
          if (match) {
            matchedMarhalah = match;
          } else {
            rowErrors.push(`Marhalah '${marhalahRaw}' tidak ditemukan di sistem`);
          }
        }

        // 4. Validasi NIS Duplikat di File
        let cleanNis: string | null = null;
        if (nisRaw && nisRaw.length > 0) {
          cleanNis = nisRaw;
          if (seenNis.has(cleanNis.toLowerCase())) {
            rowErrors.push(`NIS '${cleanNis}' terduplikasi di file Excel`);
          } else {
            seenNis.add(cleanNis.toLowerCase());
          }
        }

        rows.push({
          rowNumber,
          nis: cleanNis,
          nama: namaRaw || "",
          marhalahRaw: marhalahRaw || "",
          marhalahId: matchedMarhalah ? matchedMarhalah.id : null,
          marhalahNama: matchedMarhalah ? matchedMarhalah.nama : null,
          jk: parsedJk,
          isValid: rowErrors.length === 0,
          errors: rowErrors,
        });
      });

      if (rows.length === 0) {
        notify.error("Tidak ada baris data santri yang ditemukan pada file Excel.");
        return;
      }

      setParsedRows(rows);
      setStep(2); // Pindah ke langkah 2 (Preview)
    } catch (err) {
      notify.error(`Gagal memproses file Excel: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  // Hitung jumlah baris valid dan error
  const validRows = React.useMemo(() => parsedRows.filter((r) => r.isValid), [parsedRows]);
  const errorRows = React.useMemo(() => parsedRows.filter((r) => !r.isValid), [parsedRows]);

  // Eksekusi Import
  const handleExecuteImport = () => {
    if (validRows.length === 0) {
      notify.error("Tidak ada baris valid yang dapat diimpor.");
      return;
    }

    startTransition(async () => {
      const payload: ImportSantriRow[] = validRows.map((r) => ({
        nama: r.nama,
        nis: r.nis,
        jenis_kelamin: r.jk as "L" | "P",
        marhalah_id: r.marhalahId,
      }));

      const res = await importSantriMassalAction(selectedTaId, payload);
      setImportResult(res);
      setStep(4); // Pindah ke langkah 4 (Ringkasan)
      if (res.ok) {
        notify.success(res.message);
      } else {
        notify.error(res.message);
      }
    });
  };

  const selectedTa = React.useMemo(
    () => tahunAjaranList.find((t) => t.id === selectedTaId),
    [tahunAjaranList, selectedTaId]
  );

  return (
    <Dialog open={open} onOpenChange={handleDialogClose}>
      <DialogContent className="sm:max-w-[720px] max-h-[85vh] flex flex-col">
        {/* HEADER */}
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-primary">
              <FileSpreadsheetIcon className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle>Import Data Santri via Excel</DialogTitle>
              <DialogDescription>
                Unggah data santri massal dan langsung tempatkan ke marhalah kelas.
              </DialogDescription>
            </div>
          </div>

          {/* STEP INDICATOR */}
          <div className="flex items-center justify-between pt-3 text-xs font-medium text-zinc-500 border-b border-zinc-100 pb-2">
            <span className={step === 1 ? "text-primary font-bold" : ""}>1. Upload File</span>
            <ChevronRightIcon className="h-3 w-3 text-zinc-300" />
            <span className={step === 2 ? "text-primary font-bold" : ""}>2. Preview & Validasi</span>
            <ChevronRightIcon className="h-3 w-3 text-zinc-300" />
            <span className={step === 3 ? "text-primary font-bold" : ""}>3. Konfirmasi</span>
            <ChevronRightIcon className="h-3 w-3 text-zinc-300" />
            <span className={step === 4 ? "text-primary font-bold" : ""}>4. Ringkasan</span>
          </div>
        </DialogHeader>

        {/* BODY BY STEP */}
        <div className="flex-1 overflow-y-auto py-2">
          {/* ============================================================ */}
          {/* LANGKAH 1: UPLOAD FILE */}
          {/* ============================================================ */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3.5 bg-emerald-50/70 border border-emerald-200/80 rounded-lg text-xs text-emerald-900">
                <div>
                  <div className="font-semibold text-emerald-950">Belum punya template Excel?</div>
                  <div className="text-emerald-700">
                    Unduh template resmi yang memuat daftar kode marhalah yang valid.
                  </div>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleDownloadTemplate}
                  className="bg-white border-emerald-300 text-primary hover:bg-emerald-50 h-8 gap-1.5"
                >
                  <DownloadIcon className="h-3.5 w-3.5" />
                  <span>Unduh Template</span>
                </Button>
              </div>

              <div className="space-y-1.5">
                <Label>Pilih Tahun Ajaran Penempatan</Label>
                <Select value={selectedTaId} onValueChange={setSelectedTaId}>
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
                <p className="text-[11px] text-zinc-400">
                  Santri yang menyertakan marhalah pada Excel akan langsung didaftarkan ke tahun ajaran ini.
                </p>
              </div>

              <div className="space-y-1.5 pt-2">
                <Label htmlFor="excel-file">Pilih File Excel (.xlsx / .xls)</Label>
                <div className="border-2 border-dashed border-zinc-200 rounded-lg p-6 flex flex-col items-center justify-center text-center hover:border-primary/50 transition-colors">
                  <UploadIcon className="h-8 w-8 text-zinc-400 mb-2" />
                  <input
                    id="excel-file"
                    type="file"
                    accept=".xlsx, .xls"
                    onChange={handleFileChange}
                    className="text-xs text-zinc-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-white hover:file:bg-primary/90 cursor-pointer"
                  />
                  {file ? (
                    <div className="mt-2 text-xs font-semibold text-emerald-700">
                      File terpilih: {file.name} ({(file.size / 1024).toFixed(1)} KB)
                    </div>
                  ) : (
                    <div className="mt-2 text-[11px] text-zinc-400">
                      Gunakan file template dengan kolom: NIS, Nama, Marhalah, JK
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* LANGKAH 2: PREVIEW & VALIDASI PER BARIS */}
          {/* ============================================================ */}
          {step === 2 && (
            <div className="space-y-3">
              {/* Ringkasan Validasi */}
              <div className="flex items-center justify-between p-3 bg-zinc-50 border border-zinc-200 rounded-lg text-xs">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1 font-semibold text-emerald-700">
                    <CheckCircle2Icon className="h-4 w-4" />
                    {validRows.length} Baris Valid
                  </span>
                  {errorRows.length > 0 ? (
                    <span className="flex items-center gap-1 font-semibold text-destructive">
                      <XCircleIcon className="h-4 w-4" />
                      {errorRows.length} Baris Error (Akan Dilewati)
                    </span>
                  ) : null}
                </div>
                <Badge variant="outline" className="text-zinc-600">
                  Total {parsedRows.length} Baris
                </Badge>
              </div>

              {errorRows.length > 0 ? (
                <div className="flex items-center gap-2 p-2.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-md text-xs">
                  <AlertCircleIcon className="h-4 w-4 shrink-0" />
                  <span>
                    <strong>Penting:</strong> Baris bertanda merah memiliki kesalahan format dan <u>tidak akan diimpor</u>. Anda tetap dapat melanjutkan impor untuk baris yang valid.
                  </span>
                </div>
              ) : null}

              {/* Tabel Preview */}
              <div className="rounded-md border border-zinc-200 overflow-hidden max-h-[42vh] overflow-y-auto">
                <Table>
                  <TableHeader className="bg-zinc-50 sticky top-0 z-10">
                    <TableRow>
                      <TableHead className="w-12 text-center text-xs">Baris</TableHead>
                      <TableHead className="w-24 text-xs">NIS</TableHead>
                      <TableHead className="text-xs">Nama Santri</TableHead>
                      <TableHead className="w-16 text-center text-xs">JK</TableHead>
                      <TableHead className="w-32 text-xs">Marhalah</TableHead>
                      <TableHead className="text-xs">Status / Alasan Error</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedRows.map((row) => (
                      <TableRow
                        key={row.rowNumber}
                        className={
                          row.isValid
                            ? "hover:bg-zinc-50/50"
                            : "bg-red-50/60 hover:bg-red-50 text-red-950 border-red-200"
                        }
                      >
                        <TableCell className="text-center font-mono text-xs text-zinc-500">
                          #{row.rowNumber}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {row.nis ? row.nis : "-"}
                        </TableCell>
                        <TableCell className="font-semibold text-xs">
                          {row.nama || <span className="text-destructive italic">(Kosong)</span>}
                        </TableCell>
                        <TableCell className="text-center text-xs font-bold">
                          {row.jk || <span className="text-destructive">-</span>}
                        </TableCell>
                        <TableCell className="text-xs">
                          {row.marhalahNama ? (
                            <span className="text-emerald-800 font-medium">
                              {row.marhalahNama}
                            </span>
                          ) : row.marhalahRaw ? (
                            <span className="text-destructive">{row.marhalahRaw}</span>
                          ) : (
                            <span className="text-zinc-400 italic">Tanpa Kelas</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs">
                          {row.isValid ? (
                            <Badge className="bg-emerald-700 text-white text-[10px] font-normal">
                              <CheckCircle2Icon className="mr-1 h-3 w-3" /> Siap Diimpor
                            </Badge>
                          ) : (
                            <div className="space-y-0.5">
                              {row.errors.map((err, i) => (
                                <div key={i} className="text-destructive font-medium text-[11px] flex items-center gap-1">
                                  <span>•</span> {err}
                                </div>
                              ))}
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* LANGKAH 3: KONFIRMASI */}
          {/* ============================================================ */}
          {step === 3 && (
            <div className="space-y-4 p-2">
              <div className="rounded-lg border border-zinc-200 p-4 bg-zinc-50 space-y-3">
                <h4 className="font-semibold text-sm text-zinc-900">
                  Rincian Impor Data Santri
                </h4>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-white rounded border border-zinc-200">
                    <div className="text-zinc-500">Tahun Ajaran Target:</div>
                    <div className="font-bold text-zinc-900 text-sm mt-0.5">
                      TA {selectedTa?.nama} ({selectedTa?.kode})
                    </div>
                  </div>

                  <div className="p-3 bg-white rounded border border-zinc-200">
                    <div className="text-zinc-500">Total Baris File:</div>
                    <div className="font-bold text-zinc-900 text-sm mt-0.5">
                      {parsedRows.length} Santri
                    </div>
                  </div>

                  <div className="p-3 bg-emerald-50 rounded border border-emerald-200">
                    <div className="text-emerald-700">Santri yang Akan Diimpor:</div>
                    <div className="font-bold text-emerald-900 text-base mt-0.5">
                      {validRows.length} Santri
                    </div>
                  </div>

                  <div className="p-3 bg-red-50 rounded border border-red-200">
                    <div className="text-red-700">Baris yang Dilewati (Error):</div>
                    <div className="font-bold text-red-900 text-base mt-0.5">
                      {errorRows.length} Baris
                    </div>
                  </div>
                </div>

                <p className="text-xs text-zinc-500 pt-1">
                  Klik tombol <strong>&apos;Mulai Impor Sekarang&apos;</strong> untuk memasukkan seluruh baris santri valid ke dalam basis data dan menempatkannya ke marhalah masing-masing.
                </p>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* LANGKAH 4: RINGKASAN HASIL */}
          {/* ============================================================ */}
          {step === 4 && (
            <div className="space-y-4 py-4 text-center">
              <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-full bg-emerald-100 text-primary">
                <CheckCircle2Icon className="h-6 w-6" />
              </div>

              <div>
                <h3 className="text-lg font-bold text-zinc-900">
                  Proses Impor Telah Selesai
                </h3>
                <p className="text-xs text-zinc-500 mt-1 max-w-md mx-auto">
                  {importResult?.message}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3 max-w-md mx-auto text-left text-xs pt-2">
                <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-lg">
                  <div className="text-zinc-500">Santri Terimpor</div>
                  <div className="text-base font-bold text-zinc-900">
                    {importResult?.importedCount ?? 0}
                  </div>
                </div>
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <div className="text-emerald-700">Masuk Kelas</div>
                  <div className="text-base font-bold text-emerald-900">
                    {importResult?.enrolledCount ?? 0}
                  </div>
                </div>
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="text-red-700">Dilewati</div>
                  <div className="text-base font-bold text-red-900">
                    {importResult?.skippedCount ?? 0}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* FOOTER NAVIGASI LANGKAH */}
        <DialogFooter className="pt-3 border-t border-zinc-100">
          {step === 1 && (
            <>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Batal
              </Button>
              <Button type="button" onClick={handleParseExcel} disabled={!file}>
                <span>Lanjut ke Preview</span>
                <ChevronRightIcon className="ml-1 h-4 w-4" />
              </Button>
            </>
          )}

          {step === 2 && (
            <>
              <Button type="button" variant="outline" onClick={() => setStep(1)}>
                <ChevronLeftIcon className="mr-1 h-4 w-4" />
                <span>Pilih Ulang File</span>
              </Button>
              <Button
                type="button"
                onClick={() => setStep(3)}
                disabled={validRows.length === 0}
              >
                <span>Lanjut ke Konfirmasi ({validRows.length} Valid)</span>
                <ChevronRightIcon className="ml-1 h-4 w-4" />
              </Button>
            </>
          )}

          {step === 3 && (
            <>
              <Button type="button" variant="outline" onClick={() => setStep(2)} disabled={isPending}>
                <ChevronLeftIcon className="mr-1 h-4 w-4" />
                <span>Kembali ke Preview</span>
              </Button>
              <Button type="button" onClick={handleExecuteImport} disabled={isPending}>
                {isPending ? "Mengimpor..." : `Mulai Impor (${validRows.length} Santri)`}
              </Button>
            </>
          )}

          {step === 4 && (
            <Button type="button" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
              Selesai & Tutup
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

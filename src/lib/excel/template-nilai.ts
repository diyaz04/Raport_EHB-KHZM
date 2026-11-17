import ExcelJS from "exceljs";

export interface TemplateMapelItem {
  id: string;
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

export interface TemplateSantriItem {
  enrollment_id: string;
  santri_id: string;
  nis: string | null;
  nama: string;
  jenis_kelamin: "L" | "P";
  nilaiMap?: Record<string, number | null>;
  catatan?: {
    akhlak: string | null;
    ketekunan: string | null;
    kerapihan: string | null;
    kebersihan: string | null;
    sakit: number;
    izin: number;
    alpa: number;
  };
}

export interface GenerateTemplateNilaiOptions {
  marhalah: {
    id: string;
    nama: string;
    kode: string;
  };
  semester: {
    id: string;
    jenis: "Ganjil" | "Genap";
    tahun_ajaran?: {
      nama: string;
      kode: string;
    };
  };
  mapelColumns: TemplateMapelItem[];
  santriList: TemplateSantriItem[];
}

export async function generateTemplateNilaiBuffer({
  marhalah,
  semester,
  mapelColumns,
  santriList,
}: GenerateTemplateNilaiOptions): Promise<ArrayBuffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Sistem EHB & Raport KHZM";
  workbook.created = new Date();

  // ----------------------------------------------------------------------------
  // SHEET 1: Lembar Pengisian Nilai
  // ----------------------------------------------------------------------------
  const sheet = workbook.addWorksheet("Lembar Nilai");

  // Siapkan struktur kolom:
  // 1: ID Pendaftaran (teknis, untuk pencocokan)
  // 2: NIS
  // 3: Nama Santri
  // 4: Jenis Kelamin
  // 5..(4 + N): Mapel-mapel
  // Kepribadian: Akhlak, Ketekunan, Kerapihan, Kebersihan
  // Presensi: Sakit, Izin, Alpa
  const excelColumns: Partial<ExcelJS.Column>[] = [
    { header: "ID Pendaftaran", key: "enrollment_id", width: 38 },
    { header: "NIS", key: "nis", width: 16 },
    { header: "Nama Lengkap Santri", key: "nama", width: 32 },
    { header: "JK", key: "jk", width: 8 },
  ];

  // Tambahkan kolom mapel
  mapelColumns.forEach((m) => {
    const mapelName = m.mapel?.nama ?? `Mapel ${m.urutan}`;
    const kitabName = m.kitab?.nama ? ` (${m.kitab.nama})` : "";
    excelColumns.push({
      header: `[${m.urutan}] ${mapelName}${kitabName}`,
      key: `mm_${m.id}`,
      width: 22,
    });
  });

  // Tambahkan kolom kepribadian
  excelColumns.push(
    { header: "Akhlak", key: "akhlak", width: 16 },
    { header: "Ketekunan", key: "ketekunan", width: 16 },
    { header: "Kerapihan", key: "kerapihan", width: 16 },
    { header: "Kebersihan", key: "kebersihan", width: 16 }
  );

  // Tambahkan kolom presensi
  excelColumns.push(
    { header: "Sakit", key: "sakit", width: 10 },
    { header: "Izin", key: "izin", width: 10 },
    { header: "Alpa", key: "alpa", width: 10 }
  );

  sheet.columns = excelColumns;

  // Baris 1: Header Label
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF166534" }, // Primary green #166534
  };
  headerRow.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
  headerRow.height = 28;

  // Baris 2: Header Kunci Teknis Sistem
  const technicalKeys = excelColumns.map((col) => col.key as string);
  const techRow = sheet.addRow(technicalKeys);
  techRow.font = { italic: true, size: 8, color: { argb: "FF6B7280" } };
  techRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFF3F4F6" },
  };
  techRow.alignment = { vertical: "middle", horizontal: "center" };
  techRow.height = 18;

  // Masukkan Baris Santri
  santriList.forEach((s) => {
    const rowObj: Record<string, unknown> = {
      enrollment_id: s.enrollment_id,
      nis: s.nis ?? "-",
      nama: s.nama,
      jk: s.jenis_kelamin,
    };

    // Nilai mapel jika sudah ada
    mapelColumns.forEach((m) => {
      const val = s.nilaiMap?.[m.id];
      rowObj[`mm_${m.id}`] = val !== undefined && val !== null ? val : "";
    });

    // Catatan kepribadian
    rowObj["akhlak"] = s.catatan?.akhlak ?? "";
    rowObj["ketekunan"] = s.catatan?.ketekunan ?? "";
    rowObj["kerapihan"] = s.catatan?.kerapihan ?? "";
    rowObj["kebersihan"] = s.catatan?.kebersihan ?? "";

    // Presensi
    rowObj["sakit"] = s.catatan?.sakit !== undefined ? s.catatan.sakit : 0;
    rowObj["izin"] = s.catatan?.izin !== undefined ? s.catatan.izin : 0;
    rowObj["alpa"] = s.catatan?.alpa !== undefined ? s.catatan.alpa : 0;

    const dataRow = sheet.addRow(rowObj);
    dataRow.height = 20;

    // Formatting per baris
    dataRow.getCell("enrollment_id").alignment = { vertical: "middle", horizontal: "center" };
    dataRow.getCell("nis").alignment = { vertical: "middle", horizontal: "center" };
    dataRow.getCell("nama").alignment = { vertical: "middle", horizontal: "left" };
    dataRow.getCell("jk").alignment = { vertical: "middle", horizontal: "center" };

    mapelColumns.forEach((m) => {
      dataRow.getCell(`mm_${m.id}`).alignment = { vertical: "middle", horizontal: "center" };
    });

    dataRow.getCell("akhlak").alignment = { vertical: "middle", horizontal: "center" };
    dataRow.getCell("ketekunan").alignment = { vertical: "middle", horizontal: "center" };
    dataRow.getCell("kerapihan").alignment = { vertical: "middle", horizontal: "center" };
    dataRow.getCell("kebersihan").alignment = { vertical: "middle", horizontal: "center" };
    dataRow.getCell("sakit").alignment = { vertical: "middle", horizontal: "center" };
    dataRow.getCell("izin").alignment = { vertical: "middle", horizontal: "center" };
    dataRow.getCell("alpa").alignment = { vertical: "middle", horizontal: "center" };
  });

  // Validasi Data Dropdown untuk Kolom Kepribadian di Excel
  const lastRowIdx = santriList.length + 2;
  if (santriList.length > 0) {
    ["akhlak", "ketekunan", "kerapihan", "kebersihan"].forEach((field) => {
      const col = sheet.getColumn(field);
      if (col.number) {
        for (let r = 3; r <= lastRowIdx; r++) {
          const cell = sheet.getCell(r, col.number);
          cell.dataValidation = {
            type: "list",
            allowBlank: true,
            formulae: ['"Sangat Baik,Baik,Cukup,Kurang"'],
            showErrorMessage: true,
            errorTitle: "Predikat Tidak Valid",
            error: "Pilih salah satu dari: Sangat Baik, Baik, Cukup, Kurang",
          };
        }
      }
    });
  }

  // ----------------------------------------------------------------------------
  // SHEET 2: Petunjuk Pengisian
  // ----------------------------------------------------------------------------
  const infoSheet = workbook.addWorksheet("Petunjuk Pengisian");
  infoSheet.columns = [
    { header: "No", key: "no", width: 6 },
    { header: "Informasi / Ketentuan", key: "info", width: 40 },
    { header: "Keterangan", key: "ket", width: 50 },
  ];

  const infoHeader = infoSheet.getRow(1);
  infoHeader.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
  infoHeader.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1F2937" },
  };
  infoHeader.alignment = { vertical: "middle", horizontal: "center" };
  infoHeader.height = 24;

  infoSheet.addRow({
    no: 1,
    info: "Marhalah (Kelas)",
    ket: `${marhalah.nama} (${marhalah.kode})`,
  });
  infoSheet.addRow({
    no: 2,
    info: "Semester & Tahun Ajaran",
    ket: `Semester ${semester.jenis} — Tahun Ajaran ${semester.tahun_ajaran?.nama ?? "-"}`,
  });
  infoSheet.addRow({
    no: 3,
    info: "Kolom ID Pendaftaran",
    ket: "DILARANG mengubah atau menghapus nilai di kolom ID Pendaftaran (Enrollment ID).",
  });
  infoSheet.addRow({
    no: 4,
    info: "Format Nilai Mata Pelajaran",
    ket: "Masukkan angka bulat antara 0 sampai 100. Kosongkan jika santri belum memiliki nilai.",
  });
  infoSheet.addRow({
    no: 5,
    info: "Format Catatan Kepribadian",
    ket: "Pilih atau ketik persis salah satu predikat: 'Sangat Baik', 'Baik', 'Cukup', 'Kurang'.",
  });
  infoSheet.addRow({
    no: 6,
    info: "Format Presensi Kehadiran",
    ket: "Isi kolom Sakit, Izin, dan Alpa dengan angka bulat non-negatif (0, 1, 2, ...).",
  });
  infoSheet.addRow({
    no: 7,
    info: "Kewenangan Pengisian",
    ket: "Guru Pengampu hanya diperbolehkan mengimpor nilai mapel yang diampu. Nilai mapel lain otomatis ditolak sistem.",
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return buffer as ArrayBuffer;
}

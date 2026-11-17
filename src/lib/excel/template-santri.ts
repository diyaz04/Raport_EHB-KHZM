import ExcelJS from "exceljs";

export interface MarhalahRef {
  nama: string;
  kode: string;
}

export async function generateTemplateSantriBuffer(marhalahList: MarhalahRef[]): Promise<ArrayBuffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Sistem EHB & Raport KHZM";
  workbook.created = new Date();

  // SHEET 1: Data Santri
  const sheet = workbook.addWorksheet("Data Santri");

  // Definisi Kolom
  sheet.columns = [
    { header: "NIS", key: "nis", width: 16 },
    { header: "Nama Lengkap Santri", key: "nama", width: 32 },
    { header: "Kode / Nama Marhalah", key: "marhalah", width: 24 },
    { header: "Jenis Kelamin (L/P)", key: "jk", width: 20 },
  ];

  // Styling Header
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF166534" }, // Primary green
  };
  headerRow.alignment = { vertical: "middle", horizontal: "center" };
  headerRow.height = 24;

  // Baris Contoh (Sample rows)
  const sampleMarhalah1 = marhalahList[0]?.kode ?? "1A";
  const sampleMarhalah2 = marhalahList[1]?.kode ?? marhalahList[0]?.kode ?? "1B";

  sheet.addRow({
    nis: "202501001",
    nama: "Ahmad Fauzi",
    marhalah: sampleMarhalah1,
    jk: "L",
  });
  sheet.addRow({
    nis: "202501002",
    nama: "Fatimah Zahra",
    marhalah: sampleMarhalah2,
    jk: "P",
  });

  // Center alignment untuk kolom NIS, Marhalah, dan JK
  sheet.getColumn("nis").alignment = { vertical: "middle", horizontal: "center" };
  sheet.getColumn("marhalah").alignment = { vertical: "middle", horizontal: "center" };
  sheet.getColumn("jk").alignment = { vertical: "middle", horizontal: "center" };
  sheet.getColumn("nama").alignment = { vertical: "middle", horizontal: "left" };

  // SHEET 2: Petunjuk & Daftar Marhalah yang Valid
  const refSheet = workbook.addWorksheet("Petunjuk & Daftar Marhalah");
  refSheet.columns = [
    { header: "No", key: "no", width: 6 },
    { header: "Kode Marhalah", key: "kode", width: 18 },
    { header: "Nama Marhalah", key: "nama", width: 32 },
  ];

  const refHeader = refSheet.getRow(1);
  refHeader.font = { bold: true, color: { argb: "FFFFFFFF" } };
  refHeader.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1F2937" },
  };
  refHeader.alignment = { vertical: "middle", horizontal: "center" };
  refHeader.height = 24;

  marhalahList.forEach((m, idx) => {
    refSheet.addRow({
      no: idx + 1,
      kode: m.kode,
      nama: m.nama,
    });
  });

  // Petunjuk Tambahan
  refSheet.addRow({});
  const noteRow = refSheet.addRow({
    no: "*",
    kode: "PETUNJUK:",
    nama: "Isi kolom 'Kode / Nama Marhalah' di Sheet 1 dengan Kode Marhalah (contoh: 1A, 2A) atau Nama Marhalah persis seperti tabel di atas.",
  });
  noteRow.font = { italic: true, color: { argb: "FF4B5563" } };

  const buffer = await workbook.xlsx.writeBuffer();
  return buffer as ArrayBuffer;
}

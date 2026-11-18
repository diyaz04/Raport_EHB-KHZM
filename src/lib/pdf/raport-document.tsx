/* eslint-disable jsx-a11y/alt-text */
import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";
import fs from "fs";
import path from "path";
import { terbilangId } from "./terbilang";

// ==============================================================================
// REGISTRASI FONT CARLITO (BILA ADA DI public/fonts/) ATAU FALLBACK HELVETICA
// ==============================================================================
let activeFontFamily = "Helvetica";

try {
  const fontsDir = path.join(process.cwd(), "public", "fonts");
  const carlitoRegular = path.join(fontsDir, "Carlito-Regular.ttf");
  const carlitoBold = path.join(fontsDir, "Carlito-Bold.ttf");
  const carlitoItalic = path.join(fontsDir, "Carlito-Italic.ttf");
  const carlitoBoldItalic = path.join(fontsDir, "Carlito-BoldItalic.ttf");

  if (fs.existsSync(carlitoRegular)) {
    Font.register({
      family: "Carlito",
      fonts: [
        { src: carlitoRegular },
        ...(fs.existsSync(carlitoBold) ? [{ src: carlitoBold, fontWeight: "bold" as const }] : []),
        ...(fs.existsSync(carlitoItalic) ? [{ src: carlitoItalic, fontStyle: "italic" as const }] : []),
        ...(fs.existsSync(carlitoBoldItalic)
          ? [{ src: carlitoBoldItalic, fontWeight: "bold" as const, fontStyle: "italic" as const }]
          : []),
      ],
    });
    activeFontFamily = "Carlito";
  }
} catch {
  activeFontFamily = "Helvetica";
}

// ==============================================================================
// STYLESHEET RESMI RAPORT PESANTREN KH ZUMRATUL MUTTAQIN
// ==============================================================================
const styles = StyleSheet.create({
  page: {
    fontFamily: activeFontFamily,
    fontSize: 8,
    paddingHorizontal: 32,
    paddingTop: 24,
    paddingBottom: 22,
    color: "#000000",
    backgroundColor: "#ffffff",
    position: "relative",
  },
  watermark: {
    position: "absolute",
    top: 320,
    left: 80,
    fontSize: 68,
    color: "#ef4444",
    opacity: 0.1,
    transform: "rotate(-35deg)",
    fontWeight: "bold",
  },

  // 1. KOP SURAT
  kopContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  logo: {
    width: 48,
    height: 48,
    objectFit: "contain",
    marginRight: 10,
  },
  logoPlaceholder: {
    width: 48,
    height: 48,
    backgroundColor: "#e5e7eb",
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  kopTextContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  kopLembagaAtas: {
    fontSize: 9.5,
    fontWeight: "normal",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    textAlign: "center",
    color: "#000000",
  },
  kopNamaLembaga: {
    fontSize: 17,
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    textAlign: "center",
    color: "#000000",
    marginVertical: 1,
  },
  kopAlamat: {
    fontSize: 8.5,
    fontWeight: "normal",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    textAlign: "center",
    color: "#000000",
  },
  kopDivider: {
    borderBottomWidth: 1.5,
    borderBottomColor: "#000000",
    marginTop: 5,
    marginBottom: 6,
  },

  // 2. INFORMASI SANTRI & SEMESTER
  infoContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
    fontSize: 8,
    lineHeight: 1.35,
  },
  infoCol: {
    width: "48%",
  },
  infoRow: {
    flexDirection: "row",
    marginBottom: 1,
  },
  infoLabelLeft: {
    width: 55,
    color: "#000000",
  },
  infoLabelRight: {
    width: 70,
    color: "#000000",
  },
  infoColon: {
    width: 10,
    textAlign: "center",
  },
  infoValue: {
    flex: 1,
    fontWeight: "bold",
    color: "#000000",
  },
  infoDivider: {
    borderBottomWidth: 1.5,
    borderBottomColor: "#000000",
    marginBottom: 6,
  },

  // 3. JUDUL DOKUMEN
  judulDoc: {
    fontSize: 10,
    fontWeight: "bold",
    textAlign: "center",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
  },

  // 4. TABEL NILAI RESMI (12 BARIS)
  table: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#000000",
  },
  tableHeaderWrapper: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#000000",
    height: 26,
    fontWeight: "bold",
    fontSize: 7.5,
    backgroundColor: "#ffffff",
  },
  colHeaderNo: {
    width: "6%",
    height: "100%",
    borderRightWidth: 1,
    borderRightColor: "#000000",
    justifyContent: "center",
    alignItems: "center",
  },
  colHeaderMapel: {
    width: "28%",
    height: "100%",
    borderRightWidth: 1,
    borderRightColor: "#000000",
    justifyContent: "center",
    alignItems: "center",
  },
  colHeaderKitab: {
    width: "30%",
    height: "100%",
    borderRightWidth: 1,
    borderRightColor: "#000000",
    justifyContent: "center",
    alignItems: "center",
  },
  colHeaderNilaiGroup: {
    width: "36%",
    height: "100%",
    flexDirection: "column",
  },
  colHeaderNilaiTop: {
    height: 13,
    borderBottomWidth: 1,
    borderBottomColor: "#000000",
    justifyContent: "center",
    alignItems: "center",
  },
  colHeaderNilaiBottomRow: {
    height: 13,
    flexDirection: "row",
  },
  colHeaderSubAngka: {
    width: "27.777%",
    height: "100%",
    borderRightWidth: 1,
    borderRightColor: "#000000",
    justifyContent: "center",
    alignItems: "center",
  },
  colHeaderSubHuruf: {
    width: "44.444%",
    height: "100%",
    borderRightWidth: 1,
    borderRightColor: "#000000",
    justifyContent: "center",
    alignItems: "center",
  },
  colHeaderSubRataRata: {
    width: "27.777%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },

  // Baris Data Nilai
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#000000",
    height: 14,
    fontSize: 7.5,
  },
  cellNo: {
    width: "6%",
    height: "100%",
    borderRightWidth: 1,
    borderRightColor: "#000000",
    justifyContent: "center",
    alignItems: "center",
  },
  cellMapel: {
    width: "28%",
    height: "100%",
    borderRightWidth: 1,
    borderRightColor: "#000000",
    justifyContent: "center",
    paddingLeft: 4,
    paddingRight: 2,
  },
  cellKitab: {
    width: "30%",
    height: "100%",
    borderRightWidth: 1,
    borderRightColor: "#000000",
    justifyContent: "center",
    paddingLeft: 4,
    paddingRight: 2,
  },
  cellAngka: {
    width: "10%",
    height: "100%",
    borderRightWidth: 1,
    borderRightColor: "#000000",
    justifyContent: "center",
    alignItems: "center",
  },
  cellHuruf: {
    width: "16%",
    height: "100%",
    borderRightWidth: 1,
    borderRightColor: "#000000",
    justifyContent: "center",
    paddingLeft: 4,
    paddingRight: 2,
  },
  cellRataRata: {
    width: "10%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },

  // Baris Total & Rata-Rata
  tableRowSummary: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#000000",
    height: 14,
    fontWeight: "bold",
    fontSize: 7.5,
  },
  cellSummaryLabel: {
    width: "64%",
    height: "100%",
    borderRightWidth: 1,
    borderRightColor: "#000000",
    justifyContent: "center",
    alignItems: "center",
  },
  cellSummaryVal: {
    width: "10%",
    height: "100%",
    borderRightWidth: 1,
    borderRightColor: "#000000",
    justifyContent: "center",
    alignItems: "center",
  },
  cellSummaryEmpty: {
    width: "26%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },

  // 5. BANNER PERINGKAT
  rankBanner: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#000000",
    height: 16,
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 4,
  },
  rankText: {
    fontSize: 8,
    fontWeight: "bold",
  },

  // 6. CATATAN AKHIR SEMESTER
  catatanTitle: {
    fontSize: 7.5,
    fontWeight: "bold",
    textTransform: "uppercase",
    marginBottom: 2,
  },
  catatanGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  catatanColLeft: {
    width: "48.5%",
  },
  catatanColRight: {
    width: "48.5%",
  },

  // Tabel Kepribadian & Ketidakhadiran
  catatanTable: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#000000",
  },
  catatanTableHeader: {
    flexDirection: "row",
    height: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#000000",
    fontWeight: "bold",
    fontSize: 7.5,
  },
  catatanHeaderCellDesc: {
    width: "60%",
    height: "100%",
    borderRightWidth: 1,
    borderRightColor: "#000000",
    justifyContent: "center",
    alignItems: "center",
  },
  catatanHeaderCellVal: {
    width: "40%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  catatanTableRow: {
    flexDirection: "row",
    height: 13,
    borderBottomWidth: 1,
    borderBottomColor: "#000000",
    fontSize: 7,
  },
  catatanCellDesc: {
    width: "60%",
    height: "100%",
    borderRightWidth: 1,
    borderRightColor: "#000000",
    justifyContent: "center",
    paddingLeft: 4,
  },
  catatanCellVal: {
    width: "40%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },

  // Naik Ke Marhalah
  naikMarhalahBox: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#000000",
    height: 25,
    padding: 3,
    marginTop: 4,
    justifyContent: "flex-start",
  },
  naikMarhalahTitle: {
    fontSize: 7.5,
    fontWeight: "bold",
  },
  naikMarhalahVal: {
    fontSize: 7.5,
    fontWeight: "bold",
    paddingLeft: 6,
    marginTop: 1,
  },

  // Saran Wali Kelas
  saranBox: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#000000",
    height: 67, // Selaras dengan tabel kepribadian (13.5 + 4*13 = 65.5 ~ 67)
    flexDirection: "column",
  },
  saranHeader: {
    height: 13.5,
    borderBottomWidth: 1,
    borderBottomColor: "#000000",
    justifyContent: "center",
    alignItems: "center",
    fontWeight: "bold",
    fontSize: 7.5,
  },
  saranBody: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 8,
  },
  saranContent: {
    textAlign: "center",
    fontStyle: "italic",
    fontSize: 7,
    lineHeight: 1.25,
  },

  // Tanggapan Orang Tua/Wali
  tanggapanBox: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#000000",
    height: 54, // Selaras dengan tabel ketidakhadiran (13.5 + 3*13 = 52.5 ~ 54)
    flexDirection: "column",
    marginTop: 4,
  },
  tanggapanHeader: {
    height: 13.5,
    borderBottomWidth: 1,
    borderBottomColor: "#000000",
    justifyContent: "center",
    alignItems: "center",
    fontWeight: "bold",
    fontSize: 7.5,
  },
  tanggapanBody: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  tanggapanLine: {
    borderBottomWidth: 0.8,
    borderBottomColor: "#9ca3af",
    marginTop: 11,
    height: 1,
  },

  // 7. TITIMANGSA, QR CODE & TANDA TANGAN
  bottomSection: {
    marginTop: 6,
    width: "100%",
  },
  titimangsaQrRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  qrBlock: {
    flexDirection: "row",
    alignItems: "center",
  },
  qrImage: {
    width: 44,
    height: 44,
  },
  qrPlaceholder: {
    width: 44,
    height: 44,
    borderWidth: 0.8,
    borderColor: "#9ca3af",
    justifyContent: "center",
    alignItems: "center",
  },
  qrMeta: {
    marginLeft: 6,
    justifyContent: "center",
  },
  qrTitle: {
    fontSize: 6.5,
    fontWeight: "bold",
    color: "#000000",
  },
  qrSubtitle: {
    fontSize: 5.5,
    color: "#4b5563",
    marginTop: 0.5,
  },
  qrCode: {
    fontSize: 5.5,
    fontWeight: "bold",
    color: "#000000",
    marginTop: 0.5,
  },
  titimangsaTextContainer: {
    alignItems: "flex-end",
  },
  titimangsaText: {
    fontSize: 7.5,
    textAlign: "right",
    lineHeight: 1.3,
  },

  // Tiga Kolom Tanda Tangan
  ttdContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginTop: 2,
  },
  ttdColLeft: {
    width: "30%",
    alignItems: "center",
  },
  ttdColMid: {
    width: "36%",
    alignItems: "center",
  },
  ttdColRight: {
    width: "34%",
    alignItems: "center",
  },
  ttdTitle: {
    fontSize: 7.5,
    textAlign: "center",
  },
  ttdSpace: {
    height: 42,
    justifyContent: "center",
    alignItems: "center",
  },
  ttdSignatureImg: {
    width: 60,
    height: 40,
    objectFit: "contain",
  },
  ttdLine: {
    borderBottomWidth: 0.8,
    borderBottomColor: "#000000",
    width: 90,
  },
  ttdNama: {
    fontSize: 7.5,
    fontWeight: "bold",
    textAlign: "center",
  },
});

// ==============================================================================
// INTERFACES DATA RAPORT SANTRI
// ==============================================================================
export interface RaportSubjectData {
  urutan: number;
  nama: string;
  kitab: string;
  nilai: number | null;
  huruf?: string;
  rataRata?: string;
}

export interface RaportStudentData {
  santriId: string;
  nama: string;
  nis: string | null;
  marhalah: string;
  tahunAjaran: string;
  semester: string;
  waliKelas: string;
  pimpinanNama: string;
  tempatTerbit: string;
  tanggalTerbit: string;
  isDraft: boolean;
  qrDataUrl?: string | null;
  kodeVerifikasi?: string | null;
  ranking?: number | null;
  totalSantri?: number;
  totalNilai?: number | null;
  rataRata?: number | null;
  mapelList: RaportSubjectData[];
  catatan?: {
    akhlak: string | null;
    ketekunan: string | null;
    kerapihan: string | null;
    kebersihan: string | null;
    sakit: number;
    izin: number;
    alpa: number;
    saran_wali_kelas: string | null;
    naik_ke_marhalah?: string | null;
  };
  logoPath?: string | null;
}

interface RaportDocumentProps {
  students: RaportStudentData[];
  logoBase64?: string | null;
  ttdPimpinanBase64?: string | null;
}

// ==============================================================================
// KOMPONEN RAPORT DOCUMENT (@react-pdf/renderer)
// ==============================================================================
export function RaportDocument({
  students,
  logoBase64,
  ttdPimpinanBase64,
}: RaportDocumentProps) {
  return (
    <Document title="Laporan Hasil Belajar - Pondok Pesantren KH Zumratul Muttaqin">
      {students.map((student, studentIdx) => {
        // Susun 12 baris tabel: Isi dengan mapel, sisanya diisi strip '-'
        const tableRows: Array<{
          no: number;
          mapel: string;
          kitab: string;
          nilai: string;
          huruf: string;
          rataRata: string;
        }> = [];

        const mapelItems = student.mapelList || [];
        for (let i = 0; i < 12; i++) {
          if (i < mapelItems.length) {
            const m = mapelItems[i];
            const nilaiStr =
              m.nilai !== null && m.nilai !== undefined ? String(m.nilai) : "-";
            const hurufStr =
              m.huruf ||
              (m.nilai !== null && m.nilai !== undefined
                ? terbilangId(m.nilai)
                : "-");
            const rataRataStr = m.rataRata || "-";

            tableRows.push({
              no: i + 1,
              mapel: m.nama || "-",
              kitab: m.kitab || "-",
              nilai: nilaiStr,
              huruf: hurufStr,
              rataRata: rataRataStr,
            });
          } else {
            // Baris kosong terisi strip '-'
            tableRows.push({
              no: i + 1,
              mapel: "-",
              kitab: "-",
              nilai: "-",
              huruf: "-",
              rataRata: "-",
            });
          }
        }

        const formattedTotal =
          student.totalNilai !== null && student.totalNilai !== undefined
            ? String(student.totalNilai)
            : "-";

        const formattedRataRata =
          student.rataRata !== null && student.rataRata !== undefined
            ? String(Math.round(student.rataRata))
            : "-";

        const rankText =
          student.ranking && student.totalSantri
            ? `Peringkat Ke- ${student.ranking} dari ${student.totalSantri} Santri`
            : student.ranking
            ? `Peringkat Ke- ${student.ranking}`
            : "-";

        return (
          <Page
            key={student.santriId || studentIdx}
            size="A4"
            orientation="portrait"
            style={styles.page}
          >
            {/* Watermark DRAFT bila belum final */}
            {student.isDraft && <Text style={styles.watermark}>DRAFT</Text>}

            {/* 1. KOP SURAT PESANTREN + LOGO */}
            <View style={styles.kopContainer}>
              {logoBase64 ? (
                <Image src={logoBase64} style={styles.logo} />
              ) : (
                <View style={styles.logoPlaceholder}>
                  <Text style={{ fontSize: 8, fontWeight: "bold" }}>KHZM</Text>
                </View>
              )}
              <View style={styles.kopTextContainer}>
                <Text style={styles.kopLembagaAtas}>
                  LEMBAGA PENDIDIKAN PONDOK PESANTREN
                </Text>
                <Text style={styles.kopNamaLembaga}>KH ZUMRATUL MUTTAQIN</Text>
                <Text style={styles.kopAlamat}>
                  SUKARAME TASIKMALAYA JAWA BARAT
                </Text>
              </View>
            </View>

            <View style={styles.kopDivider} />

            {/* 2. INFORMASI SANTRI & SEMESTER */}
            <View style={styles.infoContainer}>
              <View style={styles.infoCol}>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabelLeft}>Nama</Text>
                  <Text style={styles.infoColon}>:</Text>
                  <Text style={styles.infoValue}>{student.nama}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabelLeft}>Marhalah</Text>
                  <Text style={styles.infoColon}>:</Text>
                  <Text style={styles.infoValue}>{student.marhalah}</Text>
                </View>
              </View>

              <View style={styles.infoCol}>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabelRight}>Tahun Ajaran</Text>
                  <Text style={styles.infoColon}>:</Text>
                  <Text style={styles.infoValue}>{student.tahunAjaran}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabelRight}>Semester</Text>
                  <Text style={styles.infoColon}>:</Text>
                  <Text style={styles.infoValue}>{student.semester}</Text>
                </View>
              </View>
            </View>

            <View style={styles.infoDivider} />

            {/* 3. JUDUL LAPORAN */}
            <Text style={styles.judulDoc}>LAPORAN HASIIL BELAJAR</Text>

            {/* 4. TABEL NILAI 12 BARIS */}
            <View style={styles.table}>
              {/* Header 2 Tingkat */}
              <View style={styles.tableHeaderWrapper}>
                <View style={styles.colHeaderNo}>
                  <Text>NO</Text>
                </View>
                <View style={styles.colHeaderMapel}>
                  <Text>MATA PELAJARAN</Text>
                </View>
                <View style={styles.colHeaderKitab}>
                  <Text>NAMA KITAB</Text>
                </View>
                <View style={styles.colHeaderNilaiGroup}>
                  <View style={styles.colHeaderNilaiTop}>
                    <Text>NILAI</Text>
                  </View>
                  <View style={styles.colHeaderNilaiBottomRow}>
                    <View style={styles.colHeaderSubAngka}>
                      <Text>Angka</Text>
                    </View>
                    <View style={styles.colHeaderSubHuruf}>
                      <Text>Huruf</Text>
                    </View>
                    <View style={styles.colHeaderSubRataRata}>
                      <Text>Rata-rata</Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* 12 Data Rows */}
              {tableRows.map((row) => (
                <View key={row.no} style={styles.tableRow}>
                  <View style={styles.cellNo}>
                    <Text>{row.no}</Text>
                  </View>
                  <View style={styles.cellMapel}>
                    <Text>{row.mapel}</Text>
                  </View>
                  <View style={styles.cellKitab}>
                    <Text>{row.kitab}</Text>
                  </View>
                  <View style={styles.cellAngka}>
                    <Text>{row.nilai}</Text>
                  </View>
                  <View style={styles.cellHuruf}>
                    <Text
                      style={{
                        fontStyle: row.nilai !== "-" ? "italic" : "normal",
                      }}
                    >
                      {row.huruf}
                    </Text>
                  </View>
                  <View style={styles.cellRataRata}>
                    <Text>{row.rataRata}</Text>
                  </View>
                </View>
              ))}

              {/* Baris Jumlah Nilai */}
              <View style={styles.tableRowSummary}>
                <View style={styles.cellSummaryLabel}>
                  <Text>Jumlah Nilai</Text>
                </View>
                <View style={styles.cellSummaryVal}>
                  <Text>{formattedTotal}</Text>
                </View>
                <View style={styles.cellSummaryEmpty} />
              </View>

              {/* Baris Nilai Rata-Rata */}
              <View
                style={[styles.tableRowSummary, { borderBottomWidth: 0 }]}
              >
                <View style={styles.cellSummaryLabel}>
                  <Text>Nilai Rata-Rata</Text>
                </View>
                <View style={styles.cellSummaryVal}>
                  <Text>{formattedRataRata}</Text>
                </View>
                <View style={styles.cellSummaryEmpty} />
              </View>
            </View>

            {/* 5. PERINGKAT BANNER */}
            <View style={styles.rankBanner}>
              <Text style={styles.rankText}>{rankText}</Text>
            </View>

            {/* 6. CATATAN AKHIR SEMESTER (2 KOLOM) */}
            <Text style={styles.catatanTitle}>CATATAN AKHIR SEMESTER</Text>
            <View style={styles.catatanGrid}>
              {/* Kolom Kiri: Kepribadian, Ketidakhadiran, Naik Marhalah */}
              <View style={styles.catatanColLeft}>
                {/* Tabel Kepribadian */}
                <View style={styles.catatanTable}>
                  <View style={styles.catatanTableHeader}>
                    <View style={styles.catatanHeaderCellDesc}>
                      <Text>Kepribadian</Text>
                    </View>
                    <View style={styles.catatanHeaderCellVal}>
                      <Text>Predikat</Text>
                    </View>
                  </View>
                  <View style={styles.catatanTableRow}>
                    <View style={styles.catatanCellDesc}>
                      <Text>1 Akhlak/ Budi Pekerti</Text>
                    </View>
                    <View style={styles.catatanCellVal}>
                      <Text>{student.catatan?.akhlak || ""}</Text>
                    </View>
                  </View>
                  <View style={styles.catatanTableRow}>
                    <View style={styles.catatanCellDesc}>
                      <Text>2 Ketekunan</Text>
                    </View>
                    <View style={styles.catatanCellVal}>
                      <Text>{student.catatan?.ketekunan || ""}</Text>
                    </View>
                  </View>
                  <View style={styles.catatanTableRow}>
                    <View style={styles.catatanCellDesc}>
                      <Text>3 Kerapihan</Text>
                    </View>
                    <View style={styles.catatanCellVal}>
                      <Text>{student.catatan?.kerapihan || ""}</Text>
                    </View>
                  </View>
                  <View
                    style={[
                      styles.catatanTableRow,
                      { borderBottomWidth: 0 },
                    ]}
                  >
                    <View style={styles.catatanCellDesc}>
                      <Text>4 Kebersihan</Text>
                    </View>
                    <View style={styles.catatanCellVal}>
                      <Text>{student.catatan?.kebersihan || ""}</Text>
                    </View>
                  </View>
                </View>

                {/* Tabel Ketidakhadiran */}
                <View style={[styles.catatanTable, { marginTop: 4 }]}>
                  <View style={styles.catatanTableHeader}>
                    <View style={styles.catatanHeaderCellDesc}>
                      <Text>Ketidakhadiran</Text>
                    </View>
                    <View style={styles.catatanHeaderCellVal}>
                      <Text>Jumlah</Text>
                    </View>
                  </View>
                  <View style={styles.catatanTableRow}>
                    <View style={styles.catatanCellDesc}>
                      <Text>1 Sakit</Text>
                    </View>
                    <View style={styles.catatanCellVal}>
                      <Text>
                        {student.catatan?.sakit ? `${student.catatan.sakit}` : ""}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.catatanTableRow}>
                    <View style={styles.catatanCellDesc}>
                      <Text>2 Izin</Text>
                    </View>
                    <View style={styles.catatanCellVal}>
                      <Text>
                        {student.catatan?.izin ? `${student.catatan.izin}` : ""}
                      </Text>
                    </View>
                  </View>
                  <View
                    style={[
                      styles.catatanTableRow,
                      { borderBottomWidth: 0 },
                    ]}
                  >
                    <View style={styles.catatanCellDesc}>
                      <Text>3 Alpa</Text>
                    </View>
                    <View style={styles.catatanCellVal}>
                      <Text>
                        {student.catatan?.alpa ? `${student.catatan.alpa}` : ""}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Box Naik Ke Marhalah */}
                <View style={styles.naikMarhalahBox}>
                  <Text style={styles.naikMarhalahTitle}>
                    Naik Ke Marhalah:
                  </Text>
                  <Text style={styles.naikMarhalahVal}>
                    {student.catatan?.naik_ke_marhalah || ""}
                  </Text>
                </View>
              </View>

              {/* Kolom Kanan: Saran Wali Kelas & Tanggapan Orang Tua */}
              <View style={styles.catatanColRight}>
                {/* Saran Wali Kelas */}
                <View style={styles.saranBox}>
                  <View style={styles.saranHeader}>
                    <Text>Saran Wali Kelas</Text>
                  </View>
                  <View style={styles.saranBody}>
                    <Text style={styles.saranContent}>
                      {student.catatan?.saran_wali_kelas ||
                        "Pertahankan Prestasi dan Tingkatkan lagi Semangat Belajarmu!"}
                    </Text>
                  </View>
                </View>

                {/* Tanggapan Orang Tua/Wali */}
                <View style={styles.tanggapanBox}>
                  <View style={styles.tanggapanHeader}>
                    <Text>Tanggapan Orang Tua/Wali</Text>
                  </View>
                  <View style={styles.tanggapanBody}>
                    <View style={styles.tanggapanLine} />
                    <View style={styles.tanggapanLine} />
                  </View>
                </View>
              </View>
            </View>

            {/* 7. TITIMANGSA, QR CODE & TANDA TANGAN */}
            <View style={styles.bottomSection}>
              {/* Row Atas: QR Code Validasi di Kiri + Titimangsa di Kanan */}
              <View style={styles.titimangsaQrRow}>
                {/* QR Code Digital Official */}
                <View style={styles.qrBlock}>
                  {student.qrDataUrl ? (
                    <Image src={student.qrDataUrl} style={styles.qrImage} />
                  ) : (
                    <View style={styles.qrPlaceholder}>
                      <Text style={{ fontSize: 5, color: "#6b7280" }}>
                        QR VERIFIKASI
                      </Text>
                    </View>
                  )}
                  <View style={styles.qrMeta}>
                    <Text style={styles.qrTitle}>Validasi Rapor Digital</Text>
                    <Text style={styles.qrSubtitle}>
                      Pindai QR untuk memeriksa keaslian
                    </Text>
                    {student.kodeVerifikasi && (
                      <Text style={styles.qrCode}>
                        ID: {student.kodeVerifikasi}
                      </Text>
                    )}
                  </View>
                </View>

                {/* Titimangsa */}
                <View style={styles.titimangsaTextContainer}>
                  <Text style={styles.titimangsaText}>
                    Diberikan di {student.tempatTerbit || "Sukamenak"}
                  </Text>
                  <Text style={styles.titimangsaText}>
                    Pada tanggal: {student.tanggalTerbit || "20 Desember 2025"}
                  </Text>
                </View>
              </View>

              {/* Row Bawah: 3 Kolom Tanda Tangan */}
              <View style={styles.ttdContainer}>
                {/* Kolom 1: Orang Tua / Wali */}
                <View style={styles.ttdColLeft}>
                  <Text style={styles.ttdTitle}>Orang Tua/Wali</Text>
                  <View style={styles.ttdSpace} />
                  <View style={styles.ttdLine} />
                </View>

                {/* Kolom 2: Wali Kelas */}
                <View style={styles.ttdColMid}>
                  <Text style={styles.ttdTitle}>Wali Kelas,</Text>
                  <View style={styles.ttdSpace} />
                  <Text style={styles.ttdNama}>
                    {student.waliKelas || "SINAR KHOTIMATUL HUSNA, S.Pd"}
                  </Text>
                </View>

                {/* Kolom 3: Pimpinan Pesantren */}
                <View style={styles.ttdColRight}>
                  <Text style={styles.ttdTitle}>Pimpinan Pesantren,</Text>
                  <View style={styles.ttdSpace}>
                    {ttdPimpinanBase64 ? (
                      <Image
                        src={ttdPimpinanBase64}
                        style={styles.ttdSignatureImg}
                      />
                    ) : null}
                  </View>
                  <Text style={styles.ttdNama}>
                    {student.pimpinanNama || "KH. MIMIH SAEFUL MILLAH, S.Pd"}
                  </Text>
                </View>
              </View>
            </View>
          </Page>
        );
      })}
    </Document>
  );
}

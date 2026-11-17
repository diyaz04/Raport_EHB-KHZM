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
// STYLESHEET RESMI RAPORT PESANTREN KHZM
// ==============================================================================
const styles = StyleSheet.create({
  page: {
    fontFamily: activeFontFamily,
    fontSize: 9,
    paddingHorizontal: 26,
    paddingTop: 18,
    paddingBottom: 18,
    color: "#111827",
    backgroundColor: "#ffffff",
    position: "relative",
  },
  watermark: {
    position: "absolute",
    top: 320,
    left: 80,
    fontSize: 72,
    color: "#ef4444",
    opacity: 0.12,
    transform: "rotate(-35deg)",
    fontWeight: "bold",
  },
  kopContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
    gap: 12,
  },
  logo: {
    width: 48,
    height: 48,
    objectFit: "contain",
  },
  kopTextContainer: {
    flex: 1,
    textAlign: "center",
  },
  kopJudul: {
    fontSize: 10,
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  kopLembaga: {
    fontSize: 13,
    fontWeight: "bold",
    textTransform: "uppercase",
    color: "#065f46", // Dark Emerald
    letterSpacing: 0.5,
  },
  kopAlamat: {
    fontSize: 7.5,
    color: "#4b5563",
    marginTop: 1,
  },
  kopDividerDouble: {
    borderBottomWidth: 2,
    borderBottomColor: "#111827",
    marginBottom: 1,
    marginTop: 3,
  },
  kopDividerThin: {
    borderBottomWidth: 0.5,
    borderBottomColor: "#111827",
    marginBottom: 6,
  },
  judulDoc: {
    fontSize: 11,
    fontWeight: "bold",
    textAlign: "center",
    textTransform: "uppercase",
    textDecoration: "underline",
    marginBottom: 6,
    letterSpacing: 0.8,
  },
  infoContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
    fontSize: 8.5,
    lineHeight: 1.3,
  },
  infoCol: {
    width: "48%",
  },
  infoRow: {
    flexDirection: "row",
    marginBottom: 1.5,
  },
  infoLabel: {
    width: 78,
    color: "#374151",
  },
  infoColon: {
    width: 8,
  },
  infoValue: {
    flex: 1,
    fontWeight: "bold",
    color: "#111827",
  },
  // Table Styling
  table: {
    width: "100%",
    borderWidth: 0.8,
    borderColor: "#111827",
    marginBottom: 6,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f3f4f6",
    borderBottomWidth: 0.8,
    borderBottomColor: "#111827",
    fontWeight: "bold",
    textAlign: "center",
    fontSize: 8,
    minHeight: 18,
    alignItems: "center",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#9ca3af",
    minHeight: 13.5,
    alignItems: "center",
    fontSize: 8,
  },
  colNo: {
    width: "6%",
    textAlign: "center",
    borderRightWidth: 0.5,
    borderRightColor: "#9ca3af",
    paddingVertical: 1,
  },
  colMapel: {
    width: "36%",
    paddingLeft: 4,
    borderRightWidth: 0.5,
    borderRightColor: "#9ca3af",
    paddingVertical: 1,
  },
  colKitab: {
    width: "28%",
    paddingLeft: 4,
    borderRightWidth: 0.5,
    borderRightColor: "#9ca3af",
    paddingVertical: 1,
  },
  colNilai: {
    width: "12%",
    textAlign: "center",
    borderRightWidth: 0.5,
    borderRightColor: "#9ca3af",
    paddingVertical: 1,
  },
  colHuruf: {
    width: "18%",
    paddingLeft: 4,
    paddingVertical: 1,
  },
  tableRowTotal: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#111827",
    backgroundColor: "#f9fafb",
    fontWeight: "bold",
    minHeight: 14,
    alignItems: "center",
    fontSize: 8,
  },
  colTotalLabel: {
    width: "70%",
    textAlign: "right",
    paddingRight: 8,
    borderRightWidth: 0.5,
    borderRightColor: "#9ca3af",
  },
  colTotalVal: {
    width: "12%",
    textAlign: "center",
    borderRightWidth: 0.5,
    borderRightColor: "#9ca3af",
  },
  colRankRow: {
    flexDirection: "row",
    backgroundColor: "#ecfdf5",
    borderTopWidth: 0.8,
    borderTopColor: "#111827",
    paddingVertical: 2.5,
    paddingHorizontal: 6,
    justifyContent: "center",
    alignItems: "center",
    fontSize: 8.5,
    fontWeight: "bold",
  },
  // Section Catatan & Presensi
  catatanGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 5,
    gap: 8,
  },
  catatanBox: {
    flex: 1,
    borderWidth: 0.8,
    borderColor: "#111827",
    padding: 4,
    minHeight: 52,
  },
  catatanBoxHeader: {
    fontSize: 7.5,
    fontWeight: "bold",
    textAlign: "center",
    backgroundColor: "#f3f4f6",
    paddingVertical: 1.5,
    marginBottom: 3,
    borderBottomWidth: 0.5,
    borderBottomColor: "#e5e7eb",
    textTransform: "uppercase",
  },
  catatanRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7.5,
    marginBottom: 1.5,
    paddingHorizontal: 2,
  },
  catatanVal: {
    fontWeight: "bold",
  },
  // Saran & Tanggapan
  saranGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 5,
    gap: 8,
  },
  saranBox: {
    flex: 1,
    borderWidth: 0.8,
    borderColor: "#111827",
    padding: 4,
    minHeight: 46,
  },
  saranTitle: {
    fontSize: 7.5,
    fontWeight: "bold",
    marginBottom: 2,
    borderBottomWidth: 0.5,
    borderBottomColor: "#e5e7eb",
    paddingBottom: 1,
  },
  saranContent: {
    fontSize: 7.5,
    fontStyle: "italic",
    color: "#374151",
    lineHeight: 1.2,
  },
  tanggapanLine: {
    borderBottomWidth: 0.5,
    borderBottomColor: "#9ca3af",
    borderStyle: "dashed",
    marginTop: 8,
    height: 1,
  },
  // Naik Kelas Row
  naikKelasContainer: {
    borderWidth: 0.8,
    borderColor: "#111827",
    paddingVertical: 2,
    paddingHorizontal: 6,
    marginBottom: 6,
    flexDirection: "row",
    alignItems: "center",
    fontSize: 8,
    backgroundColor: "#fcfcfc",
  },
  naikKelasText: {
    fontWeight: "bold",
  },
  // Tanda Tangan Section
  titimangsa: {
    textAlign: "right",
    fontSize: 8,
    marginBottom: 4,
  },
  ttdContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginTop: 2,
  },
  ttdCol: {
    width: "31%",
    textAlign: "center",
    alignItems: "center",
    fontSize: 7.5,
  },
  ttdJabatan: {
    fontWeight: "bold",
    marginBottom: 2,
  },
  ttdQrWrapper: {
    height: 52,
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 1,
  },
  ttdQr: {
    width: 42,
    height: 42,
  },
  ttdSpace: {
    height: 46,
  },
  ttdNama: {
    fontWeight: "bold",
    textDecoration: "underline",
    fontSize: 8,
  },
  ttdQrCaption: {
    fontSize: 5,
    color: "#4b5563",
    marginTop: 1,
  },
  ttdQrCode: {
    fontSize: 5.5,
    fontFamily: activeFontFamily,
    color: "#111827",
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
}

// ==============================================================================
// KOMPONEN RAPORT DOCUMENT (@react-pdf/renderer)
// ==============================================================================
export function RaportDocument({ students, logoBase64 }: RaportDocumentProps) {
  return (
    <Document title="Raport Santri - Pondok Pesantren KH Zumratul Muttaqin">
      {students.map((student, studentIdx) => {
        // Susun 12 baris tabel: Isi dengan mapel, sisanya diisi strip '-'
        const tableRows: Array<{
          no: number;
          mapel: string;
          kitab: string;
          nilai: string;
          huruf: string;
        }> = [];

        const mapelItems = student.mapelList || [];
        for (let i = 0; i < 12; i++) {
          if (i < mapelItems.length) {
            const m = mapelItems[i];
            const nilaiStr = m.nilai !== null && m.nilai !== undefined ? String(m.nilai) : "-";
            const hurufStr =
              m.huruf || (m.nilai !== null && m.nilai !== undefined ? terbilangId(m.nilai) : "-");

            tableRows.push({
              no: i + 1,
              mapel: m.nama || "-",
              kitab: m.kitab || "-",
              nilai: nilaiStr,
              huruf: hurufStr,
            });
          } else {
            // Baris kosong terisi strip '-' sesuai instruksi
            tableRows.push({
              no: i + 1,
              mapel: "-",
              kitab: "-",
              nilai: "-",
              huruf: "-",
            });
          }
        }

        const formattedTotal =
          student.totalNilai !== null && student.totalNilai !== undefined
            ? String(student.totalNilai)
            : "-";

        const formattedRataRata =
          student.rataRata !== null && student.rataRata !== undefined
            ? String(student.rataRata)
            : "-";

        const rataRataTerbilang =
          student.rataRata !== null && student.rataRata !== undefined
            ? terbilangId(Math.round(student.rataRata))
            : "-";

        const rankText =
          student.ranking && student.totalSantri
            ? `Peringkat Ke- ${student.ranking} dari ${student.totalSantri} Santri`
            : student.ranking
            ? `Peringkat Ke- ${student.ranking}`
            : "-";

        return (
          <Page key={student.santriId || studentIdx} size="A4" style={styles.page}>
            {/* Watermark DRAFT bila belum final */}
            {student.isDraft && <Text style={styles.watermark}>DRAFT</Text>}

            {/* KOP PESANTREN + LOGO */}
            <View style={styles.kopContainer}>
              {logoBase64 ? (
                <Image src={logoBase64} style={styles.logo} />
              ) : (
                <View
                  style={{
                    width: 48,
                    height: 48,
                    backgroundColor: "#e5e7eb",
                    borderRadius: 24,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text style={{ fontSize: 8, fontWeight: "bold", color: "#065f46" }}>KHZM</Text>
                </View>
              )}
              <View style={styles.kopTextContainer}>
                <Text style={styles.kopJudul}>YAYASAN PONDOK PESANTREN</Text>
                <Text style={styles.kopLembaga}>K.H. ZUMRATUL MUTTAQIN</Text>
                <Text style={styles.kopAlamat}>
                  Dk. Demangan Ds. Karangmalang Kec. Gebog Kab. Kudus Jawa Tengah · Telp: (0291) 431xxx
                </Text>
              </View>
            </View>

            <View style={styles.kopDividerDouble} />
            <View style={styles.kopDividerThin} />

            {/* JUDUL RESMI PERBAIKAN: LAPORAN HASIL BELAJAR */}
            <Text style={styles.judulDoc}>LAPORAN HASIL BELAJAR</Text>

            {/* INFORMASI SANTRI */}
            <View style={styles.infoContainer}>
              <View style={styles.infoCol}>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Nama Santri</Text>
                  <Text style={styles.infoColon}>:</Text>
                  <Text style={styles.infoValue}>{student.nama}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Nomor Induk (NIS)</Text>
                  <Text style={styles.infoColon}>:</Text>
                  <Text style={styles.infoValue}>{student.nis || "-"}</Text>
                </View>
              </View>

              <View style={styles.infoCol}>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Marhalah (Kelas)</Text>
                  <Text style={styles.infoColon}>:</Text>
                  <Text style={styles.infoValue}>{student.marhalah}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Tahun Ajaran / Sem.</Text>
                  <Text style={styles.infoColon}>:</Text>
                  <Text style={styles.infoValue}>
                    {student.tahunAjaran} / {student.semester.toUpperCase()}
                  </Text>
                </View>
              </View>
            </View>

            {/* TABEL NILAI 12 BARIS */}
            <View style={styles.table}>
              {/* Header */}
              <View style={styles.tableHeader}>
                <Text style={styles.colNo}>NO</Text>
                <Text style={styles.colMapel}>MATA PELAJARAN</Text>
                <Text style={styles.colKitab}>KITAB</Text>
                <Text style={styles.colNilai}>ANGKA</Text>
                <Text style={styles.colHuruf}>HURUF</Text>
              </View>

              {/* 12 Rows */}
              {tableRows.map((row) => (
                <View key={row.no} style={styles.tableRow}>
                  <Text style={styles.colNo}>{row.no}</Text>
                  <Text style={styles.colMapel}>{row.mapel}</Text>
                  <Text style={styles.colKitab}>{row.kitab}</Text>
                  <Text style={styles.colNilai}>{row.nilai}</Text>
                  <Text style={styles.colHuruf}>{row.huruf}</Text>
                </View>
              ))}

              {/* Baris Jumlah Nilai */}
              <View style={styles.tableRowTotal}>
                <Text style={styles.colTotalLabel}>JUMLAH NILAI</Text>
                <Text style={styles.colTotalVal}>{formattedTotal}</Text>
                <Text style={styles.colHuruf}>
                  {student.totalNilai !== null && student.totalNilai !== undefined
                    ? terbilangId(student.totalNilai)
                    : "-"}
                </Text>
              </View>

              {/* Baris Nilai Rata-Rata */}
              <View style={styles.tableRowTotal}>
                <Text style={styles.colTotalLabel}>NILAI RATA-RATA</Text>
                <Text style={styles.colTotalVal}>{formattedRataRata}</Text>
                <Text style={styles.colHuruf}>{rataRataTerbilang}</Text>
              </View>

              {/* Baris Peringkat */}
              <View style={styles.colRankRow}>
                <Text>{rankText}</Text>
              </View>
            </View>

            {/* CATATAN AKHIR SEMESTER (KEPRIBADIAN & KETIDAKHADIRAN) */}
            <View style={styles.catatanGrid}>
              {/* Box Kepribadian */}
              <View style={styles.catatanBox}>
                <Text style={styles.catatanBoxHeader}>Catatan Kepribadian</Text>
                <View style={styles.catatanRow}>
                  <Text>1. Akhlak / Perilaku</Text>
                  <Text style={styles.catatanVal}>{student.catatan?.akhlak || "-"}</Text>
                </View>
                <View style={styles.catatanRow}>
                  <Text>2. Ketekunan / Kerajinan</Text>
                  <Text style={styles.catatanVal}>{student.catatan?.ketekunan || "-"}</Text>
                </View>
                <View style={styles.catatanRow}>
                  <Text>3. Kerapihan</Text>
                  <Text style={styles.catatanVal}>{student.catatan?.kerapihan || "-"}</Text>
                </View>
                <View style={styles.catatanRow}>
                  <Text>4. Kebersihan</Text>
                  <Text style={styles.catatanVal}>{student.catatan?.kebersihan || "-"}</Text>
                </View>
              </View>

              {/* Box Ketidakhadiran */}
              <View style={styles.catatanBox}>
                <Text style={styles.catatanBoxHeader}>Ketidakhadiran</Text>
                <View style={styles.catatanRow}>
                  <Text>1. Sakit</Text>
                  <Text style={styles.catatanVal}>{student.catatan?.sakit ?? 0} hari</Text>
                </View>
                <View style={styles.catatanRow}>
                  <Text>2. Izin</Text>
                  <Text style={styles.catatanVal}>{student.catatan?.izin ?? 0} hari</Text>
                </View>
                <View style={styles.catatanRow}>
                  <Text>3. Alpa / Tanpa Keterangan</Text>
                  <Text style={styles.catatanVal}>{student.catatan?.alpa ?? 0} hari</Text>
                </View>
              </View>
            </View>

            {/* SARAN WALI KELAS & TANGGAPAN ORANG TUA/WALI */}
            <View style={styles.saranGrid}>
              <View style={styles.saranBox}>
                <Text style={styles.saranTitle}>Saran Wali Kelas:</Text>
                <Text style={styles.saranContent}>
                  {student.catatan?.saran_wali_kelas ||
                    "Tingkatkan terus semangat muthala'ah kitab dan istiqamah dalam berjamaah."}
                </Text>
              </View>

              <View style={styles.saranBox}>
                <Text style={styles.saranTitle}>Tanggapan Orang Tua / Wali:</Text>
                <View style={styles.tanggapanLine} />
                <View style={styles.tanggapanLine} />
              </View>
            </View>

            {/* KETERANGAN NAIK KE MARHALAH */}
            <View style={styles.naikKelasContainer}>
              <Text style={{ fontSize: 7.5, color: "#374151" }}>Keputusan Kenaikan : </Text>
              <Text style={styles.naikKelasText}>
                {student.catatan?.naik_ke_marhalah
                  ? `Naik Ke Marhalah ${student.catatan.naik_ke_marhalah}`
                  : student.semester.toLowerCase() === "genap"
                  ? "Naik Ke Marhalah Berikutnya"
                  : "Melanjutkan Ke Semester Genap"}
              </Text>
            </View>

            {/* TITIMANGSA & TANDA TANGAN */}
            <View style={{ marginTop: 2 }}>
              <Text style={styles.titimangsa}>
                {student.tempatTerbit || "Kudus"},{" "}
                {student.tanggalTerbit ||
                  new Intl.DateTimeFormat("id-ID", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  }).format(new Date())}
              </Text>

              <View style={styles.ttdContainer}>
                {/* 1. Orang Tua / Wali */}
                <View style={styles.ttdCol}>
                  <Text style={styles.ttdJabatan}>Orang Tua / Wali Santri,</Text>
                  <View style={styles.ttdSpace} />
                  <Text style={{ borderBottomWidth: 0.8, borderBottomColor: "#111827", width: 90 }}>
                    {" "}
                  </Text>
                </View>

                {/* 2. Wali Kelas */}
                <View style={styles.ttdCol}>
                  <Text style={styles.ttdJabatan}>Wali Kelas,</Text>
                  <View style={styles.ttdSpace} />
                  <Text style={styles.ttdNama}>( {student.waliKelas || "Wali Kelas"} )</Text>
                </View>

                {/* 3. Pimpinan Lembaga (Dengan QR Resmi jika Final) */}
                <View style={styles.ttdCol}>
                  <Text style={styles.ttdJabatan}>Pimpinan Pesantren,</Text>
                  <View style={styles.ttdQrWrapper}>
                    {!student.isDraft && student.qrDataUrl ? (
                      <View style={{ alignItems: "center" }}>
                        <Image src={student.qrDataUrl} style={styles.ttdQr} />
                        <Text style={styles.ttdQrCaption}>
                          Diterbitkan secara elektronik · Pindai untuk verifikasi
                        </Text>
                        {student.kodeVerifikasi && (
                          <Text style={styles.ttdQrCode}>ID: {student.kodeVerifikasi}</Text>
                        )}
                      </View>
                    ) : (
                      <View
                        style={{
                          width: 44,
                          height: 44,
                          borderWidth: 0.5,
                          borderColor: "#d1d5db",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Text style={{ fontSize: 6, color: "#9ca3af" }}>DRAFT</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.ttdNama}>
                    ( {student.pimpinanNama || "Drs. KH. Ahmad Dimyathi"} )
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

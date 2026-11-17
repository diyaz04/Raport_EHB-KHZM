/* eslint-disable jsx-a11y/alt-text */
import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
} from "@react-pdf/renderer";
import fs from "fs";
import path from "path";
import type { LembagaInfo } from "./kop-surat";

export interface BeritaAcaraPageData {
  ehb: {
    nama: string;
    tahunAjaran: string;
    semester: string;
  };
  sesi: {
    nomorSesi?: number;
    tanggal: string;
    jamMulai: string;
    jamSelesai: string;
    mapelRingkasan?: string;
  };
  ruangan: {
    id: string;
    nama: string;
    kapasitas: number;
    jumlahPesertaSeharusnya: number;
  };
  marhalahNama?: string;
  pengawas1?: string | null;
  pengawas2?: string | null;
  lembaga?: LembagaInfo | null;
}

function formatDateIndo(dateStr: string) {
  if (!dateStr) return "..................";
  try {
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      return d.toLocaleDateString("id-ID", {
        weekday: "long",
      });
    }
    return dateStr;
  } catch {
    return dateStr;
  }
}

function formatDayNumber(dateStr: string) {
  if (!dateStr) return "......";
  const parts = dateStr.split("-");
  return parts[2] || "......";
}

function formatMonthName(dateStr: string) {
  if (!dateStr) return "........................";
  try {
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      return d.toLocaleDateString("id-ID", { month: "long" });
    }
    return "........................";
  } catch {
    return "........................";
  }
}

function formatYear(dateStr: string) {
  if (!dateStr) return "20___";
  return dateStr.split("-")[0] || "20___";
}

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 8.5,
    paddingHorizontal: 36,
    paddingTop: 24,
    paddingBottom: 24,
    color: "#111827",
    backgroundColor: "#ffffff",
  },
  halfCard: {
    height: "47.5%",
    flexDirection: "column",
    justifyContent: "space-between",
  },
  cutDividerContainer: {
    height: "5%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  cutDividerLine: {
    borderBottomWidth: 0.8,
    borderBottomColor: "#9ca3af",
    borderStyle: "dashed",
    width: "100%",
  },
  cutText: {
    position: "absolute",
    backgroundColor: "#ffffff",
    paddingHorizontal: 8,
    fontSize: 7,
    color: "#6b7280",
    fontStyle: "italic",
  },
  kopContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
    position: "relative",
  },
  logo: {
    position: "absolute",
    left: 4,
    top: 0,
    width: 44,
    height: 44,
    objectFit: "contain",
  },
  kopCenterText: {
    textAlign: "center",
    width: "100%",
    paddingLeft: 30,
  },
  kopLine1: {
    fontSize: 10,
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  kopLine2: {
    fontSize: 10,
    fontWeight: "bold",
    textTransform: "uppercase",
    marginTop: 1,
  },
  kopLine3: {
    fontSize: 9.5,
    fontWeight: "bold",
    textTransform: "uppercase",
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
  docTitle: {
    fontSize: 10.5,
    fontWeight: "bold",
    textAlign: "center",
    textTransform: "uppercase",
    textDecoration: "underline",
    marginBottom: 5,
    letterSpacing: 0.5,
  },
  introParagraph: {
    fontSize: 8,
    lineHeight: 1.35,
    textAlign: "justify",
    marginBottom: 4,
  },
  rincianContainer: {
    marginBottom: 4,
    paddingLeft: 6,
  },
  rincianRow: {
    flexDirection: "row",
    marginBottom: 1.5,
    fontSize: 8,
  },
  rincianLabel: {
    width: 140,
  },
  rincianDots: {
    width: 10,
  },
  rincianValue: {
    flex: 1,
    fontWeight: "bold",
  },
  tableContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 5,
  },
  tableSub: {
    width: "48.5%",
    borderWidth: 0.8,
    borderColor: "#111827",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#111827",
    minHeight: 13,
    alignItems: "center",
  },
  tableHeader: {
    backgroundColor: "#ffffff",
    fontWeight: "bold",
    minHeight: 14,
  },
  thColNo: {
    width: "35%",
    fontSize: 7.5,
    fontWeight: "bold",
    textAlign: "center",
    borderRightWidth: 0.5,
    borderRightColor: "#111827",
    paddingVertical: 1,
  },
  thColNama: {
    width: "65%",
    fontSize: 7.5,
    fontWeight: "bold",
    textAlign: "center",
    paddingVertical: 1,
  },
  tdColNo: {
    width: "35%",
    fontSize: 7,
    borderRightWidth: 0.5,
    borderRightColor: "#111827",
    paddingHorizontal: 2,
    paddingVertical: 1,
  },
  tdColNama: {
    width: "65%",
    fontSize: 7,
    paddingHorizontal: 2,
    paddingVertical: 1,
  },
  closingText: {
    fontSize: 8,
    marginBottom: 3,
  },
  signContainer: {
    alignItems: "flex-end",
    paddingRight: 30,
  },
  signBlock: {
    width: 180,
    textAlign: "center",
    fontSize: 8,
  },
  signSpace: {
    height: 28,
  },
});

function renderSingleBeritaAcara(data: BeritaAcaraPageData, logoDataUri: string | null) {
  const semesterUpper = (data.ehb.semester || "GANJIL").toUpperCase();
  const tahunAjaran = data.ehb.tahunAjaran || "2025 / 2026";

  return (
    <View style={styles.halfCard}>
      {/* KOP */}
      <View>
        <View style={styles.kopContainer}>
          {logoDataUri ? (
            <Image src={logoDataUri} style={styles.logo} />
          ) : (
            <View style={[styles.logo, { backgroundColor: "#e2e8f0" }]} />
          )}
          <View style={styles.kopCenterText}>
            <Text style={styles.kopLine1}>
              EVALUASI HASIL BELAJAR (EHB) SEMESTER {semesterUpper}
            </Text>
            <Text style={styles.kopLine2}>
              LEMBAGA PENDIDIKAN PONDOK PESANTREN KHZ MUTTAQIN
            </Text>
            <Text style={styles.kopLine3}>
              TAHUN AJARAN {tahunAjaran}
            </Text>
          </View>
        </View>

        <View style={styles.kopDividerDouble} />
        <View style={styles.kopDividerThin} />
      </View>

      {/* JUDUL */}
      <Text style={styles.docTitle}>BERITA ACARA</Text>

      {/* PARAGRAF PEMBUKA */}
      <Text style={styles.introParagraph}>
        Pada hari ini, Hari {formatDateIndo(data.sesi.tanggal)}, Tanggal {formatDayNumber(data.sesi.tanggal)} Bulan {formatMonthName(data.sesi.tanggal)} Tahun {formatYear(data.sesi.tanggal)}. Telah dilaksanakan Evaluasi Hasil Belajar (EHB) Semester {data.ehb.semester} Tahun Pelajaran {data.ehb.tahunAjaran} Dengan Rincian:
      </Text>

      {/* RINCIAN UJIAN */}
      <View style={styles.rincianContainer}>
        <View style={styles.rincianRow}>
          <Text style={styles.rincianLabel}>Mata Pelajaran</Text>
          <Text style={styles.rincianDots}>:</Text>
          <Text style={styles.rincianValue}>
            {data.sesi.mapelRingkasan || "......................................................."}
          </Text>
        </View>
        <View style={styles.rincianRow}>
          <Text style={styles.rincianLabel}>Ruang</Text>
          <Text style={styles.rincianDots}>:</Text>
          <Text style={styles.rincianValue}>
            {data.ruangan.nama || "......................................................."}
          </Text>
        </View>
        <View style={styles.rincianRow}>
          <Text style={styles.rincianLabel}>Marhalah</Text>
          <Text style={styles.rincianDots}>:</Text>
          <Text style={styles.rincianValue}>
            {data.marhalahNama || "......................................................."}
          </Text>
        </View>
        <View style={styles.rincianRow}>
          <Text style={styles.rincianLabel}>Peserta Yang Seharusnya</Text>
          <Text style={styles.rincianDots}>:</Text>
          <Text style={styles.rincianValue}>
            {data.ruangan.jumlahPesertaSeharusnya ? `${data.ruangan.jumlahPesertaSeharusnya} Orang` : "......................................................."}
          </Text>
        </View>
        <View style={styles.rincianRow}>
          <Text style={styles.rincianLabel}>Peserta Yang Tidak Hadir</Text>
          <Text style={styles.rincianDots}>:</Text>
          <Text style={styles.rincianValue}>.......................................................</Text>
        </View>
        <View style={styles.rincianRow}>
          <Text style={styles.rincianLabel}>Yaitu</Text>
          <Text style={styles.rincianDots}>:</Text>
          <Text style={styles.rincianValue}></Text>
        </View>
      </View>

      {/* TABEL SANTRI TIDAK HADIR (2 TABEL BERDAMPINGAN) */}
      <View style={styles.tableContainer}>
        {/* Sub-Tabel 1 */}
        <View style={styles.tableSub}>
          <View style={[styles.tableRow, styles.tableHeader]}>
            <Text style={styles.thColNo}>No. Peserta</Text>
            <Text style={styles.thColNama}>Nama</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tdColNo}></Text>
            <Text style={styles.tdColNama}></Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tdColNo}></Text>
            <Text style={styles.tdColNama}></Text>
          </View>
          <View style={[styles.tableRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.tdColNo}></Text>
            <Text style={styles.tdColNama}></Text>
          </View>
        </View>

        {/* Sub-Tabel 2 */}
        <View style={styles.tableSub}>
          <View style={[styles.tableRow, styles.tableHeader]}>
            <Text style={styles.thColNo}>No. Peserta</Text>
            <Text style={styles.thColNama}>Nama</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tdColNo}></Text>
            <Text style={styles.tdColNama}></Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tdColNo}></Text>
            <Text style={styles.tdColNama}></Text>
          </View>
          <View style={[styles.tableRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.tdColNo}></Text>
            <Text style={styles.tdColNama}></Text>
          </View>
        </View>
      </View>

      {/* PENUTUP & TANDA TANGAN */}
      <Text style={styles.closingText}>Demikian Berita Acara ini dibuat dengan sesungguhnya.</Text>

      <View style={styles.signContainer}>
        <View style={styles.signBlock}>
          <Text style={{ fontWeight: "bold" }}>Pengawas,</Text>
          <View style={styles.signSpace} />
          <Text>
            {data.pengawas1 ? `( ${data.pengawas1} )` : "( ...................................................... )"}
          </Text>
        </View>
      </View>
    </View>
  );
}

export function BeritaAcaraDocument({
  pages,
}: {
  pages: BeritaAcaraPageData[];
}) {
  let logoDataUri: string | null = null;
  try {
    const logoFilePath = path.join(process.cwd(), "public", "logo.png");
    if (fs.existsSync(logoFilePath)) {
      const buffer = fs.readFileSync(logoFilePath);
      logoDataUri = `data:image/png;base64,${buffer.toString("base64")}`;
    }
  } catch {
    logoDataUri = null;
  }

  // Tiap lembar A4 Portrait memuat 2 Berita Acara (atas dan bawah dipisah garis putus-putus)
  // sesuai template dokumen user!
  const pairedPages: Array<[BeritaAcaraPageData, BeritaAcaraPageData]> = [];
  for (let i = 0; i < pages.length; i += 2) {
    const first = pages[i];
    // Jika jumlah ganjil, buat salinan rangkap untuk arsip pengawas di bagian bawah
    const second = i + 1 < pages.length ? pages[i + 1] : first;
    pairedPages.push([first, second]);
  }

  return (
    <Document
      title="Berita Acara Evaluasi Hasil Belajar"
      author="Pondok Pesantren KH Zumratul Muttaqin"
    >
      {pairedPages.map(([topData, bottomData], pIdx) => (
        <Page key={pIdx} size="A4" orientation="portrait" style={styles.page}>
          {/* BAGIAN ATAS */}
          {renderSingleBeritaAcara(topData, logoDataUri)}

          {/* PEMISAH POTONG DI SINI */}
          <View style={styles.cutDividerContainer}>
            <View style={styles.cutDividerLine} />
            <Text style={styles.cutText}>- - potong di sini - -</Text>
          </View>

          {/* BAGIAN BAWAH */}
          {renderSingleBeritaAcara(bottomData, logoDataUri)}
        </Page>
      ))}
    </Document>
  );
}

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

export interface KartuJadwalRow {
  hari: string;
  tanggal: string;
  waktu: string;
  mapel: string;
}

export interface KartuPesertaItem {
  id: string;
  ehbId: string;
  ehbNama: string;
  tahunAjaran: string;
  semester: string;
  santriNama: string;
  santriNis?: string | null;
  marhalahNama: string;
  noPeserta: string;
  ruanganNama?: string | null;
  jadwal: KartuJadwalRow[];
}

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 8,
    paddingHorizontal: 28,
    paddingTop: 18,
    paddingBottom: 18,
    color: "#111827",
    backgroundColor: "#ffffff",
  },
  cardOuter: {
    height: "47.2%",
    borderWidth: 1.5,
    borderColor: "#15803d",
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: "column",
    justifyContent: "space-between",
  },
  cutDividerContainer: {
    height: "5.6%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  cutDashedLine: {
    position: "absolute",
    left: 0,
    right: 0,
    top: "50%",
    borderBottomWidth: 0.8,
    borderBottomColor: "#9ca3af",
    borderStyle: "dashed",
  },
  cutText: {
    backgroundColor: "#ffffff",
    paddingHorizontal: 8,
    fontSize: 6.5,
    color: "#6b7280",
  },
  // KOP
  kopContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
    gap: 8,
  },
  logo: {
    width: 36,
    height: 36,
    objectFit: "contain",
  },
  kopCenter: {
    flex: 1,
    textAlign: "center",
  },
  kopTitle: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#15803d",
    letterSpacing: 0.3,
  },
  kopLembaga: {
    fontSize: 8.5,
    fontWeight: "bold",
    color: "#111827",
    letterSpacing: 0.4,
    marginTop: 1,
  },
  kopAlamat: {
    fontSize: 6.8,
    color: "#4b5563",
    marginTop: 0.5,
  },
  kopSub: {
    fontSize: 6.8,
    fontWeight: "bold",
    color: "#15803d",
    marginTop: 1,
  },
  kopDividerDouble: {
    height: 1.2,
    backgroundColor: "#15803d",
    marginTop: 3,
    marginBottom: 1,
  },
  kopDividerThin: {
    height: 0.5,
    backgroundColor: "#15803d",
    marginBottom: 4,
  },
  // Identitas & Foto
  idRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 4,
  },
  idColLeft: {
    flex: 1,
    marginRight: 8,
  },
  idField: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 2.2,
    fontSize: 7.8,
  },
  idLabel: {
    width: 90,
    color: "#374151",
    fontWeight: "normal",
  },
  idSeparator: {
    width: 8,
    color: "#374151",
    textAlign: "center",
  },
  idValue: {
    flex: 1,
    fontWeight: "bold",
    color: "#111827",
  },
  idDottedUnderline: {
    borderBottomWidth: 0.5,
    borderBottomColor: "#cbd5e1",
    borderStyle: "dashed",
  },
  // Photo Box
  photoBox: {
    width: 52,
    height: 64,
    borderWidth: 1,
    borderColor: "#15803d",
    borderRadius: 3,
    backgroundColor: "#f0fdf4",
    alignItems: "center",
    justifyContent: "center",
  },
  photoText: {
    fontSize: 7.5,
    fontWeight: "bold",
    color: "#15803d",
  },
  photoSubtext: {
    fontSize: 6.5,
    color: "#4b5563",
    marginTop: 2,
  },
  // Table
  tableContainer: {
    borderWidth: 0.8,
    borderColor: "#15803d",
    borderRadius: 2,
    overflow: "hidden",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#15803d",
    height: 14,
    alignItems: "center",
  },
  tableHeaderCell: {
    color: "#ffffff",
    fontSize: 7,
    fontWeight: "bold",
    textAlign: "center",
  },
  tableRow: {
    flexDirection: "row",
    height: 13,
    alignItems: "center",
    borderTopWidth: 0.5,
    borderTopColor: "#bbf7d0",
  },
  tableCell: {
    fontSize: 7,
    color: "#111827",
  },
  colHari: {
    width: "16%",
    textAlign: "center",
    borderRightWidth: 0.5,
    borderRightColor: "#bbf7d0",
    paddingHorizontal: 2,
  },
  colTanggal: {
    width: "20%",
    textAlign: "center",
    borderRightWidth: 0.5,
    borderRightColor: "#bbf7d0",
    paddingHorizontal: 2,
    fontSize: 6.8,
  },
  colWaktu: {
    width: "22%",
    textAlign: "center",
    borderRightWidth: 0.5,
    borderRightColor: "#bbf7d0",
    paddingHorizontal: 2,
  },
  colMapel: {
    width: "32%",
    textAlign: "left",
    borderRightWidth: 0.5,
    borderRightColor: "#bbf7d0",
    paddingHorizontal: 4,
    fontWeight: "bold",
  },
  colParaf: {
    width: "10%",
    textAlign: "center",
    paddingHorizontal: 2,
  },
  // Catatan
  catatanBox: {
    flexDirection: "row",
    marginTop: 3,
    alignItems: "flex-start",
  },
  catatanLabel: {
    fontSize: 6.2,
    fontWeight: "bold",
    color: "#111827",
    marginRight: 4,
  },
  catatanContent: {
    flex: 1,
    fontSize: 5.8,
    color: "#374151",
    lineHeight: 1.25,
  },
  // Signatures
  signContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    marginTop: 4,
  },
  signBlock: {
    width: 140,
    textAlign: "center",
  },
  signTitle: {
    fontSize: 7,
    color: "#111827",
  },
  signSpace: {
    height: 20,
  },
  signName: {
    fontSize: 7,
    fontWeight: "bold",
    color: "#111827",
  },
});

function renderSingleCard(data: KartuPesertaItem, logoDataUri: string | null) {
  // Susun baris jadwal minimum 8 baris agar visual kartu seimbang & profesional
  const renderedJadwal = [...data.jadwal];
  const minRows = 8;
  while (renderedJadwal.length < minRows) {
    renderedJadwal.push({
      hari: "",
      tanggal: "..... / ..... / 2026",
      waktu: "- - -",
      mapel: "- - -",
    });
  }

  return (
    <View style={styles.cardOuter}>
      {/* 1. KOP */}
      <View>
        <View style={styles.kopContainer}>
          {logoDataUri ? (
            <Image src={logoDataUri} style={styles.logo} />
          ) : (
            <View style={[styles.logo, { backgroundColor: "#e2e8f0" }]} />
          )}
          <View style={styles.kopCenter}>
            <Text style={styles.kopTitle}>KARTU EVALUASI HASIL BELAJAR (EHB)</Text>
            <Text style={styles.kopLembaga}>PONDOK PESANTREN KH ZUMRATUL MUTTAQIN</Text>
            <Text style={styles.kopAlamat}>Gunung Pari  -  Kabupaten Tasikmalaya</Text>
            <Text style={styles.kopSub}>
              Semester {data.semester || "Ganjil"}  |  Tahun Pelajaran {data.tahunAjaran || "2026/2027"}
            </Text>
          </View>
        </View>
        <View style={styles.kopDividerDouble} />
        <View style={styles.kopDividerThin} />
      </View>

      {/* 2. IDENTITAS & FOTO */}
      <View style={styles.idRow}>
        <View style={styles.idColLeft}>
          <View style={styles.idField}>
            <Text style={styles.idLabel}>Nama Santri</Text>
            <Text style={styles.idSeparator}>:</Text>
            <Text style={styles.idValue}>{data.santriNama}</Text>
          </View>
          <View style={styles.idField}>
            <Text style={styles.idLabel}>No. Induk</Text>
            <Text style={styles.idSeparator}>:</Text>
            <Text style={styles.idValue}>{data.santriNis || "-"}</Text>
          </View>
          <View style={styles.idField}>
            <Text style={styles.idLabel}>Kelas / Tingkat</Text>
            <Text style={styles.idSeparator}>:</Text>
            <Text style={styles.idValue}>{data.marhalahNama}</Text>
          </View>
          <View style={styles.idField}>
            <Text style={styles.idLabel}>No. Peserta / Ruang</Text>
            <Text style={styles.idSeparator}>:</Text>
            <Text style={styles.idValue}>
              {data.noPeserta} {data.ruanganNama ? `/ ${data.ruanganNama}` : ""}
            </Text>
          </View>
        </View>

        {/* Box Foto 3x4 */}
        <View style={styles.photoBox}>
          <Text style={styles.photoText}>Foto</Text>
          <Text style={styles.photoSubtext}>3 x 4</Text>
        </View>
      </View>

      {/* 3. TABEL JADWAL UJIAN */}
      <View style={styles.tableContainer}>
        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderCell, styles.colHari]}>HARI</Text>
          <Text style={[styles.tableHeaderCell, styles.colTanggal]}>TANGGAL</Text>
          <Text style={[styles.tableHeaderCell, styles.colWaktu]}>WAKTU</Text>
          <Text style={[styles.tableHeaderCell, styles.colMapel]}>MATA PELAJARAN</Text>
          <Text style={[styles.tableHeaderCell, styles.colParaf]}>PARAF</Text>
        </View>

        {renderedJadwal.map((row, idx) => {
          const isEven = idx % 2 === 0;
          return (
            <View
              key={idx}
              style={[
                styles.tableRow,
                { backgroundColor: isEven ? "#f0fdf4" : "#ffffff" },
              ]}
            >
              <Text style={[styles.tableCell, styles.colHari]}>{row.hari}</Text>
              <Text style={[styles.tableCell, styles.colTanggal]}>{row.tanggal}</Text>
              <Text style={[styles.tableCell, styles.colWaktu]}>{row.waktu}</Text>
              <Text style={[styles.tableCell, styles.colMapel]}>
                {row.mapel}
              </Text>
              <Text style={[styles.tableCell, styles.colParaf]}> </Text>
            </View>
          );
        })}
      </View>

      {/* 4. CATATAN TATA TERTIB */}
      <View style={styles.catatanBox}>
        <Text style={styles.catatanLabel}>Catatan:</Text>
        <Text style={styles.catatanContent}>
          1. Kartu wajib dibawa & ditunjukkan kepada pengawas.  2. Hadir 15 menit sebelum ujian dimulai.
          {"\n"}
          3. Berpakaian rapi & sopan (sarung/songkok).  4. Peserta tidak melunasi administrasi tidak dapat mengikuti EHB.
        </Text>
      </View>

      {/* 5. TANDA TANGAN */}
      <View style={styles.signContainer}>
        <View style={styles.signBlock}>
          <Text style={styles.signTitle}>Pemegang Kartu,</Text>
          <View style={styles.signSpace} />
          <Text style={styles.signName}>
            ( {data.santriNama} )
          </Text>
        </View>
        <View style={styles.signBlock}>
          <Text style={styles.signTitle}>Ketua Panitia EHB,</Text>
          <View style={styles.signSpace} />
          <Text style={styles.signName}>( .................................... )</Text>
        </View>
      </View>
    </View>
  );
}

export function EhbKartuDocument({
  pesertaList = [],
}: {
  pesertaList?: KartuPesertaItem[];
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

  // Tiap lembar A4 Portrait memuat 2 Kartu EHB (atas dan bawah dipisah garis putus-putus)
  const pairedPages: Array<[KartuPesertaItem, KartuPesertaItem | null]> = [];
  for (let i = 0; i < pesertaList.length; i += 2) {
    pairedPages.push([pesertaList[i], pesertaList[i + 1] || null]);
  }

  return (
    <Document
      title="Kartu Peserta Evaluasi Hasil Belajar (EHB)"
      author="Pondok Pesantren KH Zumratul Muttaqin"
    >
      {pairedPages.map(([topData, bottomData], pIdx) => (
        <Page key={pIdx} size="A4" orientation="portrait" style={styles.page}>
          {/* KARTU ATAS */}
          {renderSingleCard(topData, logoDataUri)}

          {/* PEMISAH POTONG DI SINI */}
          <View style={styles.cutDividerContainer}>
            <View style={styles.cutDashedLine} />
            <Text style={styles.cutText}>- - potong di sini - -</Text>
          </View>

          {/* KARTU BAWAH */}
          {bottomData ? (
            renderSingleCard(bottomData, logoDataUri)
          ) : (
            // Jika ganjil dan kartu kedua kosong, buat duplikat kartu pertama (untuk arsip panitia)
            renderSingleCard(topData, logoDataUri)
          )}
        </Page>
      ))}
    </Document>
  );
}

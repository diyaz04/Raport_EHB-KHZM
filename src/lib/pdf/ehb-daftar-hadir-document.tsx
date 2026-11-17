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

export interface PesertaHadirRow {
  noUrutMeja?: number | null;
  noPeserta: string;
  nama: string;
  marhalah: string;
  mapelNama?: string;
}

export interface SesiInfo {
  id: string;
  nomorSesi?: number;
  hari?: string;
  tanggal: string;
  jamMulai: string;
  jamSelesai: string;
  mapelRingkasan?: string;
}

export interface RuanganInfo {
  id: string;
  nama: string;
  kapasitas: number;
}

export interface EhbInfo {
  id: string;
  nama: string;
  tahunAjaran: string;
  semester: string;
}

export interface DaftarHadirPerSesiPageData {
  ehb: EhbInfo;
  ruangan: RuanganInfo;
  sesi: SesiInfo;
  marhalahNama?: string;
  peserta: PesertaHadirRow[];
  lembaga?: LembagaInfo | null;
  pengawasNama?: string | null;
}

export interface DaftarHadirSemuaSesiPageData {
  ehb: EhbInfo;
  ruangan: RuanganInfo;
  marhalahNama?: string;
  semuaSesi: SesiInfo[];
  peserta: PesertaHadirRow[];
  lembaga?: LembagaInfo | null;
  pengawasNama?: string | null;
}

function formatDateIndo(dateStr: string) {
  if (!dateStr) return "-";
  try {
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      return d.toLocaleDateString("id-ID", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    }
    return dateStr;
  } catch {
    return dateStr;
  }
}

function getHariFromDate(dateStr: string) {
  if (!dateStr) return "Senin";
  try {
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      return d.toLocaleDateString("id-ID", { weekday: "long" });
    }
    return "Senin";
  } catch {
    return "Senin";
  }
}

function formatYear(dateStr: string) {
  if (!dateStr) return "2026";
  return dateStr.split("-")[0] || "2026";
}

// ==============================================================================
// STYLESHEET DAFTAR HADIR PERSIS SESUAI CONTOH DOKUMEN PESANTREN
// ==============================================================================
const styles = StyleSheet.create({
  pagePortrait: {
    fontFamily: "Helvetica",
    fontSize: 8,
    paddingHorizontal: 28,
    paddingTop: 18,
    paddingBottom: 18,
    color: "#111827",
    backgroundColor: "#ffffff",
  },
  pageLandscape: {
    fontFamily: "Helvetica",
    fontSize: 7.5,
    paddingHorizontal: 28,
    paddingTop: 18,
    paddingBottom: 18,
    color: "#111827",
    backgroundColor: "#ffffff",
  },

  // KOP DAFTAR HADIR
  kopContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
    position: "relative",
  },
  logo: {
    position: "absolute",
    left: 2,
    top: 0,
    width: 48,
    height: 48,
    objectFit: "contain",
  },
  kopCenterText: {
    textAlign: "center",
    width: "100%",
    paddingLeft: 35,
  },
  kopTitleGreen: {
    fontSize: 12.5,
    fontWeight: "bold",
    textTransform: "uppercase",
    color: "#15803d", // Emerald Green
    letterSpacing: 0.5,
  },
  kopSubLembagaGreen: {
    fontSize: 10.5,
    fontWeight: "bold",
    textTransform: "uppercase",
    color: "#15803d",
    marginTop: 1,
  },
  kopAlamat: {
    fontSize: 7.5,
    color: "#374151",
    marginTop: 1.5,
  },
  kopSubPeriode: {
    fontSize: 7.5,
    color: "#111827",
    marginTop: 1,
  },
  kopGreenDivider: {
    borderBottomWidth: 1.8,
    borderBottomColor: "#15803d",
    marginBottom: 6,
    marginTop: 3,
  },

  // INFO GRID 2 KOLOM
  infoGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
    fontSize: 7.5,
  },
  infoCol: {
    width: "48%",
  },
  infoRow: {
    flexDirection: "row",
    marginBottom: 2,
    alignItems: "center",
  },
  infoLabel: {
    width: 80,
    color: "#111827",
  },
  infoDots: {
    width: 8,
  },
  infoValue: {
    flex: 1,
    borderBottomWidth: 0.5,
    borderBottomColor: "#9ca3af",
    borderStyle: "dotted",
    paddingBottom: 1,
    fontWeight: "bold",
  },

  // TABEL HIJAU DAFTAR HADIR PER SESI
  table: {
    width: "100%",
    borderWidth: 0.8,
    borderColor: "#15803d",
    marginBottom: 6,
  },
  tableHeaderRowGreen: {
    flexDirection: "row",
    backgroundColor: "#15803d",
    minHeight: 18,
    alignItems: "center",
  },
  thGreen: {
    color: "#ffffff",
    fontWeight: "bold",
    fontSize: 7.5,
    textAlign: "center",
    paddingVertical: 2.5,
    paddingHorizontal: 2,
    borderRightWidth: 0.5,
    borderRightColor: "#ffffff",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#86efac", // Soft green
    minHeight: 15.5,
    alignItems: "center",
  },
  td: {
    fontSize: 7,
    paddingVertical: 1.5,
    paddingHorizontal: 3,
    borderRightWidth: 0.5,
    borderRightColor: "#86efac",
  },
  ttdBoxGanjil: {
    fontSize: 6.5,
    paddingLeft: 4,
    color: "#111827",
  },
  ttdBoxGenap: {
    fontSize: 6.5,
    paddingLeft: 45,
    color: "#111827",
  },

  // FOOTER REKAPITULASI & TANDA TANGAN
  footerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
    fontSize: 7.5,
  },
  rekapLeft: {
    width: "55%",
  },
  rekapRow: {
    flexDirection: "row",
    marginBottom: 1.5,
  },
  rekapLabel: {
    width: 120,
  },
  rekapValue: {
    width: 60,
    borderBottomWidth: 0.5,
    borderBottomColor: "#9ca3af",
    borderStyle: "dotted",
    textAlign: "right",
    paddingRight: 4,
  },
  rekapNote: {
    fontSize: 6.5,
    fontStyle: "italic",
    color: "#4b5563",
    marginTop: 3,
  },
  signRight: {
    width: "35%",
    textAlign: "center",
  },
  signSpace: {
    height: 32,
  },
});

export function DaftarHadirPerSesiDocument({
  pages,
}: {
  pages: DaftarHadirPerSesiPageData[];
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

  return (
    <Document title="Daftar Hadir Peserta EHB" author="Pondok Pesantren KH Zumratul Muttaqin">
      {pages.map((pData, idx) => {
        const semesterLabel = pData.ehb.semester || "Ganjil";
        const taLabel = pData.ehb.tahunAjaran || "2026/2027";
        const yearStr = formatYear(pData.sesi.tanggal);

        // Targetkan 25 baris per lembar sesuai template dokumen
        const rowsToRender = [...pData.peserta];
        const minRows = 25;
        while (rowsToRender.length < minRows) {
          rowsToRender.push({
            noPeserta: "",
            nama: "",
            marhalah: "",
          });
        }

        return (
          <Page key={idx} size="A4" orientation="portrait" style={styles.pagePortrait}>
            {/* KOP HIJAU RESMI */}
            <View style={styles.kopContainer}>
              {logoDataUri ? (
                <Image src={logoDataUri} style={styles.logo} />
              ) : (
                <View style={[styles.logo, { backgroundColor: "#e2e8f0" }]} />
              )}
              <View style={styles.kopCenterText}>
                <Text style={styles.kopTitleGreen}>DAFTAR HADIR PESERTA EHB</Text>
                <Text style={styles.kopSubLembagaGreen}>PONDOK PESANTREN KH ZUMRATUL MUTTAQIN</Text>
                <Text style={styles.kopAlamat}>Gunung Pari - Kabupaten Tasikmalaya</Text>
                <Text style={styles.kopSubPeriode}>
                  Evaluasi Hasil Belajar (EHB) | Semester {semesterLabel} | Tahun Pelajaran {taLabel}
                </Text>
              </View>
            </View>

            <View style={styles.kopGreenDivider} />

            {/* INFO GRID (2 KOLOM PERSIS TEMPLATE) */}
            <View style={styles.infoGrid}>
              {/* Kolom Kiri */}
              <View style={styles.infoCol}>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Mata Pelajaran</Text>
                  <Text style={styles.infoDots}>:</Text>
                  <Text style={styles.infoValue}>
                    {pData.sesi.mapelRingkasan || "..................................."}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Hari / Tanggal</Text>
                  <Text style={styles.infoDots}>:</Text>
                  <Text style={styles.infoValue}>
                    {pData.sesi.tanggal ? formatDateIndo(pData.sesi.tanggal) : "..................................."}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Kelas / Tingkat</Text>
                  <Text style={styles.infoDots}>:</Text>
                  <Text style={styles.infoValue}>
                    {pData.marhalahNama || "..................................."}
                  </Text>
                </View>
              </View>

              {/* Kolom Kanan */}
              <View style={styles.infoCol}>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Sesi / Waktu</Text>
                  <Text style={styles.infoDots}>:</Text>
                  <Text style={styles.infoValue}>
                    Sesi {pData.sesi.nomorSesi ?? 1} ({pData.sesi.jamMulai.slice(0, 5)} - {pData.sesi.jamSelesai.slice(0, 5)} WIB)
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Ruang</Text>
                  <Text style={styles.infoDots}>:</Text>
                  <Text style={styles.infoValue}>{pData.ruangan.nama}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Pengawas</Text>
                  <Text style={styles.infoDots}>:</Text>
                  <Text style={styles.infoValue}>
                    {pData.pengawasNama || "..................................."}
                  </Text>
                </View>
              </View>
            </View>

            {/* TABEL DAFTAR HADIR (25 BARIS DENGAN HEADER HIJAU) */}
            <View style={styles.table}>
              <View style={styles.tableHeaderRowGreen}>
                <Text style={[styles.thGreen, { width: "6%" }]}>NO</Text>
                <Text style={[styles.thGreen, { width: "36%", textAlign: "left", paddingLeft: 4 }]}>
                  NAMA SANTRI
                </Text>
                <Text style={[styles.thGreen, { width: "20%" }]}>NO. PESERTA</Text>
                <Text style={[styles.thGreen, { width: "26%" }]}>TANDA TANGAN</Text>
                <Text style={[styles.thGreen, { width: "12%", borderRightWidth: 0 }]}>KET.</Text>
              </View>

              {rowsToRender.map((row, rIdx) => {
                const isGanjil = (rIdx + 1) % 2 === 1;
                return (
                  <View key={rIdx} style={styles.tableRow}>
                    <Text style={[styles.td, { width: "6%", textAlign: "center" }]}>{rIdx + 1}</Text>
                    <Text style={[styles.td, { width: "36%", fontWeight: "bold" }]}>{row.nama}</Text>
                    <Text style={[styles.td, { width: "20%", textAlign: "center", fontFamily: "Helvetica", fontWeight: "bold" }]}>
                      {row.noPeserta}
                    </Text>
                    <View style={[styles.td, { width: "26%", justifyContent: "center" }]}>
                      <Text style={isGanjil ? styles.ttdBoxGanjil : styles.ttdBoxGenap}>
                        {rIdx + 1}. .........
                      </Text>
                    </View>
                    <Text style={[styles.td, { width: "12%", borderRightWidth: 0 }]}></Text>
                  </View>
                );
              })}
            </View>

            {/* FOOTER REKAPITULASI & TANDA TANGAN */}
            <View style={styles.footerContainer}>
              <View style={styles.rekapLeft}>
                <Text style={{ fontWeight: "bold", marginBottom: 2 }}>Rekapitulasi:</Text>
                <View style={styles.rekapRow}>
                  <Text style={styles.rekapLabel}>Peserta terdaftar</Text>
                  <Text style={styles.rekapValue}>
                    {pData.peserta.length > 0 ? `${pData.peserta.length}` : "........."}
                  </Text>
                  <Text style={{ marginLeft: 4 }}>orang</Text>
                </View>
                <View style={styles.rekapRow}>
                  <Text style={styles.rekapLabel}>Hadir</Text>
                  <Text style={styles.rekapValue}>.........</Text>
                  <Text style={{ marginLeft: 4 }}>orang</Text>
                </View>
                <View style={styles.rekapRow}>
                  <Text style={styles.rekapLabel}>Tidak hadir (S / I / A)</Text>
                  <Text style={styles.rekapValue}>.........</Text>
                  <Text style={{ marginLeft: 4 }}>orang</Text>
                </View>
                <Text style={styles.rekapNote}>
                  Ket.: S = Sakit, I = Izin, A = Alpa. Peserta wajib menandatangani sesuai nomor urut.
                </Text>
              </View>

              <View style={styles.signRight}>
                <Text>Gunung Pari, ........................ {yearStr}</Text>
                <Text style={{ marginTop: 2 }}>Pengawas Ujian,</Text>
                <View style={styles.signSpace} />
                <Text>
                  {pData.pengawasNama ? `( ${pData.pengawasNama} )` : "( ...................................... )"}
                </Text>
              </View>
            </View>
          </Page>
        );
      })}
    </Document>
  );
}

// ==============================================================================
// 2. REKAPITULASI DAFTAR HADIR (SEMUA SESI - LANDSCAPE)
// ==============================================================================
export function DaftarHadirSemuaSesiDocument({
  pages,
}: {
  pages: DaftarHadirSemuaSesiPageData[];
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

  return (
    <Document
      title="Rekapitulasi Daftar Hadir Peserta EHB"
      author="Pondok Pesantren KH Zumratul Muttaqin"
    >
      {pages.flatMap((pData, pIdx) => {
        // Chunk maksimal 8 sesi per halaman landscape (persis tabel template user: Sesi 1 s/d Sesi 8)
        const maxSessionsPerPage = 8;
        const totalSessions = pData.semuaSesi.length;
        const chunks: SesiInfo[][] = [];

        if (totalSessions <= maxSessionsPerPage) {
          chunks.push(pData.semuaSesi);
        } else {
          for (let i = 0; i < totalSessions; i += maxSessionsPerPage) {
            chunks.push(pData.semuaSesi.slice(i, i + maxSessionsPerPage));
          }
        }

        const rowsToRender = [...pData.peserta];
        const minRows = 20;
        while (rowsToRender.length < minRows) {
          rowsToRender.push({
            noPeserta: "",
            nama: "",
            marhalah: "",
          });
        }

        return chunks.map((chunkSesi, cIdx) => {
          const chunkSessionCount = chunkSesi.length;
          // Kolom identitas: NO (4%), NAMA SANTRI (20%), NO. PESERTA (14%), JUMLAH HADIR (7%) = Total 45%
          // Sisa 55% dibagi rata untuk kolom Sesi
          const sessionColWidth = chunkSessionCount > 0 ? `${(55 / chunkSessionCount).toFixed(2)}%` : "55%";
          const yearStr = pData.ehb.tahunAjaran ? pData.ehb.tahunAjaran.split("/")[0] : "2026";

          return (
            <Page
              key={`${pIdx}-${cIdx}`}
              size="A4"
              orientation="landscape"
              style={styles.pageLandscape}
            >
              {/* KOP HIJAU RESMI */}
              <View style={styles.kopContainer}>
                {logoDataUri ? (
                  <Image src={logoDataUri} style={styles.logo} />
                ) : (
                  <View style={[styles.logo, { backgroundColor: "#e2e8f0" }]} />
                )}
                <View style={styles.kopCenterText}>
                  <Text style={styles.kopTitleGreen}>
                    REKAPITULASI DAFTAR HADIR PESERTA EHB (SEMUA SESI)
                  </Text>
                  <Text style={styles.kopSubLembagaGreen}>
                    PONDOK PESANTREN KH ZUMRATUL MUTTAQIN
                  </Text>
                  <Text style={styles.kopAlamat}>Gunung Pari - Kabupaten Tasikmalaya</Text>
                  <Text style={styles.kopSubPeriode}>
                    Evaluasi Hasil Belajar (EHB) | Semester {pData.ehb.semester} | Tahun Pelajaran {pData.ehb.tahunAjaran}
                    {chunks.length > 1 && ` (Bagian ${cIdx + 1} dari ${chunks.length})`}
                  </Text>
                </View>
              </View>

              <View style={styles.kopGreenDivider} />

              {/* INFO KELAS & RUANG */}
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 5, fontSize: 8 }}>
                <View style={{ flexDirection: "row", width: "45%" }}>
                  <Text style={{ width: 85 }}>Kelas / Tingkat</Text>
                  <Text style={{ width: 8 }}>:</Text>
                  <Text style={{ flex: 1, borderBottomWidth: 0.5, borderBottomColor: "#9ca3af", borderStyle: "dotted", fontWeight: "bold" }}>
                    {pData.marhalahNama || "......................................................."}
                  </Text>
                </View>
                <View style={{ flexDirection: "row", width: "45%" }}>
                  <Text style={{ width: 60 }}>Ruang</Text>
                  <Text style={{ width: 8 }}>:</Text>
                  <Text style={{ flex: 1, borderBottomWidth: 0.5, borderBottomColor: "#9ca3af", borderStyle: "dotted", fontWeight: "bold" }}>
                    {pData.ruangan.nama}
                  </Text>
                </View>
              </View>

              {/* TABEL HIJAU REKAP SEMUA SESI */}
              <View style={styles.table}>
                {/* Header */}
                <View style={styles.tableHeaderRowGreen}>
                  <Text style={[styles.thGreen, { width: "4%" }]}>NO</Text>
                  <Text style={[styles.thGreen, { width: "20%", textAlign: "left", paddingLeft: 4 }]}>
                    NAMA SANTRI
                  </Text>
                  <Text style={[styles.thGreen, { width: "14%" }]}>NO. PESERTA</Text>

                  {/* Header Kolom Tiap Sesi */}
                  {chunkSesi.map((s, sIdx) => {
                    const sesiNum = s.nomorSesi ?? (cIdx * maxSessionsPerPage + sIdx + 1);
                    const hari = s.hari || getHariFromDate(s.tanggal);
                    const mapel = s.mapelRingkasan || "Mapel";

                    return (
                      <View
                        key={s.id}
                        style={[
                          styles.thGreen,
                          {
                            width: sessionColWidth,
                            paddingVertical: 1.5,
                          },
                        ]}
                      >
                        <Text style={{ fontWeight: "bold" }}>Sesi {sesiNum}</Text>
                        <Text style={{ fontSize: 6.5 }}>{hari}</Text>
                        <Text style={{ fontSize: 6, fontWeight: "normal" }}>{mapel}</Text>
                      </View>
                    );
                  })}

                  <Text style={[styles.thGreen, { width: "7%", borderRightWidth: 0 }]}>
                    JUMLAH{"\n"}HADIR
                  </Text>
                </View>

                {/* Baris Santri (20 baris persis template) */}
                {rowsToRender.map((row, rIdx) => (
                  <View key={rIdx} style={[styles.tableRow, { minHeight: 14.5 }]}>
                    <Text style={[styles.td, { width: "4%", textAlign: "center" }]}>{rIdx + 1}</Text>
                    <Text style={[styles.td, { width: "20%", fontWeight: "bold" }]}>{row.nama}</Text>
                    <Text style={[styles.td, { width: "14%", textAlign: "center", fontWeight: "bold" }]}>
                      {row.noPeserta}
                    </Text>

                    {/* Kotak Paraf Tiap Sesi */}
                    {chunkSesi.map((s) => (
                      <Text
                        key={s.id}
                        style={[
                          styles.td,
                          {
                            width: sessionColWidth,
                            textAlign: "center",
                          },
                        ]}
                      ></Text>
                    ))}

                    <Text style={[styles.td, { width: "7%", borderRightWidth: 0, textAlign: "center" }]}></Text>
                  </View>
                ))}
              </View>

              {/* FOOTER & 2 TANDA TANGAN */}
              <View style={{ fontSize: 7, fontStyle: "italic", color: "#374151", marginBottom: 4 }}>
                <Text>
                  Keterangan: isi kolom sesi dengan paraf santri / tanda centang (v) jika hadir, S = Sakit, I = Izin, A = Alpa.
                </Text>
              </View>

              <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 2, fontSize: 7.5 }}>
                {/* Kiri: Ketua Panitia EHB */}
                <View style={{ width: "32%", textAlign: "center" }}>
                  <Text>Mengetahui,</Text>
                  <Text style={{ fontWeight: "bold" }}>Ketua Panitia EHB</Text>
                  <View style={{ height: 26 }} />
                  <Text>(......................................)</Text>
                </View>

                {/* Kanan: Sekretaris Panitia */}
                <View style={{ width: "32%", textAlign: "center" }}>
                  <Text>Gunung Pari, ........................ {yearStr}</Text>
                  <Text style={{ fontWeight: "bold" }}>Sekretaris Panitia</Text>
                  <View style={{ height: 26 }} />
                  <Text>(......................................)</Text>
                </View>
              </View>
            </Page>
          );
        });
      })}
    </Document>
  );
}

/* eslint-disable jsx-a11y/alt-text */
import React from "react";
import { View, Text, Image, StyleSheet } from "@react-pdf/renderer";
import fs from "fs";
import path from "path";

export interface LembagaInfo {
  judul_lembaga?: string | null;
  nama_lembaga?: string | null;
  alamat_header?: string | null;
  tempat_terbit?: string | null;
  nama_pimpinan?: string | null;
  logo_path?: string | null;
}

const styles = StyleSheet.create({
  kopContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
    gap: 12,
  },
  logo: {
    width: 44,
    height: 44,
    objectFit: "contain",
  },
  kopTextContainer: {
    flex: 1,
    textAlign: "center",
  },
  kopJudul: {
    fontSize: 9.5,
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    color: "#111827",
  },
  kopLembaga: {
    fontSize: 12.5,
    fontWeight: "bold",
    textTransform: "uppercase",
    color: "#065f46", // Dark Emerald resmi pesantren
    letterSpacing: 0.5,
    marginTop: 1,
  },
  kopAlamat: {
    fontSize: 7.5,
    color: "#4b5563",
    marginTop: 1.5,
  },
  kopDividerDouble: {
    borderBottomWidth: 1.8,
    borderBottomColor: "#111827",
    marginBottom: 1,
    marginTop: 3,
  },
  kopDividerThin: {
    borderBottomWidth: 0.6,
    borderBottomColor: "#111827",
    marginBottom: 6,
  },
});

export function KopSuratPdf({
  lembaga,
  fontFamily = "Helvetica",
}: {
  lembaga?: LembagaInfo | null;
  fontFamily?: string;
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
    <View style={{ width: "100%", fontFamily }}>
      <View style={styles.kopContainer}>
        {logoDataUri ? (
          <Image src={logoDataUri} style={styles.logo} />
        ) : (
          <View style={[styles.logo, { backgroundColor: "#e2e8f0" }]} />
        )}

        <View style={styles.kopTextContainer}>
          <Text style={styles.kopJudul}>
            {lembaga?.judul_lembaga || "PONDOK PESANTREN"}
          </Text>
          <Text style={styles.kopLembaga}>
            {lembaga?.nama_lembaga || "KH. ZUMRATUL MUTTAQIN"}
          </Text>
          <Text style={styles.kopAlamat}>
            {lembaga?.alamat_header ||
              "Jl. Pesantren Sukahideng, Tasikmalaya, Jawa Barat"}
          </Text>
        </View>

        {/* Dummy spacer for symmetry */}
        <View style={{ width: 44 }} />
      </View>

      <View style={styles.kopDividerDouble} />
      <View style={styles.kopDividerThin} />
    </View>
  );
}

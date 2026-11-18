import React from "react";
import { getPengaturanLembagaAction } from "../actions/pengaturan";
import { PengaturanClient } from "./pengaturan-client";

export const metadata = {
  title: "Pengaturan Titimangsa & Lembaga | Sistem Raport KHZM",
  description: "Konfigurasi tempat terbit, tanggal raport, dan kop lembaga resmi.",
};

export default async function PengaturanPage() {
  const result = await getPengaturanLembagaAction();

  const initialData = result.data || {
    judul_lembaga: "LEMBAGA PENDIDIKAN PONDOK PESANTREN",
    nama_lembaga: "KH ZUMRATUL MUTTAQIN",
    alamat_header: "SUKARAME TASIKMALAYA JAWA BARAT",
    tempat_terbit: "Sukamenak",
    tanggal_raport: "20 Desember 2025",
    nama_pimpinan: "KH. MIMIH SAEFUL MILLAH, S.Pd",
  };

  return <PengaturanClient initialData={initialData} />;
}

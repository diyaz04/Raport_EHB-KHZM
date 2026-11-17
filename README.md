# Sistem Manajemen EHB & Raport Santri KH. Zumratul Muttaqin (KHZM)

Aplikasi terintegrasi untuk pengelolaan akademik, Evaluasi Hasil Belajar (EHB), dan penerbitan raport santri Pondok Pesantren KH. Zumratul Muttaqin berbasis Next.js 16 (App Router), React 19, Tailwind CSS v4, dan Supabase PostgreSQL dengan Row-Level Security (RLS).

---

## 🚀 Fitur Utama

- **Panel Administrator**:
  - Manajemen Tahun Ajaran, Semester, Marhalah (Kelas), Data Santri, dan Pendidik/Guru.
  - Pengaturan Kurikulum (Mata Pelajaran, Kitab, Pengampu, dan Wali Kelas).
  - Manajemen Evaluasi Hasil Belajar (EHB):
    - Pembagian Ruangan Ujian & Kapasitas Kursi.
    - Penjadwalan Sesi Waktu Ujian.
    - Pemetaan Jadwal Mapel & Kitab per Marhalah per Sesi.
    - Generate Nomor Peserta Ujian otomatis & stabil (`{kode TA}-{kode marhalah}-{urut 3 digit}`).
    - Alokasi Kursi/Ruangan otomatis (mode per marhalah atau selang-seling antarmarhalah) serta geser manual via Combobox.
    - Dokumen PDF Resmi React-PDF: Kartu Peserta Ujian (2 per lembar A4 potong), Berita Acara (2 rangkap per A4), dan Daftar Hadir Peserta (mode Per Sesi atau Rekap Semua Sesi).
  - Cetak Raport Massal per kelas ke file PDF tunggal (hanya santri berstatus final) dengan proteksi serverless limit & direct stream.
  - Verifikasi Keabsahan Raport Santri publik via QR Code & HMAC Signature.
- **Panel Guru**:
  - Input Nilai Mapel & Kitab berdasarkan penugasan pengampu.
  - Pengisian Catatan Semester & Nilai Sikap oleh Wali Kelas.

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 16 (App Router, Turbopack)](https://nextjs.org)
- **UI Library**: [React 19](https://react.dev), [Tailwind CSS v4](https://tailwindcss.com) (`@tailwindcss/postcss`), [shadcn/ui](https://ui.shadcn.com), [Lucide React](https://lucide.dev)
- **Database & Auth**: [Supabase](https://supabase.com) (PostgreSQL 15+, Row-Level Security, Auth SSR)
- **PDF Generation**: [@react-pdf/renderer](https://react-pdf.org)
- **Validasi Form**: [Zod v4](https://zod.dev) & React Hook Form
- **Enkripsi & Keamanan**: Web Crypto API (HMAC-SHA256 untuk tanda tangan digital raport)

---

## 📦 Setup & Instalasi Lokal

### 1. Kloning Repositori & Instal Dependencies
```bash
git clone <url-repositori-anda>
cd "EHB dan Raport KHZM"
npm install
```

### 2. Salin Konfigurasi Environment
Buat berkas `.env.local` dari `.env.example`:
```bash
cp .env.example .env.local
```

### 3. Jalankan Development Server
```bash
npm run dev
```
Buka browser di [http://localhost:3000](http://localhost:3000).

---

## 🗄️ Urutan Migrasi Database Supabase

Seluruh migrasi database berada pada folder `supabase/migrations/` dan **wajib dijalankan secara berurutan** pada menu **SQL Editor** di dashboard Supabase:

1. **`001_inti.sql`**
   - Membuat skema tabel inti: `profiles`, `tahun_ajaran`, `semester`, `marhalah`, `santri`, `enrollment`, `mapel`, `kitab`, `marhalah_mapel`, `guru_marhalah`, `pengampu`, `pengaturan_lembaga`.
   - Mengaktifkan Row-Level Security (RLS) dan trigger otomatis timestamp.
2. **`002_nilai_raport.sql`**
   - Membuat skema penilaian dan raport: `nilai`, `catatan_semester`, `status_raport`, `peringkat_final`, `raport_terbit`, `audit_log`.
   - Constraints nilai (rentang 0–100), status raport (`draft`, `dikunci`, `final`), serta trigger audit trail.
3. **`003_hitung_rls.sql`**
   - Menambahkan stored procedures database untuk agregasi nilai, kalkulasi raport semester, perangkingan santri otomatis, dan kebijakan RLS granular (admin full-access, guru wali kelas/pengampu terisolasi per marhalah, dan verifikasi publik).
4. **`004_ehb.sql`**
   - Membuat skema Evaluasi Hasil Belajar (EHB): `ehb`, `ehb_ruangan`, `ehb_sesi`, `ehb_jadwal`, `ehb_peserta`, `ehb_pengawas`.
   - Mengaktifkan RLS proteksi khusus admin.
5. **`005_ehb_peserta_penempatan.sql`**
   - Menambahkan stored procedure transaksi atomik:
     - `generate_ehb_nomor_peserta()`: Penomoran peserta stabil format konfigurasi.
     - `alokasikan_ruangan_ehb()`: Distribusi kursi otomatis (mode per marhalah atau selang-seling).

---

## 🧪 Cara Seed Data Uji (13 Santriwati)

Untuk mengisi data demonstrasi awal (Tahun Ajaran 2025/2026, Semester Ganjil, Marhalah Ibtida Awal PI, 13 Santriwati, Kurikulum Kitab, dan Nilai Ujian), jalankan berkas berikut di Supabase SQL Editor:

```sql
-- Jalankan isi file:
supabase/seed/seed_uji_ibtida_awal_pi.sql
```

Data uji ini mencakup:
- 13 Santriwati Marhalah Ibtida Awal PI.
- 7 Mata Pelajaran & Kitab (Fiqih, Tauhid, Nahwu, Shorof, Hadits, Tafsir, Akhlaq).
- Nilai lengkap untuk simulasi perhitungan raport dan pengujian EHB.

---

## ☁️ Daftar Environment Variables di Vercel

Saat melakukan deployment ke **Vercel**, tambahkan variabel-variabel lingkungan berikut pada menu **Project Settings > Environment Variables**:

| Nama Variabel | Wajib | Keterangan | Contoh Nilai |
| :--- | :---: | :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | **Ya** | URL REST API proyek Supabase Anda | `https://xyzprojectid.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **Ya** | Anon public API key Supabase | `eyJhbGciOi...` |
| `SUPABASE_SERVICE_ROLE_KEY` | **Ya** | Service role secret key Supabase (Server-only) | `eyJhbGciOi...` |
| `NEXT_PUBLIC_APP_URL` | **Ya** | Domain publik aplikasi produksi (tanpa trailing slash) | `https://raport-khzm.vercel.app` |
| `RAPORT_HMAC_SECRET` | **Ya** | Kunci rahasia minimal 32 karakter untuk hash tanda tangan digital QR Code raport | `k3y-s3cr3t-hmac-khzm-2026-sangat-rahasia` |

> [!IMPORTANT]
> Pastikan `SUPABASE_SERVICE_ROLE_KEY` dan `RAPORT_HMAC_SECRET` **TIDAK** diawali dengan `NEXT_PUBLIC_` agar tidak bocor ke client-side bundle browser.

---

## 🔒 Audit Keamanan & Kualitas Kode

Sesuai standar hardening Step 24:
- **Linting**: Bersih (`npm run lint` = 0 error, 0 warning).
- **Type Checking**: Bersih (`npx tsc --noEmit` = 0 error).
- **Production Build**: Lolos kompilasi penuh Next.js 16 (`npm run build`).
- **Audit RLS**: 24 dari 24 tabel database memiliki Row-Level Security aktif. **Nol** policy menggunakan `USING (true)` atau `WITH CHECK (true)` tanpa otorisasi.
- **Audit UI**: Seluruh dialog konfirmasi menggunakan modal shadcn `AlertDialog` / `Dialog` dan seluruh input dropdown menggunakan shadcn `Select` / `Combobox` (tidak ada native `alert`, `confirm`, `prompt`, atau `<select>`).

-- ==============================================================================
-- MIGRATION 001: TABEL INTI
-- Sistem EHB dan Raport KH Zumratul Muttaqin
-- ==============================================================================

-- 1. PROFILES (Pengguna Sistem, relasi 1:1 ke auth.users)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    nama TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'guru')),
    aktif BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. TAHUN AJARAN
CREATE TABLE IF NOT EXISTS tahun_ajaran (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nama TEXT NOT NULL,
    kode VARCHAR(4) NOT NULL, -- contoh: '2526'
    aktif BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. SEMESTER
CREATE TABLE IF NOT EXISTS semester (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tahun_ajaran_id UUID NOT NULL REFERENCES tahun_ajaran(id) ON DELETE CASCADE,
    jenis TEXT NOT NULL CHECK (jenis IN ('Ganjil', 'Genap')),
    aktif BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_semester_ta_jenis UNIQUE (tahun_ajaran_id, jenis)
);

-- 4. MARHALAH (Jenjang / Tingkat Kelas)
CREATE TABLE IF NOT EXISTS marhalah (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nama TEXT NOT NULL,
    kode VARCHAR(2) NOT NULL,
    urutan INT NOT NULL,
    deleted_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. SANTRI (Data Siswa)
CREATE TABLE IF NOT EXISTS santri (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nis TEXT NULL UNIQUE,
    nama TEXT NOT NULL,
    jenis_kelamin VARCHAR(1) NULL CHECK (jenis_kelamin IS NULL OR jenis_kelamin IN ('L', 'P')),
    deleted_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. ENROLLMENT (Pendaftaran Siswa ke Marhalah per Tahun Ajaran)
CREATE TABLE IF NOT EXISTS enrollment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    santri_id UUID NOT NULL REFERENCES santri(id) ON DELETE CASCADE,
    marhalah_id UUID NOT NULL REFERENCES marhalah(id) ON DELETE RESTRICT,
    tahun_ajaran_id UUID NOT NULL REFERENCES tahun_ajaran(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_enrollment_santri_ta UNIQUE (santri_id, tahun_ajaran_id)
);

-- 7. MAPEL (Mata Pelajaran)
CREATE TABLE IF NOT EXISTS mapel (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nama TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. KITAB
CREATE TABLE IF NOT EXISTS kitab (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nama TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. MARHALAH_MAPEL (Kurikulum Mata Pelajaran per Marhalah & Semester)
CREATE TABLE IF NOT EXISTS marhalah_mapel (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    marhalah_id UUID NOT NULL REFERENCES marhalah(id) ON DELETE CASCADE,
    semester_id UUID NOT NULL REFERENCES semester(id) ON DELETE CASCADE,
    mapel_id UUID NOT NULL REFERENCES mapel(id) ON DELETE RESTRICT,
    kitab_id UUID NULL REFERENCES kitab(id) ON DELETE SET NULL,
    urutan INT NOT NULL CHECK (urutan BETWEEN 1 AND 12),
    tipe TEXT NOT NULL CHECK (tipe IN ('nilai', 'kelengkapan')),
    dihitung_total BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_marhalah_mapel_urutan UNIQUE (marhalah_id, semester_id, urutan)
);

-- 10. GURU_MARHALAH (Wali Kelas)
CREATE TABLE IF NOT EXISTS guru_marhalah (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guru_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    marhalah_id UUID NOT NULL REFERENCES marhalah(id) ON DELETE CASCADE,
    tahun_ajaran_id UUID NOT NULL REFERENCES tahun_ajaran(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. PENGAMPU (Guru Pengampu Mata Pelajaran)
CREATE TABLE IF NOT EXISTS pengampu (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guru_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    marhalah_mapel_id UUID NOT NULL REFERENCES marhalah_mapel(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. PENGATURAN_LEMBAGA (Konfigurasi Lembaga / Kop Raport)
CREATE TABLE IF NOT EXISTS pengaturan_lembaga (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    judul_lembaga TEXT NOT NULL,
    nama_lembaga TEXT NOT NULL,
    alamat_header TEXT NOT NULL,
    tempat_terbit TEXT NOT NULL,
    nama_pimpinan TEXT NOT NULL,
    logo_path TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- INDEXES UNTUK SETIAP FOREIGN KEY
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_semester_tahun_ajaran_id ON semester(tahun_ajaran_id);

CREATE INDEX IF NOT EXISTS idx_enrollment_santri_id ON enrollment(santri_id);
CREATE INDEX IF NOT EXISTS idx_enrollment_marhalah_id ON enrollment(marhalah_id);
CREATE INDEX IF NOT EXISTS idx_enrollment_tahun_ajaran_id ON enrollment(tahun_ajaran_id);

CREATE INDEX IF NOT EXISTS idx_marhalah_mapel_marhalah_id ON marhalah_mapel(marhalah_id);
CREATE INDEX IF NOT EXISTS idx_marhalah_mapel_semester_id ON marhalah_mapel(semester_id);
CREATE INDEX IF NOT EXISTS idx_marhalah_mapel_mapel_id ON marhalah_mapel(mapel_id);
CREATE INDEX IF NOT EXISTS idx_marhalah_mapel_kitab_id ON marhalah_mapel(kitab_id);

CREATE INDEX IF NOT EXISTS idx_guru_marhalah_guru_id ON guru_marhalah(guru_id);
CREATE INDEX IF NOT EXISTS idx_guru_marhalah_marhalah_id ON guru_marhalah(marhalah_id);
CREATE INDEX IF NOT EXISTS idx_guru_marhalah_tahun_ajaran_id ON guru_marhalah(tahun_ajaran_id);

CREATE INDEX IF NOT EXISTS idx_pengampu_guru_id ON pengampu(guru_id);
CREATE INDEX IF NOT EXISTS idx_pengampu_marhalah_mapel_id ON pengampu(marhalah_mapel_id);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) - AKTIF TANPA POLICY (Policy menyusul di Step 5)
-- ==============================================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tahun_ajaran ENABLE ROW LEVEL SECURITY;
ALTER TABLE semester ENABLE ROW LEVEL SECURITY;
ALTER TABLE marhalah ENABLE ROW LEVEL SECURITY;
ALTER TABLE santri ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollment ENABLE ROW LEVEL SECURITY;
ALTER TABLE mapel ENABLE ROW LEVEL SECURITY;
ALTER TABLE kitab ENABLE ROW LEVEL SECURITY;
ALTER TABLE marhalah_mapel ENABLE ROW LEVEL SECURITY;
ALTER TABLE guru_marhalah ENABLE ROW LEVEL SECURITY;
ALTER TABLE pengampu ENABLE ROW LEVEL SECURITY;
ALTER TABLE pengaturan_lembaga ENABLE ROW LEVEL SECURITY;

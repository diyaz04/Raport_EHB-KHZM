-- ==============================================================================
-- MIGRATION 002: NILAI DAN RAPORT
-- Sistem EHB dan Raport KH Zumratul Muttaqin
-- ==============================================================================

-- 1. NILAI (Pencatatan Nilai Siswa per Mapel Kurikulum)
CREATE TABLE IF NOT EXISTS nilai (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enrollment_id UUID NOT NULL REFERENCES enrollment(id) ON DELETE CASCADE,
    semester_id UUID NOT NULL REFERENCES semester(id) ON DELETE CASCADE,
    marhalah_mapel_id UUID NOT NULL REFERENCES marhalah_mapel(id) ON DELETE CASCADE,
    angka SMALLINT NULL CHECK (angka IS NULL OR (angka >= 0 AND angka <= 100)),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_nilai_enrollment_mapel UNIQUE (enrollment_id, marhalah_mapel_id)
);

-- 2. CATATAN_SEMESTER (Kepribadian, Presensi, Catatan Wali Kelas, Kenaikan Kelas)
CREATE TABLE IF NOT EXISTS catatan_semester (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enrollment_id UUID NOT NULL REFERENCES enrollment(id) ON DELETE CASCADE,
    semester_id UUID NOT NULL REFERENCES semester(id) ON DELETE CASCADE,
    akhlak TEXT NULL CHECK (akhlak IS NULL OR akhlak IN ('Sangat Baik', 'Baik', 'Cukup', 'Kurang')),
    ketekunan TEXT NULL CHECK (ketekunan IS NULL OR ketekunan IN ('Sangat Baik', 'Baik', 'Cukup', 'Kurang')),
    kerapihan TEXT NULL CHECK (kerapihan IS NULL OR kerapihan IN ('Sangat Baik', 'Baik', 'Cukup', 'Kurang')),
    kebersihan TEXT NULL CHECK (kebersihan IS NULL OR kebersihan IN ('Sangat Baik', 'Baik', 'Cukup', 'Kurang')),
    sakit INT NOT NULL DEFAULT 0 CHECK (sakit >= 0),
    izin INT NOT NULL DEFAULT 0 CHECK (izin >= 0),
    alpa INT NOT NULL DEFAULT 0 CHECK (alpa >= 0),
    saran_wali_kelas TEXT NULL,
    naik_ke_marhalah_id UUID NULL REFERENCES marhalah(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_catatan_semester_enrollment_sem UNIQUE (enrollment_id, semester_id)
);

-- 3. STATUS_RAPORT (Kunci Raport per Marhalah & Semester: Draft / Final)
CREATE TABLE IF NOT EXISTS status_raport (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    marhalah_id UUID NOT NULL REFERENCES marhalah(id) ON DELETE CASCADE,
    semester_id UUID NOT NULL REFERENCES semester(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('draft', 'final')),
    difinalisasi_oleh UUID NULL REFERENCES profiles(id) ON DELETE SET NULL,
    difinalisasi_pada TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_status_raport_marhalah_sem UNIQUE (marhalah_id, semester_id)
);

-- 4. PERINGKAT_FINAL (Peringkat Siswa per Semester setelah Penentuan Seri)
CREATE TABLE IF NOT EXISTS peringkat_final (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enrollment_id UUID NOT NULL REFERENCES enrollment(id) ON DELETE CASCADE,
    semester_id UUID NOT NULL REFERENCES semester(id) ON DELETE CASCADE,
    peringkat SMALLINT NOT NULL CHECK (peringkat > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_peringkat_final_enrollment_sem UNIQUE (enrollment_id, semester_id)
);

-- 5. RAPORT_TERBIT (Arsip Raport Final dengan Snapshot Data, Hash, dan Kode Verifikasi)
CREATE TABLE IF NOT EXISTS raport_terbit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enrollment_id UUID NOT NULL REFERENCES enrollment(id) ON DELETE CASCADE,
    semester_id UUID NOT NULL REFERENCES semester(id) ON DELETE CASCADE,
    versi INT NOT NULL DEFAULT 1 CHECK (versi > 0),
    kode_verifikasi TEXT NOT NULL UNIQUE,
    snapshot JSONB NOT NULL,
    hash TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('valid', 'dicabut', 'digantikan')),
    diterbitkan_oleh UUID NULL REFERENCES profiles(id) ON DELETE SET NULL,
    diterbitkan_pada TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. AUDIT_LOG (Rekam Jejak Perubahan Data Nilai dan Status)
CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tabel TEXT NOT NULL,
    record_id UUID NOT NULL,
    aksi TEXT NOT NULL,
    data_lama JSONB NULL,
    data_baru JSONB NULL,
    user_id UUID NULL REFERENCES profiles(id) ON DELETE SET NULL,
    mode TEXT NOT NULL CHECK (mode IN ('langsung', 'admin_langsung', 'act_as')),
    atas_nama UUID NULL REFERENCES profiles(id) ON DELETE SET NULL,
    waktu TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- INDEXES UNTUK SETIAP FOREIGN KEY & PENCARIAN
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_nilai_enrollment_id ON nilai(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_nilai_semester_id ON nilai(semester_id);
CREATE INDEX IF NOT EXISTS idx_nilai_marhalah_mapel_id ON nilai(marhalah_mapel_id);

CREATE INDEX IF NOT EXISTS idx_catatan_semester_enrollment_id ON catatan_semester(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_catatan_semester_semester_id ON catatan_semester(semester_id);
CREATE INDEX IF NOT EXISTS idx_catatan_semester_naik_ke_marhalah_id ON catatan_semester(naik_ke_marhalah_id);

CREATE INDEX IF NOT EXISTS idx_status_raport_marhalah_id ON status_raport(marhalah_id);
CREATE INDEX IF NOT EXISTS idx_status_raport_semester_id ON status_raport(semester_id);
CREATE INDEX IF NOT EXISTS idx_status_raport_difinalisasi_oleh ON status_raport(difinalisasi_oleh);

CREATE INDEX IF NOT EXISTS idx_peringkat_final_enrollment_id ON peringkat_final(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_peringkat_final_semester_id ON peringkat_final(semester_id);

CREATE INDEX IF NOT EXISTS idx_raport_terbit_enrollment_id ON raport_terbit(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_raport_terbit_semester_id ON raport_terbit(semester_id);
CREATE INDEX IF NOT EXISTS idx_raport_terbit_diterbitkan_oleh ON raport_terbit(diterbitkan_oleh);

CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_atas_nama ON audit_log(atas_nama);
CREATE INDEX IF NOT EXISTS idx_audit_log_record_id ON audit_log(record_id);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) - AKTIF TANPA POLICY (Policy menyusul di Step 5)
-- ==============================================================================
ALTER TABLE nilai ENABLE ROW LEVEL SECURITY;
ALTER TABLE catatan_semester ENABLE ROW LEVEL SECURITY;
ALTER TABLE status_raport ENABLE ROW LEVEL SECURITY;
ALTER TABLE peringkat_final ENABLE ROW LEVEL SECURITY;
ALTER TABLE raport_terbit ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- MIGRATION 004: MODUL EVALUASI HASIL BELAJAR (EHB)
-- Sistem EHB dan Raport KH Zumratul Muttaqin
-- ==============================================================================

-- 1. EHB (Event / Pelaksanaan Evaluasi Hasil Belajar Pesantren)
CREATE TABLE IF NOT EXISTS ehb (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nama TEXT NOT NULL,
    tahun_ajaran_id UUID NOT NULL REFERENCES tahun_ajaran(id) ON DELETE CASCADE,
    semester_id UUID NOT NULL REFERENCES semester(id) ON DELETE CASCADE,
    tanggal_mulai DATE NOT NULL,
    tanggal_selesai DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'dikunci')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_ehb_tanggal CHECK (tanggal_selesai >= tanggal_mulai)
);

-- 2. EHB_RUANGAN (Daftar Ruang Ujian & Kapasitas per EHB)
CREATE TABLE IF NOT EXISTS ehb_ruangan (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ehb_id UUID NOT NULL REFERENCES ehb(id) ON DELETE CASCADE,
    nama TEXT NOT NULL,
    kapasitas INT NOT NULL CHECK (kapasitas > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_ehb_ruangan_nama UNIQUE (ehb_id, nama)
);

-- 3. EHB_SESI (Waktu / Sesi Pelaksanaan Ujian per EHB)
CREATE TABLE IF NOT EXISTS ehb_sesi (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ehb_id UUID NOT NULL REFERENCES ehb(id) ON DELETE CASCADE,
    tanggal DATE NOT NULL,
    jam_mulai TIME NOT NULL,
    jam_selesai TIME NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_ehb_sesi_jam CHECK (jam_selesai > jam_mulai)
);

-- 4. EHB_JADWAL (Pemetaan Sesi Ujian ke Marhalah & Mata Pelajaran)
CREATE TABLE IF NOT EXISTS ehb_jadwal (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sesi_id UUID NOT NULL REFERENCES ehb_sesi(id) ON DELETE CASCADE,
    marhalah_id UUID NOT NULL REFERENCES marhalah(id) ON DELETE CASCADE,
    marhalah_mapel_id UUID NOT NULL REFERENCES marhalah_mapel(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_ehb_jadwal_sesi_marhalah UNIQUE (sesi_id, marhalah_id),
    CONSTRAINT uq_ehb_jadwal_sesi_mapel UNIQUE (sesi_id, marhalah_mapel_id)
);

-- 5. EHB_PESERTA (Alokasi Santri, Nomor Peserta Ujian, Ruangan, dan Nomor Urut)
CREATE TABLE IF NOT EXISTS ehb_peserta (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ehb_id UUID NOT NULL REFERENCES ehb(id) ON DELETE CASCADE,
    enrollment_id UUID NOT NULL REFERENCES enrollment(id) ON DELETE CASCADE,
    no_peserta TEXT NOT NULL,
    ruangan_id UUID NULL REFERENCES ehb_ruangan(id) ON DELETE SET NULL,
    no_urut INT NULL CHECK (no_urut IS NULL OR no_urut > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_ehb_peserta_no_peserta UNIQUE (ehb_id, no_peserta),
    CONSTRAINT uq_ehb_peserta_enrollment UNIQUE (ehb_id, enrollment_id)
);

-- 6. EHB_PENGAWAS (Penugasan Pengawas Ruang per Sesi Ujian)
CREATE TABLE IF NOT EXISTS ehb_pengawas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sesi_id UUID NOT NULL REFERENCES ehb_sesi(id) ON DELETE CASCADE,
    ruangan_id UUID NOT NULL REFERENCES ehb_ruangan(id) ON DELETE CASCADE,
    guru_id UUID NULL REFERENCES profiles(id) ON DELETE SET NULL,
    nama_manual TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_ehb_pengawas_identitas CHECK (
        guru_id IS NOT NULL OR (nama_manual IS NOT NULL AND btrim(nama_manual) <> '')
    )
);

-- ==============================================================================
-- INDEXES UNTUK INTEGRITAS FOREIGN KEY & PERFORMA QUERY
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_ehb_tahun_ajaran_id ON ehb(tahun_ajaran_id);
CREATE INDEX IF NOT EXISTS idx_ehb_semester_id ON ehb(semester_id);
CREATE INDEX IF NOT EXISTS idx_ehb_status ON ehb(status);

CREATE INDEX IF NOT EXISTS idx_ehb_ruangan_ehb_id ON ehb_ruangan(ehb_id);

CREATE INDEX IF NOT EXISTS idx_ehb_sesi_ehb_id ON ehb_sesi(ehb_id);
CREATE INDEX IF NOT EXISTS idx_ehb_sesi_tanggal ON ehb_sesi(tanggal);

CREATE INDEX IF NOT EXISTS idx_ehb_jadwal_sesi_id ON ehb_jadwal(sesi_id);
CREATE INDEX IF NOT EXISTS idx_ehb_jadwal_marhalah_id ON ehb_jadwal(marhalah_id);
CREATE INDEX IF NOT EXISTS idx_ehb_jadwal_marhalah_mapel_id ON ehb_jadwal(marhalah_mapel_id);

CREATE INDEX IF NOT EXISTS idx_ehb_peserta_ehb_id ON ehb_peserta(ehb_id);
CREATE INDEX IF NOT EXISTS idx_ehb_peserta_enrollment_id ON ehb_peserta(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_ehb_peserta_ruangan_id ON ehb_peserta(ruangan_id);

CREATE INDEX IF NOT EXISTS idx_ehb_pengawas_sesi_id ON ehb_pengawas(sesi_id);
CREATE INDEX IF NOT EXISTS idx_ehb_pengawas_ruangan_id ON ehb_pengawas(ruangan_id);
CREATE INDEX IF NOT EXISTS idx_ehb_pengawas_guru_id ON ehb_pengawas(guru_id);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) & POLICIES (ADMIN SAJA)
-- ==============================================================================
ALTER TABLE ehb ENABLE ROW LEVEL SECURITY;
ALTER TABLE ehb_ruangan ENABLE ROW LEVEL SECURITY;
ALTER TABLE ehb_sesi ENABLE ROW LEVEL SECURITY;
ALTER TABLE ehb_jadwal ENABLE ROW LEVEL SECURITY;
ALTER TABLE ehb_peserta ENABLE ROW LEVEL SECURITY;
ALTER TABLE ehb_pengawas ENABLE ROW LEVEL SECURITY;

-- Policy Admin Saja untuk Seluruh Tabel Modul EHB
CREATE POLICY "ehb_admin_all" ON ehb
    FOR ALL TO authenticated
    USING (is_admin())
    WITH CHECK (is_admin());

CREATE POLICY "ehb_ruangan_admin_all" ON ehb_ruangan
    FOR ALL TO authenticated
    USING (is_admin())
    WITH CHECK (is_admin());

CREATE POLICY "ehb_sesi_admin_all" ON ehb_sesi
    FOR ALL TO authenticated
    USING (is_admin())
    WITH CHECK (is_admin());

CREATE POLICY "ehb_jadwal_admin_all" ON ehb_jadwal
    FOR ALL TO authenticated
    USING (is_admin())
    WITH CHECK (is_admin());

CREATE POLICY "ehb_peserta_admin_all" ON ehb_peserta
    FOR ALL TO authenticated
    USING (is_admin())
    WITH CHECK (is_admin());

CREATE POLICY "ehb_pengawas_admin_all" ON ehb_pengawas
    FOR ALL TO authenticated
    USING (is_admin())
    WITH CHECK (is_admin());

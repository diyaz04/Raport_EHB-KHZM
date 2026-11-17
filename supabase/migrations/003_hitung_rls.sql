-- ==============================================================================
-- MIGRATION 003: HITUNG, FUNGSI, DAN RLS
-- Sistem EHB dan Raport KH Zumratul Muttaqin
-- ==============================================================================

-- ==============================================================================
-- 1. FUNGSI TERBILANG BAHASA INDONESIA
-- ==============================================================================
CREATE OR REPLACE FUNCTION terbilang_id(val INT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    satuan TEXT[] := ARRAY['', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima', 'Enam', 'Tujuh', 'Delapan', 'Sembilan', 'Sepuluh', 'Sebelas'];
    hasil TEXT := '';
BEGIN
    IF val IS NULL OR val = 0 THEN
        RETURN 'Nol';
    END IF;

    IF val < 0 THEN
        RETURN 'Minus ' || terbilang_id(ABS(val));
    END IF;

    IF val <= 11 THEN
        RETURN satuan[val + 1];
    ELSIF val < 20 THEN
        RETURN terbilang_id(val - 10) || ' Belas';
    ELSIF val < 100 THEN
        hasil := satuan[(val / 10) + 1] || ' Puluh';
        IF (val % 10) > 0 THEN
            hasil := hasil || ' ' || satuan[(val % 10) + 1];
        END IF;
        RETURN hasil;
    ELSIF val = 100 THEN
        RETURN 'Seratus';
    ELSIF val < 200 THEN
        RETURN 'Seratus ' || terbilang_id(val - 100);
    ELSIF val < 1000 THEN
        hasil := satuan[(val / 100) + 1] || ' Ratus';
        IF (val % 100) > 0 THEN
            hasil := hasil || ' ' || terbilang_id(val % 100);
        END IF;
        RETURN hasil;
    ELSE
        RETURN val::TEXT;
    END IF;
END;
$$;

-- ==============================================================================
-- 2. FUNGSI HELPER KEAMANAN & AKSES PENGGUNA
-- ==============================================================================

-- Helper 1: Memeriksa apakah user saat ini adalah admin aktif
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
          AND role = 'admin'
          AND aktif = TRUE
    );
$$;

-- Helper 2: Memeriksa apakah user adalah wali kelas untuk marhalah dan TA tertentu
CREATE OR REPLACE FUNCTION is_wali_kelas(p_marhalah_id UUID, p_tahun_ajaran_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM guru_marhalah gm
        JOIN profiles p ON p.id = gm.guru_id
        WHERE gm.guru_id = auth.uid()
          AND gm.marhalah_id = p_marhalah_id
          AND gm.tahun_ajaran_id = p_tahun_ajaran_id
          AND p.aktif = TRUE
    );
$$;

-- Helper 3: Memeriksa hak edit nilai (Admin, Wali Kelas, atau Pengampu Mapel)
CREATE OR REPLACE FUNCTION can_edit_nilai(p_marhalah_mapel_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_marhalah_id UUID;
    v_tahun_ajaran_id UUID;
    v_is_pengampu BOOLEAN;
BEGIN
    IF is_admin() THEN
        RETURN TRUE;
    END IF;

    SELECT mm.marhalah_id, sem.tahun_ajaran_id
    INTO v_marhalah_id, v_tahun_ajaran_id
    FROM marhalah_mapel mm
    JOIN semester sem ON sem.id = mm.semester_id
    WHERE mm.id = p_marhalah_mapel_id;

    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    -- Bila user adalah wali kelas marhalah tsb
    IF is_wali_kelas(v_marhalah_id, v_tahun_ajaran_id) THEN
        RETURN TRUE;
    END IF;

    -- Bila user adalah guru pengampu mapel tsb
    SELECT EXISTS (
        SELECT 1 FROM pengampu p
        JOIN profiles pr ON pr.id = p.guru_id
        WHERE p.guru_id = auth.uid()
          AND p.marhalah_mapel_id = p_marhalah_mapel_id
          AND pr.aktif = TRUE
    ) INTO v_is_pengampu;

    RETURN v_is_pengampu;
END;
$$;

-- ==============================================================================
-- 3. VIEWS KALKULASI & AGREGASI
-- ==============================================================================

-- View 1: v_raport_nilai
-- Rincian nilai santri per enrollment dan semester lengkap dengan terbilang,
-- jumlah total nilai murni, rata-rata half-up, dan rata-rata marhalah per mapel (1 desimal).
CREATE OR REPLACE VIEW v_raport_nilai AS
WITH rata_marhalah AS (
    SELECT
        mm.marhalah_id,
        mm.semester_id,
        mm.id AS marhalah_mapel_id,
        CASE
            WHEN mm.tipe = 'kelengkapan' THEN 0.0
            ELSE ROUND(COALESCE(AVG(n.angka), 0)::NUMERIC, 1)
        END AS rata_rata_marhalah
    FROM marhalah_mapel mm
    LEFT JOIN nilai n ON n.marhalah_mapel_id = mm.id
    GROUP BY mm.marhalah_id, mm.semester_id, mm.id, mm.tipe
),
rekap_santri AS (
    SELECT
        e.id AS enrollment_id,
        mm.semester_id,
        COALESCE(SUM(CASE WHEN mm.tipe = 'nilai' AND mm.dihitung_total = TRUE THEN n.angka ELSE 0 END), 0) AS total_nilai,
        COUNT(CASE WHEN mm.tipe = 'nilai' AND mm.dihitung_total = TRUE AND n.angka IS NOT NULL THEN 1 END) AS count_mapel_nilai
    FROM enrollment e
    CROSS JOIN semester s
    JOIN marhalah_mapel mm ON mm.marhalah_id = e.marhalah_id AND mm.semester_id = s.id
    LEFT JOIN nilai n ON n.enrollment_id = e.id AND n.marhalah_mapel_id = mm.id
    GROUP BY e.id, mm.semester_id
)
SELECT
    e.id AS enrollment_id,
    e.santri_id,
    st.nis,
    st.nama AS nama_santri,
    e.marhalah_id,
    m.nama AS nama_marhalah,
    e.tahun_ajaran_id,
    ta.nama AS nama_tahun_ajaran,
    mm.semester_id,
    sem.jenis AS semester_jenis,
    mm.id AS marhalah_mapel_id,
    mm.urutan AS mapel_urutan,
    mp.nama AS nama_mapel,
    kb.nama AS nama_kitab,
    mm.tipe AS mapel_tipe,
    mm.dihitung_total,
    n.angka,
    CASE
        WHEN mm.tipe = 'kelengkapan' THEN 'Nol'
        WHEN n.angka IS NOT NULL THEN terbilang_id(n.angka)
        ELSE '-'
    END AS angka_huruf,
    rm.rata_rata_marhalah,
    TO_CHAR(rm.rata_rata_marhalah, 'FM990.0') AS rata_rata_marhalah_str,
    rs.total_nilai,
    -- Rata-rata dibulatkan HALF-UP non-bankers ke bilangan bulat
    CASE
        WHEN rs.count_mapel_nilai > 0 THEN
            FLOOR((rs.total_nilai::NUMERIC / rs.count_mapel_nilai) + 0.5)::INT
        ELSE 0
    END AS rata_rata_akhir
FROM enrollment e
JOIN santri st ON st.id = e.santri_id
JOIN marhalah m ON m.id = e.marhalah_id
JOIN tahun_ajaran ta ON ta.id = e.tahun_ajaran_id
JOIN marhalah_mapel mm ON mm.marhalah_id = e.marhalah_id
JOIN semester sem ON sem.id = mm.semester_id AND sem.tahun_ajaran_id = e.tahun_ajaran_id
JOIN mapel mp ON mp.id = mm.mapel_id
LEFT JOIN kitab kb ON kb.id = mm.kitab_id
LEFT JOIN nilai n ON n.enrollment_id = e.id AND n.marhalah_mapel_id = mm.id
JOIN rata_marhalah rm ON rm.marhalah_mapel_id = mm.id
JOIN rekap_santri rs ON rs.enrollment_id = e.id AND rs.semester_id = mm.semester_id;

-- View 2: v_peringkat
-- Peringkat sementara berdasarkan total nilai santri & identifikasi nilai seri
CREATE OR REPLACE VIEW v_peringkat AS
WITH total_per_santri AS (
    SELECT
        e.id AS enrollment_id,
        e.santri_id,
        st.nama AS nama_santri,
        e.marhalah_id,
        e.tahun_ajaran_id,
        mm.semester_id,
        COALESCE(SUM(CASE WHEN mm.tipe = 'nilai' AND mm.dihitung_total = TRUE THEN n.angka ELSE 0 END), 0) AS total_nilai,
        COUNT(CASE WHEN mm.tipe = 'nilai' AND mm.dihitung_total = TRUE AND n.angka IS NOT NULL THEN 1 END) AS count_mapel,
        CASE
            WHEN COUNT(CASE WHEN mm.tipe = 'nilai' AND mm.dihitung_total = TRUE AND n.angka IS NOT NULL THEN 1 END) > 0 THEN
                FLOOR((COALESCE(SUM(CASE WHEN mm.tipe = 'nilai' AND mm.dihitung_total = TRUE THEN n.angka ELSE 0 END)::NUMERIC, 0) /
                COUNT(CASE WHEN mm.tipe = 'nilai' AND mm.dihitung_total = TRUE AND n.angka IS NOT NULL THEN 1 END)) + 0.5)::INT
            ELSE 0
        END AS rata_rata_akhir
    FROM enrollment e
    JOIN santri st ON st.id = e.santri_id
    CROSS JOIN semester s
    JOIN marhalah_mapel mm ON mm.marhalah_id = e.marhalah_id AND mm.semester_id = s.id
    LEFT JOIN nilai n ON n.enrollment_id = e.id AND n.marhalah_mapel_id = mm.id
    GROUP BY e.id, e.santri_id, st.nama, e.marhalah_id, e.tahun_ajaran_id, mm.semester_id
)
SELECT
    t.enrollment_id,
    t.santri_id,
    t.nama_santri,
    t.marhalah_id,
    t.tahun_ajaran_id,
    t.semester_id,
    t.total_nilai,
    t.rata_rata_akhir,
    DENSE_RANK() OVER (
        PARTITION BY t.marhalah_id, t.semester_id
        ORDER BY t.total_nilai DESC
    ) AS rank_sementara,
    (COUNT(*) OVER (
        PARTITION BY t.marhalah_id, t.semester_id, t.total_nilai
    ) > 1) AS is_seri
FROM total_per_santri t;

-- View 3: v_progres_kelas
-- Progres pengisian nilai dan catatan semester per marhalah dan semester
CREATE OR REPLACE VIEW v_progres_kelas AS
WITH mapel_count AS (
    SELECT
        mm.marhalah_id,
        mm.semester_id,
        COUNT(*) AS total_mapel_nilai
    FROM marhalah_mapel mm
    WHERE mm.tipe = 'nilai'
    GROUP BY mm.marhalah_id, mm.semester_id
),
santri_count AS (
    SELECT
        e.marhalah_id,
        sem.id AS semester_id,
        COUNT(DISTINCT e.id) AS jumlah_santri
    FROM enrollment e
    JOIN santri st ON st.id = e.santri_id AND st.deleted_at IS NULL
    JOIN semester sem ON sem.tahun_ajaran_id = e.tahun_ajaran_id
    GROUP BY e.marhalah_id, sem.id
),
nilai_filled AS (
    SELECT
        e.marhalah_id,
        n.semester_id,
        COUNT(n.id) AS sel_nilai_terisi
    FROM nilai n
    JOIN enrollment e ON e.id = n.enrollment_id
    JOIN marhalah_mapel mm ON mm.id = n.marhalah_mapel_id
    WHERE mm.tipe = 'nilai' AND n.angka IS NOT NULL
    GROUP BY e.marhalah_id, n.semester_id
),
catatan_filled AS (
    SELECT
        e.marhalah_id,
        cs.semester_id,
        COUNT(cs.id) AS catatan_terisi
    FROM catatan_semester cs
    JOIN enrollment e ON e.id = cs.enrollment_id
    GROUP BY e.marhalah_id, cs.semester_id
)
SELECT
    m.id AS marhalah_id,
    m.nama AS nama_marhalah,
    m.kode AS kode_marhalah,
    m.urutan AS urutan_marhalah,
    s.id AS semester_id,
    s.jenis AS semester_jenis,
    ta.id AS tahun_ajaran_id,
    ta.nama AS nama_tahun_ajaran,
    COALESCE(sc.jumlah_santri, 0) AS jumlah_santri,
    COALESCE(mc.total_mapel_nilai, 0) AS total_mapel_nilai,
    (COALESCE(sc.jumlah_santri, 0) * COALESCE(mc.total_mapel_nilai, 0)) AS total_sel_nilai,
    COALESCE(nf.sel_nilai_terisi, 0) AS sel_nilai_terisi,
    COALESCE(cf.catatan_terisi, 0) AS catatan_terisi,
    COALESCE(sr.status, 'draft') AS status_raport,
    sr.difinalisasi_oleh,
    sr.difinalisasi_pada
FROM marhalah m
CROSS JOIN semester s
JOIN tahun_ajaran ta ON ta.id = s.tahun_ajaran_id
LEFT JOIN santri_count sc ON sc.marhalah_id = m.id AND sc.semester_id = s.id
LEFT JOIN mapel_count mc ON mc.marhalah_id = m.id AND mc.semester_id = s.id
LEFT JOIN nilai_filled nf ON nf.marhalah_id = m.id AND nf.semester_id = s.id
LEFT JOIN catatan_filled cf ON cf.marhalah_id = m.id AND cf.semester_id = s.id
LEFT JOIN status_raport sr ON sr.marhalah_id = m.id AND sr.semester_id = s.id
WHERE m.deleted_at IS NULL;

-- ==============================================================================
-- 4. RPC PUBLIK: VERIFIKASI RAPORT (SECURITY DEFINER)
-- ==============================================================================
CREATE OR REPLACE FUNCTION verifikasi_raport(kode TEXT)
RETURNS TABLE (
    nama_santri TEXT,
    marhalah TEXT,
    tahun_ajaran TEXT,
    semester TEXT,
    tanggal_terbit TIMESTAMPTZ,
    status TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        st.nama AS nama_santri,
        m.nama AS marhalah,
        ta.nama AS tahun_ajaran,
        sem.jenis AS semester,
        rt.diterbitkan_pada AS tanggal_terbit,
        rt.status AS status
    FROM raport_terbit rt
    JOIN enrollment e ON e.id = rt.enrollment_id
    JOIN santri st ON st.id = e.santri_id
    JOIN marhalah m ON m.id = e.marhalah_id
    JOIN semester sem ON sem.id = rt.semester_id
    JOIN tahun_ajaran ta ON ta.id = sem.tahun_ajaran_id
    WHERE rt.kode_verifikasi = $1
    LIMIT 1;
$$;

-- Berikan izin pemanggilan RPC verifikasi_raport ke anon dan authenticated
GRANT EXECUTE ON FUNCTION verifikasi_raport(TEXT) TO anon, authenticated;

-- ==============================================================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- Aturan: dilarang policy USING (true), admin akses penuh, guru sesuai lingkup
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- A. PROFILES
-- ------------------------------------------------------------------------------
CREATE POLICY "profiles_admin_all" ON profiles
    FOR ALL TO authenticated
    USING (is_admin())
    WITH CHECK (is_admin());

CREATE POLICY "profiles_select_own_or_active" ON profiles
    FOR SELECT TO authenticated
    USING (id = auth.uid() OR aktif = TRUE);

-- ------------------------------------------------------------------------------
-- B. PENGATURAN LEMBAGA, TAHUN AJARAN, SEMESTER, MARHALAH, MAPEL, KITAB, MARHALAH_MAPEL
-- (Konfigurasi & Kurikulum: Admin kelola penuh, Guru/Auth baca)
-- ------------------------------------------------------------------------------
-- pengaturan_lembaga
CREATE POLICY "pengaturan_lembaga_admin_all" ON pengaturan_lembaga
    FOR ALL TO authenticated
    USING (is_admin())
    WITH CHECK (is_admin());

CREATE POLICY "pengaturan_lembaga_select_auth" ON pengaturan_lembaga
    FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND aktif = TRUE));

-- tahun_ajaran
CREATE POLICY "tahun_ajaran_admin_all" ON tahun_ajaran
    FOR ALL TO authenticated
    USING (is_admin())
    WITH CHECK (is_admin());

CREATE POLICY "tahun_ajaran_select_auth" ON tahun_ajaran
    FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND aktif = TRUE));

-- semester
CREATE POLICY "semester_admin_all" ON semester
    FOR ALL TO authenticated
    USING (is_admin())
    WITH CHECK (is_admin());

CREATE POLICY "semester_select_auth" ON semester
    FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND aktif = TRUE));

-- marhalah
CREATE POLICY "marhalah_admin_all" ON marhalah
    FOR ALL TO authenticated
    USING (is_admin())
    WITH CHECK (is_admin());

CREATE POLICY "marhalah_select_auth" ON marhalah
    FOR SELECT TO authenticated
    USING (deleted_at IS NULL AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND aktif = TRUE));

-- mapel
CREATE POLICY "mapel_admin_all" ON mapel
    FOR ALL TO authenticated
    USING (is_admin())
    WITH CHECK (is_admin());

CREATE POLICY "mapel_select_auth" ON mapel
    FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND aktif = TRUE));

-- kitab
CREATE POLICY "kitab_admin_all" ON kitab
    FOR ALL TO authenticated
    USING (is_admin())
    WITH CHECK (is_admin());

CREATE POLICY "kitab_select_auth" ON kitab
    FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND aktif = TRUE));

-- marhalah_mapel
CREATE POLICY "marhalah_mapel_admin_all" ON marhalah_mapel
    FOR ALL TO authenticated
    USING (is_admin())
    WITH CHECK (is_admin());

CREATE POLICY "marhalah_mapel_select_auth" ON marhalah_mapel
    FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND aktif = TRUE));

-- ------------------------------------------------------------------------------
-- C. GURU_MARHALAH & PENGAMPU
-- ------------------------------------------------------------------------------
CREATE POLICY "guru_marhalah_admin_all" ON guru_marhalah
    FOR ALL TO authenticated
    USING (is_admin())
    WITH CHECK (is_admin());

CREATE POLICY "guru_marhalah_select_guru" ON guru_marhalah
    FOR SELECT TO authenticated
    USING (guru_id = auth.uid() OR is_admin());

CREATE POLICY "pengampu_admin_all" ON pengampu
    FOR ALL TO authenticated
    USING (is_admin())
    WITH CHECK (is_admin());

CREATE POLICY "pengampu_select_guru" ON pengampu
    FOR SELECT TO authenticated
    USING (guru_id = auth.uid() OR is_admin());

-- ------------------------------------------------------------------------------
-- D. SANTRI & ENROLLMENT
-- (Admin penuh; Guru hanya membaca santri di marhalah/kelas perwalian atau ampuannya)
-- ------------------------------------------------------------------------------
CREATE POLICY "santri_admin_all" ON santri
    FOR ALL TO authenticated
    USING (is_admin())
    WITH CHECK (is_admin());

CREATE POLICY "santri_select_guru" ON santri
    FOR SELECT TO authenticated
    USING (
        deleted_at IS NULL AND (
            is_admin() OR
            EXISTS (
                SELECT 1 FROM enrollment e
                JOIN guru_marhalah gm ON gm.marhalah_id = e.marhalah_id AND gm.tahun_ajaran_id = e.tahun_ajaran_id
                WHERE e.santri_id = santri.id AND gm.guru_id = auth.uid()
            ) OR
            EXISTS (
                SELECT 1 FROM enrollment e
                JOIN marhalah_mapel mm ON mm.marhalah_id = e.marhalah_id
                JOIN pengampu p ON p.marhalah_mapel_id = mm.id
                WHERE e.santri_id = santri.id AND p.guru_id = auth.uid()
            )
        )
    );

CREATE POLICY "enrollment_admin_all" ON enrollment
    FOR ALL TO authenticated
    USING (is_admin())
    WITH CHECK (is_admin());

CREATE POLICY "enrollment_select_guru" ON enrollment
    FOR SELECT TO authenticated
    USING (
        is_admin() OR
        EXISTS (
            SELECT 1 FROM guru_marhalah gm
            WHERE gm.marhalah_id = enrollment.marhalah_id
              AND gm.tahun_ajaran_id = enrollment.tahun_ajaran_id
              AND gm.guru_id = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM marhalah_mapel mm
            JOIN pengampu p ON p.marhalah_mapel_id = mm.id
            WHERE mm.marhalah_id = enrollment.marhalah_id
              AND p.guru_id = auth.uid()
        )
    );

-- ------------------------------------------------------------------------------
-- E. NILAI
-- (Admin penuh; Guru tulis hanya bila can_edit_nilai dan status raport bukan 'final')
-- ------------------------------------------------------------------------------
CREATE POLICY "nilai_admin_all" ON nilai
    FOR ALL TO authenticated
    USING (is_admin())
    WITH CHECK (is_admin());

CREATE POLICY "nilai_select_guru" ON nilai
    FOR SELECT TO authenticated
    USING (
        is_admin() OR
        can_edit_nilai(marhalah_mapel_id) OR
        EXISTS (
            SELECT 1 FROM enrollment e
            JOIN guru_marhalah gm ON gm.marhalah_id = e.marhalah_id AND gm.tahun_ajaran_id = e.tahun_ajaran_id
            WHERE e.id = nilai.enrollment_id AND gm.guru_id = auth.uid()
        )
    );

CREATE POLICY "nilai_insert_guru" ON nilai
    FOR INSERT TO authenticated
    WITH CHECK (
        can_edit_nilai(marhalah_mapel_id) AND
        NOT EXISTS (
            SELECT 1 FROM status_raport sr
            JOIN marhalah_mapel mm ON mm.id = nilai.marhalah_mapel_id
            WHERE sr.marhalah_id = mm.marhalah_id
              AND sr.semester_id = nilai.semester_id
              AND sr.status = 'final'
        )
    );

CREATE POLICY "nilai_update_guru" ON nilai
    FOR UPDATE TO authenticated
    USING (
        can_edit_nilai(marhalah_mapel_id) AND
        NOT EXISTS (
            SELECT 1 FROM status_raport sr
            JOIN marhalah_mapel mm ON mm.id = nilai.marhalah_mapel_id
            WHERE sr.marhalah_id = mm.marhalah_id
              AND sr.semester_id = nilai.semester_id
              AND sr.status = 'final'
        )
    )
    WITH CHECK (
        can_edit_nilai(marhalah_mapel_id) AND
        NOT EXISTS (
            SELECT 1 FROM status_raport sr
            JOIN marhalah_mapel mm ON mm.id = nilai.marhalah_mapel_id
            WHERE sr.marhalah_id = mm.marhalah_id
              AND sr.semester_id = nilai.semester_id
              AND sr.status = 'final'
        )
    );

-- ------------------------------------------------------------------------------
-- F. CATATAN_SEMESTER
-- (Wali kelas & Admin; tulis hanya bila belum final)
-- ------------------------------------------------------------------------------
CREATE POLICY "catatan_semester_admin_all" ON catatan_semester
    FOR ALL TO authenticated
    USING (is_admin())
    WITH CHECK (is_admin());

CREATE POLICY "catatan_semester_select_wali" ON catatan_semester
    FOR SELECT TO authenticated
    USING (
        is_admin() OR
        EXISTS (
            SELECT 1 FROM enrollment e
            JOIN guru_marhalah gm ON gm.marhalah_id = e.marhalah_id AND gm.tahun_ajaran_id = e.tahun_ajaran_id
            WHERE e.id = catatan_semester.enrollment_id AND gm.guru_id = auth.uid()
        )
    );

CREATE POLICY "catatan_semester_insert_wali" ON catatan_semester
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM enrollment e
            JOIN guru_marhalah gm ON gm.marhalah_id = e.marhalah_id AND gm.tahun_ajaran_id = e.tahun_ajaran_id
            WHERE e.id = catatan_semester.enrollment_id
              AND gm.guru_id = auth.uid()
              AND NOT EXISTS (
                  SELECT 1 FROM status_raport sr
                  WHERE sr.marhalah_id = e.marhalah_id
                    AND sr.semester_id = catatan_semester.semester_id
                    AND sr.status = 'final'
              )
        )
    );

CREATE POLICY "catatan_semester_update_wali" ON catatan_semester
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM enrollment e
            JOIN guru_marhalah gm ON gm.marhalah_id = e.marhalah_id AND gm.tahun_ajaran_id = e.tahun_ajaran_id
            WHERE e.id = catatan_semester.enrollment_id
              AND gm.guru_id = auth.uid()
              AND NOT EXISTS (
                  SELECT 1 FROM status_raport sr
                  WHERE sr.marhalah_id = e.marhalah_id
                    AND sr.semester_id = catatan_semester.semester_id
                    AND sr.status = 'final'
              )
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM enrollment e
            JOIN guru_marhalah gm ON gm.marhalah_id = e.marhalah_id AND gm.tahun_ajaran_id = e.tahun_ajaran_id
            WHERE e.id = catatan_semester.enrollment_id
              AND gm.guru_id = auth.uid()
              AND NOT EXISTS (
                  SELECT 1 FROM status_raport sr
                  WHERE sr.marhalah_id = e.marhalah_id
                    AND sr.semester_id = catatan_semester.semester_id
                    AND sr.status = 'final'
              )
        )
    );

-- ------------------------------------------------------------------------------
-- G. STATUS_RAPORT
-- (Finalisasi raport: Wali Kelas atau Admin)
-- ------------------------------------------------------------------------------
CREATE POLICY "status_raport_admin_all" ON status_raport
    FOR ALL TO authenticated
    USING (is_admin())
    WITH CHECK (is_admin());

CREATE POLICY "status_raport_select_auth" ON status_raport
    FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND aktif = TRUE));

CREATE POLICY "status_raport_update_wali" ON status_raport
    FOR UPDATE TO authenticated
    USING (
        is_admin() OR
        EXISTS (
            SELECT 1 FROM semester sem
            JOIN guru_marhalah gm ON gm.marhalah_id = status_raport.marhalah_id AND gm.tahun_ajaran_id = sem.tahun_ajaran_id
            WHERE sem.id = status_raport.semester_id AND gm.guru_id = auth.uid()
        )
    )
    WITH CHECK (
        is_admin() OR
        EXISTS (
            SELECT 1 FROM semester sem
            JOIN guru_marhalah gm ON gm.marhalah_id = status_raport.marhalah_id AND gm.tahun_ajaran_id = sem.tahun_ajaran_id
            WHERE sem.id = status_raport.semester_id AND gm.guru_id = auth.uid()
        )
    );

-- ------------------------------------------------------------------------------
-- H. PERINGKAT_FINAL & RAPORT_TERBIT
-- ------------------------------------------------------------------------------
CREATE POLICY "peringkat_final_admin_all" ON peringkat_final
    FOR ALL TO authenticated
    USING (is_admin())
    WITH CHECK (is_admin());

CREATE POLICY "peringkat_final_select_auth" ON peringkat_final
    FOR SELECT TO authenticated
    USING (
        is_admin() OR
        EXISTS (
            SELECT 1 FROM enrollment e
            JOIN guru_marhalah gm ON gm.marhalah_id = e.marhalah_id AND gm.tahun_ajaran_id = e.tahun_ajaran_id
            WHERE e.id = peringkat_final.enrollment_id AND gm.guru_id = auth.uid()
        )
    );

CREATE POLICY "peringkat_final_write_wali" ON peringkat_final
    FOR INSERT TO authenticated
    WITH CHECK (
        is_admin() OR
        EXISTS (
            SELECT 1 FROM enrollment e
            JOIN guru_marhalah gm ON gm.marhalah_id = e.marhalah_id AND gm.tahun_ajaran_id = e.tahun_ajaran_id
            WHERE e.id = peringkat_final.enrollment_id AND gm.guru_id = auth.uid()
        )
    );

CREATE POLICY "raport_terbit_admin_all" ON raport_terbit
    FOR ALL TO authenticated
    USING (is_admin())
    WITH CHECK (is_admin());

CREATE POLICY "raport_terbit_select_wali" ON raport_terbit
    FOR SELECT TO authenticated
    USING (
        is_admin() OR
        EXISTS (
            SELECT 1 FROM enrollment e
            JOIN guru_marhalah gm ON gm.marhalah_id = e.marhalah_id AND gm.tahun_ajaran_id = e.tahun_ajaran_id
            WHERE e.id = raport_terbit.enrollment_id AND gm.guru_id = auth.uid()
        )
    );

-- ------------------------------------------------------------------------------
-- I. AUDIT_LOG
-- ------------------------------------------------------------------------------
CREATE POLICY "audit_log_admin_select" ON audit_log
    FOR SELECT TO authenticated
    USING (is_admin());

CREATE POLICY "audit_log_insert_auth" ON audit_log
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid() OR is_admin());

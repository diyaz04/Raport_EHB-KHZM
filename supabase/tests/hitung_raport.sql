-- ==============================================================================
-- PENGUJIAN OTOMATIS: KALKULASI RAPORT, PEMBULATAN HALF-UP, HURUF, DAN PERINGKAT
-- File: supabase/tests/hitung_raport.sql
-- Dijalankan pada PostgreSQL / Supabase SQL Editor setelah seed_uji_ibtida_awal_pi.sql
-- ==============================================================================

DO $$
DECLARE
    v_count INT;
    v_huruf TEXT;
    v_total INT;
    v_rata_rata INT;
    v_rata_kelas NUMERIC(4, 1);
    v_is_seri BOOLEAN;
    v_rank INT;
BEGIN
    RAISE NOTICE '==================================================';
    RAISE NOTICE 'MEMULAI PENGUJIAN LOGIKA RAPORT (SUPABASE/POSTGRESQL)';
    RAISE NOTICE '==================================================';

    -- --------------------------------------------------------------------------
    -- PENGUJIAN 1: VERIFIKASI FUNGSI TERBILANG (terbilang_id)
    -- --------------------------------------------------------------------------
    RAISE NOTICE '[TEST 1] Memeriksa fungsi terbilang_id()...';

    IF terbilang_id(0) <> 'Nol' THEN
        RAISE EXCEPTION 'FAIL: terbilang_id(0) harus "Nol", didapat "%"', terbilang_id(0);
    END IF;

    IF terbilang_id(65) <> 'Enam Puluh Lima' THEN
        RAISE EXCEPTION 'FAIL: terbilang_id(65) harus "Enam Puluh Lima", didapat "%"', terbilang_id(65);
    END IF;

    IF terbilang_id(70) <> 'Tujuh Puluh' THEN
        RAISE EXCEPTION 'FAIL: terbilang_id(70) harus "Tujuh Puluh", didapat "%"', terbilang_id(70);
    END IF;

    IF terbilang_id(71) <> 'Tujuh Puluh Satu' THEN
        RAISE EXCEPTION 'FAIL: terbilang_id(71) harus "Tujuh Puluh Satu", didapat "%"', terbilang_id(71);
    END IF;

    IF terbilang_id(77) <> 'Tujuh Puluh Tujuh' THEN
        RAISE EXCEPTION 'FAIL: terbilang_id(77) harus "Tujuh Puluh Tujuh", didapat "%"', terbilang_id(77);
    END IF;

    IF terbilang_id(100) <> 'Seratus' THEN
        RAISE EXCEPTION 'FAIL: terbilang_id(100) harus "Seratus", didapat "%"', terbilang_id(100);
    END IF;

    RAISE NOTICE '  -> PASS: Seluruh assertion terbilang_id() berhasil!';

    -- --------------------------------------------------------------------------
    -- PENGUJIAN 2: JUMLAH SANTRI DAN MARHALAH DI SEED
    -- --------------------------------------------------------------------------
    RAISE NOTICE '[TEST 2] Memeriksa kelengkapan 13 santri di marhalah Ibtida Awal PI...';

    SELECT COUNT(*) INTO v_count
    FROM enrollment e
    JOIN marhalah m ON m.id = e.marhalah_id
    WHERE m.kode = '1A';

    IF v_count <> 13 THEN
        RAISE EXCEPTION 'FAIL: Jumlah santri di marhalah 1A harus 13, didapat %', v_count;
    END IF;

    RAISE NOTICE '  -> PASS: 13 santri terdaftar sesuai!';

    -- --------------------------------------------------------------------------
    -- PENGUJIAN 3: PEMBULATAN RATA-RATA HALF-UP KE BILANGAN BULAT
    -- Kasus Uji: 70.5 -> 71; 76.5 -> 77; 78.5 -> 79 (Bukan Bankers Rounding!)
    -- --------------------------------------------------------------------------
    RAISE NOTICE '[TEST 3] Memeriksa pembulatan HALF-UP (70.5->71, 76.5->77, 78.5->79)...';

    -- Uji Maryam Jamilah: Total 471 / 6 = 78.5 -> Harus 79
    SELECT DISTINCT total_nilai, rata_rata_akhir
    INTO v_total, v_rata_rata
    FROM v_raport_nilai
    WHERE nis = '252601004';

    IF v_total <> 471 OR v_rata_rata <> 79 THEN
        RAISE EXCEPTION 'FAIL: Maryam Jamilah total harus 471 dan rata-rata 79 (78.5 half-up), didapat total % rata-rata %', v_total, v_rata_rata;
    END IF;

    -- Uji Shafiyyah Nabilah: Total 459 / 6 = 76.5 -> Harus 77
    SELECT DISTINCT total_nilai, rata_rata_akhir
    INTO v_total, v_rata_rata
    FROM v_raport_nilai
    WHERE nis = '252601005';

    IF v_total <> 459 OR v_rata_rata <> 77 THEN
        RAISE EXCEPTION 'FAIL: Shafiyyah Nabilah total harus 459 dan rata-rata 77 (76.5 half-up), didapat total % rata-rata %', v_total, v_rata_rata;
    END IF;

    -- Uji Ummu Kultsum: Total 423 / 6 = 70.5 -> Harus 71
    SELECT DISTINCT total_nilai, rata_rata_akhir
    INTO v_total, v_rata_rata
    FROM v_raport_nilai
    WHERE nis = '252601009';

    IF v_total <> 423 OR v_rata_rata <> 71 THEN
        RAISE EXCEPTION 'FAIL: Ummu Kultsum total harus 423 dan rata-rata 71 (70.5 half-up), didapat total % rata-rata %', v_total, v_rata_rata;
    END IF;

    RAISE NOTICE '  -> PASS: Aturan Half-up (non-bankers) terverifikasi akurat!';

    -- --------------------------------------------------------------------------
    -- PENGUJIAN 4: MAPEL KELENGKAPAN (LEGALISIR)
    -- Angka kosong / NULL, tidak masuk total, huruf 'Nol', rata-rata marhalah 0.0
    -- --------------------------------------------------------------------------
    RAISE NOTICE '[TEST 4] Memeriksa mapel tipe kelengkapan (Legalisir)...';

    SELECT angka, angka_huruf, rata_rata_marhalah
    INTO v_total, v_huruf, v_rata_kelas
    FROM v_raport_nilai
    WHERE nis = '252601001' AND nama_mapel = 'Legalisir';

    IF v_total IS NOT NULL THEN
        RAISE EXCEPTION 'FAIL: Legalisir angka harus NULL, didapat %', v_total;
    END IF;

    IF v_huruf <> 'Nol' THEN
        RAISE EXCEPTION 'FAIL: Legalisir angka_huruf harus "Nol", didapat "%"', v_huruf;
    END IF;

    IF v_rata_kelas <> 0.0 THEN
        RAISE EXCEPTION 'FAIL: Legalisir rata_rata_marhalah harus 0.0, didapat %', v_rata_kelas;
    END IF;

    RAISE NOTICE '  -> PASS: Mapel kelengkapan Legalisir terkonfigurasi dengan benar!';

    -- --------------------------------------------------------------------------
    -- PENGUJIAN 5: RATA-RATA KELAS PER MAPEL (1 DESIMAL)
    -- Bahasa Arab: Total 926 / 13 santri = 71.2307 -> 71.2
    -- --------------------------------------------------------------------------
    RAISE NOTICE '[TEST 5] Memeriksa rata-rata kelas marhalah per mapel (Bahasa Arab = 71.2)...';

    SELECT DISTINCT rata_rata_marhalah
    INTO v_rata_kelas
    FROM v_raport_nilai
    WHERE nama_mapel = 'Bahasa Arab' AND nama_marhalah = 'Ibtida Awal PI';

    IF v_rata_kelas <> 71.2 THEN
        RAISE EXCEPTION 'FAIL: Rata-rata kelas Bahasa Arab harus 71.2, didapat %', v_rata_kelas;
    END IF;

    RAISE NOTICE '  -> PASS: Rata-rata kelas 1 desimal (71.2) akurat!';

    -- --------------------------------------------------------------------------
    -- PENGUJIAN 6: PERINGKAT & DETEKSI NILAI SERI (v_peringkat)
    -- Rank 1: Aisyah Humaira (540)
    -- Nilai Seri: Shafiyyah Nabilah & Hafshah Karimah sama-sama 459 (is_seri = TRUE)
    -- --------------------------------------------------------------------------
    RAISE NOTICE '[TEST 6] Memeriksa peringkat dan deteksi nilai kembar (is_seri)...';

    -- Rank 1
    SELECT rank_sementara INTO v_rank
    FROM v_peringkat
    WHERE nama_santri = 'Aisyah Humaira';

    IF v_rank <> 1 THEN
        RAISE EXCEPTION 'FAIL: Aisyah Humaira peringkat harus 1, didapat %', v_rank;
    END IF;

    -- Uji Seri Shafiyyah Nabilah (Total 459)
    SELECT is_seri INTO v_is_seri
    FROM v_peringkat
    WHERE nama_santri = 'Shafiyyah Nabilah';

    IF v_is_seri IS NOT TRUE THEN
        RAISE EXCEPTION 'FAIL: Shafiyyah Nabilah harus terdeteksi is_seri = TRUE!';
    END IF;

    -- Uji Seri Hafshah Karimah (Total 459)
    SELECT is_seri INTO v_is_seri
    FROM v_peringkat
    WHERE nama_santri = 'Hafshah Karimah';

    IF v_is_seri IS NOT TRUE THEN
        RAISE EXCEPTION 'FAIL: Hafshah Karimah harus terdeteksi is_seri = TRUE!';
    END IF;

    RAISE NOTICE '  -> PASS: Peringkat dan deteksi nilai seri berhasil!';

    RAISE NOTICE '==================================================';
    RAISE NOTICE 'SEMUA PENGUJIAN (TEST 1 - 6) BERHASIL DAN LULUS 100%%';
    RAISE NOTICE '==================================================';
END $$;

-- ==============================================================================
-- MIGRATION 005: EHB PESERTA & PENEMPATAN RUANGAN
-- Sistem EHB dan Raport KH Zumratul Muttaqin
-- ==============================================================================

-- 1. Tambah kolom format_nomor_peserta pada tabel ehb
ALTER TABLE ehb 
ADD COLUMN IF NOT EXISTS format_nomor_peserta TEXT NOT NULL DEFAULT '{kode TA}-{kode marhalah}-{urut 3 digit}';

-- ==============================================================================
-- 2. FUNGSI DATABASE: GENERATE NOMOR PESERTA EHB (DALAM SATU TRANSAKSI)
-- ==============================================================================
CREATE OR REPLACE FUNCTION generate_nomor_peserta_ehb(
    p_ehb_id UUID,
    p_force_regenerate BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_ehb RECORD;
    v_ta RECORD;
    v_format TEXT;
    v_total_peserta INT := 0;
    v_peserta_baru INT := 0;
    v_rec RECORD;
    v_marhalah_id UUID;
    v_current_marhalah_id UUID := NULL;
    v_seq INT := 0;
    v_formatted_no TEXT;
    v_ta_kode TEXT;
    v_marhalah_kode TEXT;
BEGIN
    -- 1. Validasi EHB
    SELECT * INTO v_ehb FROM ehb WHERE id = p_ehb_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Event EHB dengan ID % tidak ditemukan.', p_ehb_id;
    END IF;

    -- 2. Cegah generate ulang bila EHB sudah dikunci
    IF p_force_regenerate AND v_ehb.status = 'dikunci' THEN
        RAISE EXCEPTION 'Evaluasi Hasil Belajar ini berstatus DIKUNCI. Tidak dapat melakukan generate ulang nomor peserta.';
    END IF;

    -- 3. Ambil kode Tahun Ajaran
    SELECT * INTO v_ta FROM tahun_ajaran WHERE id = v_ehb.tahun_ajaran_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Tahun ajaran tidak valid.';
    END IF;
    v_ta_kode := COALESCE(v_ta.kode, 'TA');

    -- Format pola nomor peserta dari konfigurasi
    v_format := COALESCE(v_ehb.format_nomor_peserta, '{kode TA}-{kode marhalah}-{urut 3 digit}');

    -- =========================================================================
    -- KASUS A: FORCE REGENERATE (Reset dan nomor ulang dari 1 per marhalah)
    -- =========================================================================
    IF p_force_regenerate THEN
        -- Hapus peserta yang ada untuk EHB ini dalam transaksi ini
        DELETE FROM ehb_peserta WHERE ehb_id = p_ehb_id;

        -- Loop seluruh enrollment aktif pada TA bersangkutan, diurutkan per marhalah, lalu nama santri
        FOR v_rec IN
            SELECT 
                e.id AS enrollment_id,
                e.marhalah_id,
                m.kode AS marhalah_kode,
                m.urutan AS marhalah_urutan,
                s.nama AS santri_nama
            FROM enrollment e
            JOIN santri s ON e.santri_id = s.id
            JOIN marhalah m ON e.marhalah_id = m.id
            WHERE e.tahun_ajaran_id = v_ehb.tahun_ajaran_id
              AND s.deleted_at IS NULL
              AND m.deleted_at IS NULL
            ORDER BY m.urutan ASC, s.nama ASC
        LOOP
            -- Reset sequence bila ganti marhalah
            IF v_current_marhalah_id IS NULL OR v_current_marhalah_id <> v_rec.marhalah_id THEN
                v_current_marhalah_id := v_rec.marhalah_id;
                v_seq := 1;
            ELSE
                v_seq := v_seq + 1;
            END IF;

            v_marhalah_kode := COALESCE(v_rec.marhalah_kode, '01');
            IF length(v_marhalah_kode) = 1 AND v_marhalah_kode ~ '^[0-9]$' THEN
                v_marhalah_kode := '0' || v_marhalah_kode;
            END IF;

            -- Bentuk nomor peserta berdasarkan format konfigurasi
            v_formatted_no := v_format;
            v_formatted_no := replace(v_formatted_no, '{kode TA}', v_ta_kode);
            v_formatted_no := replace(v_formatted_no, '{kode_ta}', v_ta_kode);
            v_formatted_no := replace(v_formatted_no, '{kode marhalah}', v_marhalah_kode);
            v_formatted_no := replace(v_formatted_no, '{kode_marhalah}', v_marhalah_kode);
            v_formatted_no := replace(v_formatted_no, '{urut 3 digit}', LPAD(v_seq::TEXT, 3, '0'));
            v_formatted_no := replace(v_formatted_no, '{urut}', LPAD(v_seq::TEXT, 3, '0'));

            -- Insert ke ehb_peserta
            INSERT INTO ehb_peserta (ehb_id, enrollment_id, no_peserta, ruangan_id, no_urut)
            VALUES (p_ehb_id, v_rec.enrollment_id, v_formatted_no, NULL, NULL);

            v_total_peserta := v_total_peserta + 1;
        END LOOP;

        v_peserta_baru := v_total_peserta;

    -- =========================================================================
    -- KASUS B: NOMOR STABIL (Hanya tambahkan santri baru dengan nomor berikutnya)
    -- =========================================================================
    ELSE
        -- 1. Hitung total peserta yang sudah ada
        SELECT COUNT(*) INTO v_total_peserta FROM ehb_peserta WHERE ehb_id = p_ehb_id;

        -- 2. Cari enrollment yang BELUM ada di ehb_peserta untuk EHB ini
        FOR v_rec IN
            SELECT 
                e.id AS enrollment_id,
                e.marhalah_id,
                m.kode AS marhalah_kode,
                m.urutan AS marhalah_urutan,
                s.nama AS santri_nama
            FROM enrollment e
            JOIN santri s ON e.santri_id = s.id
            JOIN marhalah m ON e.marhalah_id = m.id
            WHERE e.tahun_ajaran_id = v_ehb.tahun_ajaran_id
              AND s.deleted_at IS NULL
              AND m.deleted_at IS NULL
              AND NOT EXISTS (
                  SELECT 1 FROM ehb_peserta ep 
                  WHERE ep.ehb_id = p_ehb_id AND ep.enrollment_id = e.id
              )
            ORDER BY m.urutan ASC, s.nama ASC
        LOOP
            -- Tentukan sequence berikutnya untuk marhalah ini
            IF v_current_marhalah_id IS NULL OR v_current_marhalah_id <> v_rec.marhalah_id THEN
                v_current_marhalah_id := v_rec.marhalah_id;
                
                -- Cari nomor urut maksimum yang ada untuk marhalah ini pada EHB ini
                SELECT COALESCE(MAX((substring(ep.no_peserta from '[0-9]+$'))::INT), 0)
                INTO v_seq
                FROM ehb_peserta ep
                JOIN enrollment en ON ep.enrollment_id = en.id
                WHERE ep.ehb_id = p_ehb_id AND en.marhalah_id = v_rec.marhalah_id;
            END IF;

            v_seq := v_seq + 1;

            v_marhalah_kode := COALESCE(v_rec.marhalah_kode, '01');
            IF length(v_marhalah_kode) = 1 AND v_marhalah_kode ~ '^[0-9]$' THEN
                v_marhalah_kode := '0' || v_marhalah_kode;
            END IF;

            -- Bentuk nomor peserta berikutnya
            v_formatted_no := v_format;
            v_formatted_no := replace(v_formatted_no, '{kode TA}', v_ta_kode);
            v_formatted_no := replace(v_formatted_no, '{kode_ta}', v_ta_kode);
            v_formatted_no := replace(v_formatted_no, '{kode marhalah}', v_marhalah_kode);
            v_formatted_no := replace(v_formatted_no, '{kode_marhalah}', v_marhalah_kode);
            v_formatted_no := replace(v_formatted_no, '{urut 3 digit}', LPAD(v_seq::TEXT, 3, '0'));
            v_formatted_no := replace(v_formatted_no, '{urut}', LPAD(v_seq::TEXT, 3, '0'));

            -- Insert santri baru
            INSERT INTO ehb_peserta (ehb_id, enrollment_id, no_peserta, ruangan_id, no_urut)
            VALUES (p_ehb_id, v_rec.enrollment_id, v_formatted_no, NULL, NULL);

            v_total_peserta := v_total_peserta + 1;
            v_peserta_baru := v_peserta_baru + 1;
        END LOOP;
    END IF;

    -- Return ringkasan hasil eksekusi
    RETURN jsonb_build_object(
        'ok', TRUE,
        'ehb_id', p_ehb_id,
        'mode', CASE WHEN p_force_regenerate THEN 'regenerate' ELSE 'stabil' END,
        'total_peserta', v_total_peserta,
        'peserta_baru', v_peserta_baru
    );
END;
$$;


-- ==============================================================================
-- 3. FUNGSI DATABASE: ALOKASI PENEMPATAN RUANGAN OTOMATIS
-- ==============================================================================
CREATE OR REPLACE FUNCTION alokasi_ruangan_ehb(
    p_ehb_id UUID,
    p_mode TEXT DEFAULT 'per_marhalah' -- 'per_marhalah' | 'campur'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_ehb RECORD;
    v_total_ruangan INT;
    v_kapasitas_total INT;
    v_total_peserta INT;
    v_room RECORD;
    v_room_cursor CURSOR FOR 
        SELECT id, nama, kapasitas 
        FROM ehb_ruangan 
        WHERE ehb_id = p_ehb_id 
        ORDER BY nama ASC;
    
    v_curr_room_id UUID := NULL;
    v_curr_room_cap INT := 0;
    v_curr_seat INT := 0;
    v_dialokasikan INT := 0;
    v_tanpa_ruangan INT := 0;
    v_peserta RECORD;
BEGIN
    -- 1. Validasi EHB
    SELECT * INTO v_ehb FROM ehb WHERE id = p_ehb_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Event EHB tidak ditemukan.';
    END IF;

    IF v_ehb.status = 'dikunci' THEN
        RAISE EXCEPTION 'Evaluasi Hasil Belajar ini berstatus DIKUNCI. Tidak dapat mengubah penempatan ruangan.';
    END IF;

    -- 2. Validasi Ruangan
    SELECT COUNT(*), COALESCE(SUM(kapasitas), 0)
    INTO v_total_ruangan, v_kapasitas_total
    FROM ehb_ruangan
    WHERE ehb_id = p_ehb_id;

    IF v_total_ruangan = 0 THEN
        RAISE EXCEPTION 'Belum ada ruangan yang dikonfigurasi untuk EHB ini. Tambahkan ruangan terlebih dahulu.';
    END IF;

    -- 3. Reset alokasi ruangan peserta yang ada pada EHB ini
    UPDATE ehb_peserta 
    SET ruangan_id = NULL, no_urut = NULL 
    WHERE ehb_id = p_ehb_id;

    -- 4. Buka kursor ruangan pertama
    OPEN v_room_cursor;
    FETCH v_room_cursor INTO v_room;
    IF FOUND THEN
        v_curr_room_id := v_room.id;
        v_curr_room_cap := v_room.kapasitas;
        v_curr_seat := 1;
    END IF;

    -- 5. Loop peserta berdasarkan mode
    -- MODE 1: 'per_marhalah' -> urut per marhalah lalu nama
    -- MODE 2: 'campur' -> urut selang-seling (round-robin rank per marhalah)
    FOR v_peserta IN
        WITH ranked_peserta AS (
            SELECT 
                ep.id AS peserta_id,
                ep.no_peserta,
                m.id AS marhalah_id,
                m.urutan AS marhalah_urutan,
                s.nama AS santri_nama,
                ROW_NUMBER() OVER (PARTITION BY m.id ORDER BY s.nama ASC) AS intra_marhalah_rank
            FROM ehb_peserta ep
            JOIN enrollment e ON ep.enrollment_id = e.id
            JOIN santri s ON e.santri_id = s.id
            JOIN marhalah m ON e.marhalah_id = m.id
            WHERE ep.ehb_id = p_ehb_id
        )
        SELECT peserta_id
        FROM ranked_peserta
        ORDER BY 
            CASE WHEN p_mode = 'campur' THEN intra_marhalah_rank ELSE marhalah_urutan END ASC,
            marhalah_urutan ASC,
            santri_nama ASC
    LOOP
        -- Jika masih ada ruangan tersedia dan belum penuh
        IF v_curr_room_id IS NOT NULL THEN
            UPDATE ehb_peserta
            SET ruangan_id = v_curr_room_id,
                no_urut = v_curr_seat
            WHERE id = v_peserta.peserta_id;

            v_dialokasikan := v_dialokasikan + 1;
            v_curr_seat := v_curr_seat + 1;

            -- Bila ruangan ini sudah penuh, pindah ke ruangan berikutnya
            IF v_curr_seat > v_curr_room_cap THEN
                FETCH v_room_cursor INTO v_room;
                IF FOUND THEN
                    v_curr_room_id := v_room.id;
                    v_curr_room_cap := v_room.kapasitas;
                    v_curr_seat := 1;
                ELSE
                    -- Ruangan habis (kapasitas terlampaui)
                    v_curr_room_id := NULL;
                END IF;
            END IF;
        ELSE
            -- Santri tidak mendapat ruangan karena kapasitas penuh
            v_tanpa_ruangan := v_tanpa_ruangan + 1;
        END IF;
    END LOOP;

    CLOSE v_room_cursor;

    RETURN jsonb_build_object(
        'ok', TRUE,
        'ehb_id', p_ehb_id,
        'mode', p_mode,
        'total_dialokasikan', v_dialokasikan,
        'total_tanpa_ruangan', v_tanpa_ruangan,
        'kapasitas_total', v_kapasitas_total
    );
END;
$$;

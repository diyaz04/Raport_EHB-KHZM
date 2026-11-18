-- ==============================================================================
-- 006: MIGRATION PENAMBAHAN TANGGAL RAPORT PADA PENGATURAN LEMBAGA
-- ==============================================================================

ALTER TABLE pengaturan_lembaga 
ADD COLUMN IF NOT EXISTS tanggal_raport TEXT NULL DEFAULT '20 Desember 2025';

COMMENT ON COLUMN pengaturan_lembaga.tanggal_raport IS 'Tanggal penetapan/terbit raport santri (titimangsa resmi).';

import { z } from "zod";

export const createGuruSchema = z.object({
  nama: z.string().trim().min(1, "Nama lengkap guru wajib diisi"),
  email: z.string().trim().email("Format alamat email tidak valid"),
  password: z
    .string()
    .trim()
    .min(6, "Password minimal 6 karakter")
    .optional()
    .or(z.literal("")),
});

export type CreateGuruFormValues = z.infer<typeof createGuruSchema>;

export const updateGuruSchema = z.object({
  nama: z.string().trim().min(1, "Nama lengkap guru wajib diisi"),
});

export type UpdateGuruFormValues = z.infer<typeof updateGuruSchema>;

export const setWaliKelasSchema = z.object({
  marhalah_id: z.string().uuid("Marhalah wajib dipilih"),
  tahun_ajaran_id: z.string().uuid("Tahun ajaran wajib dipilih"),
  guru_id: z.string().uuid().nullable().optional(),
});

export type SetWaliKelasFormValues = z.infer<typeof setWaliKelasSchema>;

export const setPengampuSchema = z.object({
  marhalah_mapel_id: z.string().uuid("Mata pelajaran kurikulum wajib dipilih"),
  guru_id: z.string().uuid().nullable().optional(),
});

export type SetPengampuFormValues = z.infer<typeof setPengampuSchema>;

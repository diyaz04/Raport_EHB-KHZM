import { z } from "zod";

export const santriSchema = z.object({
  nama: z.string().trim().min(1, "Nama santri wajib diisi"),
  nis: z
    .string()
    .trim()
    .optional()
    .transform((val) => (val && val.length > 0 ? val : null)),
  jenis_kelamin: z.enum(["L", "P"], {
    message: "Jenis kelamin harus 'L' (Laki-laki) atau 'P' (Perempuan)",
  }),
  // Opsi penempatan kelas langsung saat buat santri
  marhalah_id: z.string().uuid().optional().nullable(),
  tahun_ajaran_id: z.string().uuid().optional().nullable(),
});

export type SantriFormValues = z.infer<typeof santriSchema>;

export const enrollSantriSchema = z.object({
  santri_id: z.string().uuid("Santri wajib dipilih"),
  tahun_ajaran_id: z.string().uuid("Tahun ajaran wajib dipilih"),
  marhalah_id: z.string().uuid("Marhalah kelas wajib dipilih"),
});

export type EnrollSantriFormValues = z.infer<typeof enrollSantriSchema>;

export const pindahKelasSchema = z.object({
  enrollment_id: z.string().uuid("Enrollment wajib dipilih"),
  marhalah_id_baru: z.string().uuid("Marhalah tujuan wajib dipilih"),
});

export type PindahKelasFormValues = z.infer<typeof pindahKelasSchema>;

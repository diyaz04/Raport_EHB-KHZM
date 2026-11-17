import { z } from "zod";

export const finalisasiRaportSchema = z.object({
  marhalah_id: z.string().uuid("Marhalah ID wajib valid"),
  semester_id: z.string().uuid("Semester ID wajib valid"),
  peringkatList: z
    .array(
      z.object({
        enrollment_id: z.string().uuid("Enrollment ID wajib valid"),
        peringkat: z.number().int().min(1, "Peringkat minimal 1"),
      })
    )
    .min(1, "Daftar peringkat tidak boleh kosong"),
});

export type FinalisasiRaportInput = z.infer<typeof finalisasiRaportSchema>;

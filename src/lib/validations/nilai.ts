import { z } from "zod";

export const saveNilaiSchema = z.object({
  enrollment_id: z.string().uuid("Enrollment ID wajib valid"),
  semester_id: z.string().uuid("Semester ID wajib valid"),
  marhalah_mapel_id: z.string().uuid("Marhalah Mapel ID wajib valid"),
  angka: z
    .number()
    .int("Nilai harus berupa bilangan bulat")
    .min(0, "Nilai minimal 0")
    .max(100, "Nilai maksimal 100")
    .nullable(),
});

export type SaveNilaiInput = z.infer<typeof saveNilaiSchema>;

export const saveCatatanSchema = z.object({
  enrollment_id: z.string().uuid("Enrollment ID wajib valid"),
  semester_id: z.string().uuid("Semester ID wajib valid"),
  field: z.enum([
    "akhlak",
    "ketekunan",
    "kerapihan",
    "kebersihan",
    "sakit",
    "izin",
    "alpa",
    "saran_wali_kelas",
  ]),
  value: z.union([
    z.string().nullable(),
    z.number().int().min(0),
  ]),
});

export type SaveCatatanInput = z.infer<typeof saveCatatanSchema>;

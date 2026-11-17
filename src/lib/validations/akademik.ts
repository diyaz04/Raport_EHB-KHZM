import { z } from "zod";

export const tahunAjaranSchema = z.object({
  nama: z.string().trim().min(1, "Nama tahun ajaran wajib diisi (misal: 2025/2026)"),
  kode: z
    .string()
    .trim()
    .length(4, "Kode harus terdiri dari 4 digit angka (misal: 2526)")
    .regex(/^\d{4}$/, "Kode harus berupa 4 angka"),
  aktif: z.boolean().default(false),
});

export type TahunAjaranFormValues = z.infer<typeof tahunAjaranSchema>;

export const semesterSchema = z.object({
  tahun_ajaran_id: z.string().uuid("Tahun ajaran wajib dipilih"),
  jenis: z.enum(["Ganjil", "Genap"], {
    message: "Jenis semester harus Ganjil atau Genap",
  }),
  aktif: z.boolean().default(false),
});

export type SemesterFormValues = z.infer<typeof semesterSchema>;

export const marhalahSchema = z.object({
  nama: z.string().trim().min(1, "Nama marhalah wajib diisi (misal: Ibtida Awal PI)"),
  kode: z
    .string()
    .trim()
    .min(1, "Kode marhalah wajib diisi")
    .max(2, "Kode marhalah maksimal 2 karakter (misal: 1A)"),
  urutan: z.coerce.number().int().min(1, "Urutan harus bilangan bulat minimal 1"),
});

export type MarhalahFormValues = z.infer<typeof marhalahSchema>;

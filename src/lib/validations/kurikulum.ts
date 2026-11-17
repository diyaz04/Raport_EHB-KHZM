import { z } from "zod";

export const mapelSchema = z.object({
  nama: z.string().trim().min(1, "Nama mata pelajaran wajib diisi (misal: Fiqih)"),
});

export type MapelFormValues = z.infer<typeof mapelSchema>;

export const kitabSchema = z.object({
  nama: z.string().trim().min(1, "Nama kitab wajib diisi (misal: Safinatun Naja)"),
});

export type KitabFormValues = z.infer<typeof kitabSchema>;

export const marhalahMapelSchema = z.object({
  marhalah_id: z.string().uuid("Marhalah wajib dipilih"),
  semester_id: z.string().uuid("Semester wajib dipilih"),
  mapel_id: z.string().uuid("Mata pelajaran wajib dipilih"),
  kitab_id: z.string().uuid().nullable().optional(),
  urutan: z.coerce.number().int().min(1, "Urutan minimal 1").max(12, "Urutan maksimal 12"),
  tipe: z.enum(["nilai", "kelengkapan"], {
    message: "Tipe harus berupa 'nilai' atau 'kelengkapan'",
  }),
  dihitung_total: z.boolean().default(true),
});

export type MarhalahMapelFormValues = z.infer<typeof marhalahMapelSchema>;

export const salinKurikulumSchema = z.object({
  marhalah_id: z.string().uuid("Marhalah target wajib dipilih"),
  target_semester_id: z.string().uuid("Semester target wajib dipilih"),
  sumber_semester_id: z.string().uuid("Semester sumber wajib dipilih"),
  konfirmasi_timpa: z.boolean().default(false),
});

export type SalinKurikulumFormValues = z.infer<typeof salinKurikulumSchema>;

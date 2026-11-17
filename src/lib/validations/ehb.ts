import { z } from "zod";

export const ehbSchema = z
  .object({
    nama: z.string().min(3, "Nama EHB minimal 3 karakter"),
    tahun_ajaran_id: z.string().uuid("Pilih Tahun Ajaran yang valid"),
    semester_id: z.string().uuid("Pilih Semester yang valid"),
    tanggal_mulai: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal harus YYYY-MM-DD"),
    tanggal_selesai: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal harus YYYY-MM-DD"),
    status: z.enum(["draft", "dikunci"]).default("draft"),
  })
  .refine(
    (data) => new Date(data.tanggal_selesai) >= new Date(data.tanggal_mulai),
    {
      message: "Tanggal selesai harus sama atau setelah tanggal mulai",
      path: ["tanggal_selesai"],
    }
  );

export type EhbFormInput = z.infer<typeof ehbSchema>;

export const ehbRuanganSchema = z.object({
  ehb_id: z.string().uuid(),
  nama: z.string().min(2, "Nama ruangan minimal 2 karakter"),
  kapasitas: z.coerce.number().int().min(1, "Kapasitas minimal 1 santri"),
});

export type EhbRuanganFormInput = z.infer<typeof ehbRuanganSchema>;

export const ehbSesiSchema = z
  .object({
    ehb_id: z.string().uuid(),
    tanggal: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal harus YYYY-MM-DD"),
    jam_mulai: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/, "Format jam mulai harus HH:mm"),
    jam_selesai: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/, "Format jam selesai harus HH:mm"),
  })
  .refine(
    (data) => data.jam_selesai > data.jam_mulai,
    {
      message: "Jam selesai harus setelah jam mulai",
      path: ["jam_selesai"],
    }
  );

export type EhbSesiFormInput = z.infer<typeof ehbSesiSchema>;

export const ehbJadwalSchema = z.object({
  sesi_id: z.string().uuid("Pilih sesi yang valid"),
  marhalah_id: z.string().uuid("Pilih marhalah yang valid"),
  marhalah_mapel_id: z.string().uuid("Pilih mata pelajaran yang valid"),
});

export type EhbJadwalFormInput = z.infer<typeof ehbJadwalSchema>;

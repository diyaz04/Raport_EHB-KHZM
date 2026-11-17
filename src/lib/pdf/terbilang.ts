/**
 * Konversi angka bulat (0-100+) ke kata-kata bahasa Indonesia (terbilang).
 * Sesuai dengan fungsi terbilang_id() di Supabase PostgreSQL.
 */
export function terbilangId(val: number | null | undefined): string {
  if (val === null || val === undefined) return "-";
  if (val === 0) return "Nol";
  if (val < 0) return "Minus " + terbilangId(Math.abs(val));

  const satuan = [
    "",
    "Satu",
    "Dua",
    "Tiga",
    "Empat",
    "Lima",
    "Enam",
    "Tujuh",
    "Delapan",
    "Sembilan",
    "Sepuluh",
    "Sebelas",
  ];

  const roundVal = Math.round(val);

  if (roundVal <= 11) return satuan[roundVal];
  if (roundVal < 20) return terbilangId(roundVal - 10) + " Belas";
  if (roundVal < 100) {
    const sisa = roundVal % 10;
    return satuan[Math.floor(roundVal / 10)] + " Puluh" + (sisa > 0 ? " " + satuan[sisa] : "");
  }
  if (roundVal === 100) return "Seratus";
  if (roundVal < 200) return "Seratus " + terbilangId(roundVal - 100);
  if (roundVal < 1000) {
    const sisa = roundVal % 100;
    return (
      satuan[Math.floor(roundVal / 100)] +
      " Ratus" +
      (sisa > 0 ? " " + terbilangId(sisa) : "")
    );
  }
  return String(roundVal);
}

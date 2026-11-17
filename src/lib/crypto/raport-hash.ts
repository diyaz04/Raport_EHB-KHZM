import crypto from "crypto";

// Karakter tanpa simbol ambigu (menghindari 0, O, 1, I, l)
const SAFE_ALPHANUMERIC =
  "23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz";

/**
 * Menghasilkan kode acak aman 12-16 karakter (default 14 karakter)
 * menggunakan node:crypto randomBytes.
 */
export function generateSecureVerificationCode(length: number = 14): string {
  if (length < 12 || length > 16) {
    throw new Error("Panjang kode verifikasi harus antara 12 dan 16 karakter.");
  }

  const bytes = crypto.randomBytes(length);
  let code = "";
  for (let i = 0; i < length; i++) {
    code += SAFE_ALPHANUMERIC[bytes[i] % SAFE_ALPHANUMERIC.length];
  }
  return code;
}

/**
 * Serialisasi objek JSON secara deterministik (canonical JSON)
 * agar hash HMAC konsisten dan dapat diverifikasi ulang kapan saja.
 */
export function canonicalizeJson(obj: unknown): string {
  if (obj === null || typeof obj !== "object") {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return "[" + obj.map((item) => canonicalizeJson(item)).join(",") + "]";
  }
  const keys = Object.keys(obj as Record<string, unknown>).sort();
  return (
    "{" +
    keys
      .map(
        (key) =>
          JSON.stringify(key) +
          ":" +
          canonicalizeJson((obj as Record<string, unknown>)[key])
      )
      .join(",") +
    "}"
  );
}

/**
 * Menghitung hash HMAC-SHA256 dari snapshot raport.
 * Menggunakan secret dari env RAPORT_HMAC_SECRET.
 */
export function generateRaportHMAC(snapshot: unknown): string {
  const secret =
    process.env.RAPORT_HMAC_SECRET ||
    "default-secret-khzm-pesantren-2026-min-32-chars";
  const canonical = canonicalizeJson(snapshot);
  return crypto.createHmac("sha256", secret).update(canonical, "utf8").digest("hex");
}

/**
 * Memvalidasi apakah hash snapshot cocok secara timing-safe.
 */
export function verifyRaportHMAC(snapshot: unknown, expectedHash: string): boolean {
  try {
    const computed = generateRaportHMAC(snapshot);
    const bufComputed = Buffer.from(computed, "hex");
    const bufExpected = Buffer.from(expectedHash, "hex");
    if (bufComputed.length !== bufExpected.length) {
      return false;
    }
    return crypto.timingSafeEqual(bufComputed, bufExpected);
  } catch {
    return false;
  }
}

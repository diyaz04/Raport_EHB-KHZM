import QRCode from "qrcode";

/**
 * Menghasilkan URL publik verifikasi raport berdasarkan kode verifikasi.
 */
export function getVerificationUrl(kodeVerifikasi: string): string {
  const rawBase =
    process.env.NEXT_PUBLIC_APP_URL ||
    (typeof window !== "undefined" ? window.location.origin : "http://localhost:3000");
  const baseUrl = rawBase.replace(/\/$/, "");
  return `${baseUrl}/verifikasi/${encodeURIComponent(kodeVerifikasi)}`;
}

/**
 * Membangkitkan QR Code Data URL (PNG base64) dengan:
 * - Error Correction Level: 'M'
 * - Quiet zone (margin: 2)
 * - Resolusi tajam (width: 256)
 */
export async function generateVerificationQRCode(
  kodeVerifikasi: string
): Promise<string> {
  const targetUrl = getVerificationUrl(kodeVerifikasi);
  return QRCode.toDataURL(targetUrl, {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 256,
    color: {
      dark: "#000000",
      light: "#ffffff",
    },
  });
}

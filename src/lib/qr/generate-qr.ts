import QRCode from "qrcode";

/**
 * Mendapatkan base URL aplikasi secara dinamis, cerdas, dan kompatibel Vercel / Production.
 * Prioritas deteksi:
 * 1. explicitBaseUrl (dari konfigurasi admin jika ada)
 * 2. Header request aktif (x-forwarded-host & x-forwarded-proto) -> otomatis mengambil domain Vercel saat diakses
 * 3. Vercel System Environment Variables (VERCEL_PROJECT_PRODUCTION_URL / VERCEL_URL)
 * 4. NEXT_PUBLIC_APP_URL jika bukan localhost
 * 5. window.location.origin (bila di client-side)
 * 6. Fallback default
 */
export async function resolveAppBaseUrl(explicitBaseUrl?: string): Promise<string> {
  if (explicitBaseUrl && explicitBaseUrl.trim()) {
    return explicitBaseUrl.trim().replace(/\/$/, "");
  }

  // 1. Coba deteksi host dari request aktif (Server Action / API Route / Page)
  try {
    const { headers } = await import("next/headers");
    const headersList = await headers();
    const host =
      headersList.get("x-forwarded-host") ||
      headersList.get("host");

    if (host) {
      const proto =
        headersList.get("x-forwarded-proto") ||
        (host.includes("localhost") || host.includes("127.0.0.1") ? "http" : "https");
      return `${proto}://${host}`.replace(/\/$/, "");
    }
  } catch {
    // headers() tidak tersedia di luar konteks request
  }

  // 2. Cek Vercel System Environment Variables (disediakan otomatis oleh Vercel)
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`.replace(/\/$/, "");
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`.replace(/\/$/, "");
  }
  if (process.env.NEXT_PUBLIC_VERCEL_URL) {
    return `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`.replace(/\/$/, "");
  }

  // 3. Cek NEXT_PUBLIC_APP_URL dari env jika bukan localhost
  if (
    process.env.NEXT_PUBLIC_APP_URL &&
    !process.env.NEXT_PUBLIC_APP_URL.includes("localhost") &&
    !process.env.NEXT_PUBLIC_APP_URL.includes("127.0.0.1")
  ) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  }

  // 4. Jika dieksekusi di browser (client-side)
  if (typeof window !== "undefined" && window.location.origin) {
    return window.location.origin.replace(/\/$/, "");
  }

  // 5. Fallback ke NEXT_PUBLIC_APP_URL atau localhost
  return (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
}

/**
 * Menghasilkan URL publik verifikasi raport berdasarkan kode verifikasi.
 */
export async function getVerificationUrl(
  kodeVerifikasi: string,
  explicitBaseUrl?: string
): Promise<string> {
  const baseUrl = await resolveAppBaseUrl(explicitBaseUrl);
  return `${baseUrl}/verifikasi/${encodeURIComponent(kodeVerifikasi)}`;
}

/**
 * Membangkitkan QR Code Data URL (PNG base64) dengan:
 * - Error Correction Level: 'M'
 * - Quiet zone (margin: 2)
 * - Resolusi tajam (width: 256)
 */
export async function generateVerificationQRCode(
  kodeVerifikasi: string,
  explicitBaseUrl?: string
): Promise<string> {
  const targetUrl = await getVerificationUrl(kodeVerifikasi, explicitBaseUrl);
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

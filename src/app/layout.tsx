import type { Metadata, Viewport } from "next";
import { Toaster } from "@/components/ui/sonner";
import { ConfirmProvider } from "@/components/confirm-provider";
import { PwaRegistrar } from "@/components/pwa-registrar";
import "./globals.css";

export const viewport: Viewport = {
  themeColor: "#047857",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export const metadata: Metadata = {
  title: "Raport KH Zumratul Muttaqin",
  description: "Aplikasi Raport KH Zumratul Muttaqin",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Raport KHZM",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/logo.png", type: "image/png" },
      { url: "/favicon.ico" },
    ],
    apple: [
      { url: "/logo.png", type: "image/png" },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-white text-zinc-900 font-sans">
        <ConfirmProvider>
          {children}
          <Toaster />
          <PwaRegistrar />
        </ConfirmProvider>
      </body>
    </html>
  );
}

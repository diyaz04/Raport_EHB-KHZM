import type { Metadata } from "next";
import { Toaster } from "@/components/ui/sonner";
import { ConfirmProvider } from "@/components/confirm-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Raport KH Zumratul Muttaqin",
  description: "Aplikasi Raport KH Zumratul Muttaqin",
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
        </ConfirmProvider>
      </body>
    </html>
  );
}

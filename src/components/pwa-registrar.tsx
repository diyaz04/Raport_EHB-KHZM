"use client";

import * as React from "react";
import { Download, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PwaRegistrar() {
  const [deferredPrompt, setDeferredPrompt] = React.useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallBanner, setShowInstallBanner] = React.useState(false);

  React.useEffect(() => {
    // 1. Registrasi Service Worker
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js")
          .then(() => {
            // Service worker registered successfully
          })
          .catch(() => {
            // Service worker registration error (e.g. self-signed or non-https local)
          });
      });
    }

    // 2. Tangkap event install PWA dari browser
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Cek apakah user pernah menutup banner sebelumnya
      const dismissed = sessionStorage.getItem("khzm_pwa_dismissed");
      if (!dismissed) {
        setShowInstallBanner(true);
      }
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setDeferredPrompt(null);
      setShowInstallBanner(false);
    }
  };

  const handleDismiss = () => {
    setShowInstallBanner(false);
    sessionStorage.setItem("khzm_pwa_dismissed", "true");
  };

  if (!showInstallBanner) return null;

  return (
    <div className="fixed bottom-20 md:bottom-5 right-4 left-4 md:left-auto md:w-96 z-50 rounded-2xl bg-emerald-900 text-white p-4 shadow-2xl border border-emerald-700/50 backdrop-blur-md animate-in slide-in-from-bottom-5 duration-300">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-emerald-300">
            <Download className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white">Pasang Aplikasi Raport</h4>
            <p className="text-xs text-emerald-100/80 mt-0.5 leading-snug">
              Akses cepat tanpa browser langsung dari layar utama HP Anda.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleDismiss}
          className="text-emerald-300/70 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
          aria-label="Tutup"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-3 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={handleDismiss}
          className="px-3 py-1.5 text-xs text-emerald-200 hover:text-white font-medium"
        >
          Nanti saja
        </button>
        <button
          type="button"
          onClick={handleInstallClick}
          className="px-4 py-1.5 text-xs font-bold text-emerald-950 bg-emerald-300 hover:bg-emerald-200 rounded-lg shadow-sm transition-colors"
        >
          Pasang Sekarang
        </button>
      </div>
    </div>
  );
}

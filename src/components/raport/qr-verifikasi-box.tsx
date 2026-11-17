import React from "react";

interface QRVerifikasiBoxProps {
  isDraft: boolean;
  qrDataUrl?: string | null;
  kodeVerifikasi?: string | null;
  pimpinanNama?: string;
  tempatTitimangsa?: string;
}

export function QRVerifikasiBox({
  isDraft,
  qrDataUrl,
  kodeVerifikasi,
  pimpinanNama = "Pimpinan Pesantren",
  tempatTitimangsa,
}: QRVerifikasiBoxProps) {
  return (
    <div className="flex flex-col items-center justify-between min-h-[170px] text-center p-2">
      {tempatTitimangsa && (
        <p className="text-xs text-muted-foreground mb-1">
          {tempatTitimangsa}
        </p>
      )}
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Pimpinan Pondok Pesantren
      </p>

      <div className="my-2 flex flex-col items-center justify-center min-h-[96px]">
        {isDraft || !qrDataUrl ? (
          <div className="w-24 h-24 border border-dashed border-amber-400 bg-amber-50/50 rounded flex flex-col items-center justify-center p-2 text-center">
            <span className="text-[10px] font-bold text-amber-700 uppercase tracking-widest">
              DRAFT
            </span>
            <span className="text-[9px] text-amber-600 mt-1 leading-tight">
              Tanpa QR Code
            </span>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <div className="relative w-24 h-24 bg-white p-1 rounded shadow-xs border border-muted">
              {/* Image data URL rendered cleanly */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrDataUrl}
                alt="QR Verifikasi Raport Resmi"
                className="w-full h-full object-contain"
              />
            </div>
            <p className="text-[9px] font-medium text-muted-foreground mt-1 tracking-tight">
              Diterbitkan secara elektronik · Pindai untuk verifikasi
            </p>
            {kodeVerifikasi && (
              <p className="text-[8px] font-mono text-muted-foreground/80">
                ID: {kodeVerifikasi}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="mt-1">
        <p className="text-xs font-bold underline underline-offset-2">
          {pimpinanNama}
        </p>
      </div>
    </div>
  );
}

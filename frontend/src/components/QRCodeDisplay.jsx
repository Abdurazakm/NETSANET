import { QRCodeSVG } from "qrcode.react";

export default function QRCodeDisplay({ address, base64Key }) {
  if (!address) {
    return null;
  }

  const qrValue = base64Key ? `netsanet:${address}:${base64Key}` : address;

  return (
    <div className="glass-panel flex flex-col items-center justify-center px-6 py-7 text-center sm:px-7">
      <p className="section-kicker">Shareable identity</p>
      <h3 className="mt-3 font-display text-2xl font-bold text-slate-900 dark:text-slate-50">
        Your medical ID
      </h3>
      <p className="panel-copy mt-3 mb-6">
        Show this QR code to a doctor so they can request access to your records
        or add new ones.
      </p>

      <div className="mb-5 rounded-[28px] border border-white/80 bg-white p-5 shadow-[0_24px_60px_-26px_rgba(15,23,42,0.45)]">
        <QRCodeSVG
          value={qrValue}
          size={180}
          bgColor="#ffffff"
          fgColor="#000000"
          level="H"
          includeMargin={false}
        />
      </div>

      <div className="glass-inset w-full rounded-[22px] px-4 py-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">
          Wallet address
        </p>
        <p className="mt-2 break-all font-mono text-xs text-slate-700 dark:text-slate-100">
          {address}
        </p>
      </div>

      <button
        onClick={() => {
          navigator.clipboard.writeText(qrValue);
          alert(
            "QR string copied to clipboard. Switch to Doctor view and paste it in the scanner.",
          );
        }}
        className="btn-secondary mt-4 w-full text-sm"
      >
        Copy QR String for Testing
      </button>
    </div>
  );
}

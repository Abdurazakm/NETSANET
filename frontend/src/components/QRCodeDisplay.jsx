import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

export default function QRCodeDisplay({ address }) {
  if (!address) return null;

  return (
    <div className="glass-panel p-6 rounded-xl border border-gray-800 flex flex-col items-center justify-center">
      <h3 className="text-lg font-semibold mb-2">Your Medical ID</h3>
      <p className="text-sm text-muted text-center mb-6">
        Show this QR code to a doctor so they can request access to your records or add new ones.
      </p>

      <div className="bg-white p-4 rounded-xl shadow-lg border-4 border-eth-yellow mb-4">
        <QRCodeSVG 
          value={address} 
          size={180}
          bgColor={"#ffffff"}
          fgColor={"#000000"}
          level={"H"}
          includeMargin={false}
        />
      </div>

      <div className="bg-surface px-4 py-2 rounded-lg font-mono text-xs text-secondary break-all w-full text-center">
        {address}
      </div>
    </div>
  );
}

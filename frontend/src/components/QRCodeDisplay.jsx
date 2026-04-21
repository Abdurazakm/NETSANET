import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Check, Copy, QrCode, Shield, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

function shortenAddress(value) {
  if (!value || value.length < 12) return value || '';
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function truncatePayload(value) {
  if (!value || value.length <= 72) return value || '';
  return `${value.slice(0, 28)}...${value.slice(-16)}`;
}

export default function QRCodeDisplay({ address, base64Key }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return undefined;

    const timeoutId = window.setTimeout(() => {
      setCopied(false);
    }, 2200);

    return () => window.clearTimeout(timeoutId);
  }, [copied]);

  if (!address) return null;

  const qrValue = base64Key ? `netsanet:${address}:${base64Key}` : address;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(qrValue);
      setCopied(true);
      toast.success('Payload copied to clipboard');
    } catch (error) {
      console.error('Failed to copy:', error);
      toast.error('Failed to copy. Try again.');
    }
  };

  return (
    <section className="card-premium">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-xl" style={{ backgroundColor: '#E8F4EC' }}>
              <QrCode className="size-4" style={{ color: '#22A05B' }} />
            </div>
            <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Secure Share
            </span>
          </div>
          <h3 className="mt-2 text-xl font-bold">Your QR Code</h3>
          <p className="mt-1 text-sm text-slate-500">
            Show to doctor for secure access
          </p>
        </div>

        <div className={`badge ${copied ? 'badge-success' : 'badge-primary'}`}>
          {copied ? (
            <>
              <Check className="size-3" />
              Copied
            </>
          ) : (
            <>
              <ShieldCheck className="size-3" />
              Secure
            </>
          )}
        </div>
      </div>

      <div className="mt-6 flex justify-center rounded-3xl p-8" style={{ backgroundColor: '#F1F5F9' }}>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-center gap-2 rounded-xl px-3 py-2 mb-4" style={{ backgroundColor: '#E8F4EC' }}>
            <QrCode className="size-3" style={{ color: '#22A05B' }} />
            <span className="text-xs font-semibold" style={{ color: '#22A05B' }}>Scan Me</span>
          </div>
          <div className="rounded-xl border-4 border-slate-100 p-2">
            <QRCodeSVG
              value={qrValue}
              size={160}
              bgColor="#ffffff"
              fgColor="#1A2A30"
              level="H"
              includeMargin={false}
            />
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-2xl p-3" style={{ backgroundColor: '#F1F5F9' }}>
        <p className="text-xs font-medium text-slate-500">Wallet</p>
        <p className="mt-1 font-mono text-sm text-foreground">{shortenAddress(address)}</p>
      </div>

      <button
        onClick={handleCopy}
        className={`mt-4 w-full ${copied ? 'btn-secondary' : 'btn-primary'}`}
      >
        {copied ? (
          <>
            <Check className="size-4" />
            Copied to clipboard
          </>
        ) : (
          <>
            <Copy className="size-4" />
            Copy secure payload
          </>
        )}
      </button>
    </section>
  );
}
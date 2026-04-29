import { useEffect, useId, useRef, useState } from "react";
import { isAddress } from "ethers";
import {
  Html5QrcodeScanType,
  Html5QrcodeScanner,
  Html5QrcodeSupportedFormats,
} from "html5-qrcode";

const INVALID_QR_MESSAGE =
  "Invalid QR code format or Ethereum address. Use the patient's Netsanet QR or a valid 0x address.";

function parsePatientQr(value) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return null;
  }

  if (trimmedValue.startsWith("netsanet:")) {
    const parts = trimmedValue.split(":");

    if (parts.length < 3) {
      return null;
    }

    const address = parts[1]?.trim();
    const base64Key = parts.slice(2).join(":").trim();

    if (isAddress(address) && base64Key) {
      return { address, base64Key };
    }

    return null;
  }

  if (isAddress(trimmedValue)) {
    return { address: trimmedValue, base64Key: null };
  }

  return null;
}

export default function DoctorQRScanner({ onScan }) {
  const [manualInput, setManualInput] = useState("");
  const [error, setError] = useState("");
  const scannerRef = useRef(null);
  const onScanRef = useRef(onScan);
  const scannerId = useId().replace(/:/g, "");
  const scannerElementId = `doctor-qr-reader-${scannerId}`;

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    let isMounted = true;

    const scanner = new Html5QrcodeScanner(
      scannerElementId,
      {
        fps: 10,
        qrbox: { width: 220, height: 220 },
        rememberLastUsedCamera: true,
        supportedScanTypes: [
          Html5QrcodeScanType.SCAN_TYPE_CAMERA,
          Html5QrcodeScanType.SCAN_TYPE_FILE,
        ],
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
      },
      false,
    );

    scannerRef.current = scanner;

    scanner.render(async (decodedText) => {
      const parsedPatient = parsePatientQr(decodedText);

      if (!parsedPatient) {
        if (isMounted) {
          setError(INVALID_QR_MESSAGE);
        }
        return;
      }

      if (isMounted) {
        setError("");
      }

      try {
        await scanner.clear();
      } catch (clearError) {
        console.error(
          "Failed to clear QR scanner after a successful scan:",
          clearError,
        );
      }

      if (isMounted) {
        onScanRef.current(parsedPatient);
      }
    });

    return () => {
      isMounted = false;

      const activeScanner = scannerRef.current;
      scannerRef.current = null;

      if (activeScanner) {
        activeScanner.clear().catch((clearError) => {
          console.error("Failed to clean up QR scanner:", clearError);
        });
      }
    };
  }, [scannerElementId]);

  const handleManualSubmit = (event) => {
    event.preventDefault();

    const parsedPatient = parsePatientQr(manualInput);

    if (!parsedPatient) {
      setError(INVALID_QR_MESSAGE);
      return;
    }

    setError("");
    onScan(parsedPatient);
  };

  return (
    <div className="glass-panel mx-auto max-w-3xl px-6 py-7 text-center sm:px-8">
      <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-[22px] bg-gradient-to-br from-sky-500/15 to-eth-yellow/20 text-eth-yellow shadow-lg shadow-sky-950/10">
        <svg
          className="h-8 w-8"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M4 4h5v5H4z" />
          <path d="M15 4h5v5h-5z" />
          <path d="M4 15h5v5H4z" />
          <path d="M15 15h2" />
          <path d="M15 19h2" />
          <path d="M19 15h1v5h-5v-1" />
        </svg>
      </div>

      <p className="section-kicker">Patient onboarding</p>
      <h2 className="mt-3 font-display text-3xl font-bold text-slate-900 dark:text-slate-50">
        Scan patient medical ID
      </h2>
      <p className="panel-copy mx-auto mt-3 mb-6 max-w-2xl">
        Scan the patient's QR code with your webcam, upload a saved photo of the
        QR image, or paste the full Netsanet QR string manually.
      </p>

      <div className="doctor-qr-reader-shell mb-4">
        <div id={scannerElementId} />
      </div>

      <div className="glass-inset mx-auto mb-6 max-w-2xl rounded-[24px] px-4 py-4 text-left">
        <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
          Fallback option
        </p>
        <p className="panel-muted mt-1 text-sm">
          For a live demo, open the patient QR on a phone and point your PC
          camera at it. If camera access is unreliable, switch to file scan or
          paste the raw string below.
        </p>
      </div>

      <form onSubmit={handleManualSubmit} className="mx-auto max-w-lg text-left">
        <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
          Manual connection
        </label>
        <input
          type="text"
          value={manualInput}
          onChange={(event) => setManualInput(event.target.value)}
          placeholder="netsanet:0x... or 0x..."
        />

        {error && <p className="mt-2 text-sm text-rose-500">{error}</p>}

        <button type="submit" className="btn-secondary mt-4 w-full">
          Connect Patient
        </button>
      </form>
    </div>
  );
}

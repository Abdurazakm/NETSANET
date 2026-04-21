import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Camera,
  ImageUp,
  Play,
  QrCode,
  ScanLine,
  StopCircle,
  Upload,
  X,
} from 'lucide-react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { toast } from 'sonner';

function isWalletAddress(value) {
  return /^0x[a-fA-F0-9]{40}$/.test(value);
}

function parsePatientPayload(value) {
  const trimmedValue = value.trim();

  if (trimmedValue.startsWith('netsanet:')) {
    const parts = trimmedValue.split(':');
    if (parts.length >= 3 && isWalletAddress(parts[1])) {
      return {
        address: parts[1],
        base64Key: parts.slice(2).join(':'),
      };
    }
  }

  if (isWalletAddress(trimmedValue)) {
    return {
      address: trimmedValue,
      base64Key: null,
    };
  }

  return null;
}

function getScannerErrorMessage(error) {
  const message = error instanceof Error ? error.message : String(error);

  if (message.toLowerCase().includes('permission')) {
    return 'Camera permission denied. Use manual entry.';
  }

  if (message.toLowerCase().includes('secure context')) {
    return 'Camera requires https or localhost.';
  }

  if (message.toLowerCase().includes('not found')) {
    return 'No camera found.';
  }

  return 'Unable to start camera scanner.';
}

function choosePreferredCamera(cameras) {
  return (
    cameras.find((camera) => /back|rear|environment/i.test(camera.label)) ?? cameras[0]
  );
}

function formatCameraLabel(camera, index) {
  return camera.label || `Camera ${index + 1}`;
}

export default function DoctorQRScanner({ onScan, activePatient }) {
  const [manualInput, setManualInput] = useState('');
  const [error, setError] = useState('');
  const [scanMessage, setScanMessage] = useState('');
  const [cameras, setCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState('');
  const [cameraLoading, setCameraLoading] = useState(false);
  const [fileLoading, setFileLoading] = useState(false);
  const [scannerActive, setScannerActive] = useState(false);

  const scannerRef = useRef(null);
  const mountedRef = useRef(true);
  const lastDecodedRef = useRef('');
  const readerIdRef = useRef(`reader-${Math.random().toString(36).slice(2, 10)}`);

  const getScannerInstance = useCallback(() => {
    if (!scannerRef.current) {
      scannerRef.current = new Html5Qrcode(readerIdRef.current, {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        verbose: false,
      });
    }
    return scannerRef.current;
  }, []);

  const stopScanner = useCallback(async (shouldResetMessage = false) => {
    const scanner = scannerRef.current;

    try {
      if (scanner?.isScanning) {
        await scanner.stop();
      }
    } catch (stopError) {
      console.error('Failed to stop scanner:', stopError);
    }

    try {
      scanner?.clear();
    } catch (clearError) {
      console.error('Failed to clear scanner:', clearError);
    }

    scannerRef.current = null;

    if (mountedRef.current) {
      setScannerActive(false);
      if (shouldResetMessage) {
        setScanMessage('');
      }
    }
  }, []);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      void stopScanner();
    };
  }, [stopScanner]);

  const handleScannedPayload = useCallback(async (decodedText) => {
    const parsedPayload = parsePatientPayload(decodedText);

    if (!parsedPayload || lastDecodedRef.current === decodedText) {
      return;
    }

    lastDecodedRef.current = decodedText;

    if (mountedRef.current) {
      setManualInput(decodedText);
      setScanMessage('Patient detected. Opening session...');
      setError('');
    }

    toast.success('Patient QR detected');
    await stopScanner();
    onScan(parsedPayload);
  }, [onScan, stopScanner]);

  const startCameraScan = useCallback(async () => {
    lastDecodedRef.current = '';
    setCameraLoading(true);
    setError('');
    setScanMessage('');

    try {
      const availableCameras = cameras.length ? cameras : await Html5Qrcode.getCameras();

      if (!availableCameras.length) {
        if (mountedRef.current) {
          setError('No camera devices found. Use manual entry.');
        }
        return;
      }

      if (mountedRef.current) {
        setCameras(availableCameras);
      }

      const defaultCamera = selectedCameraId
        ? availableCameras.find((camera) => camera.id === selectedCameraId)
        : choosePreferredCamera(availableCameras);
      const cameraId = defaultCamera?.id ?? availableCameras[0].id;

      if (mountedRef.current) {
        setSelectedCameraId(cameraId);
      }

      await stopScanner();

      const scanner = getScannerInstance();
      await scanner.start(
        cameraId,
        {
          fps: 10,
          qrbox: { width: 220, height: 220 },
          aspectRatio: 1,
          disableFlip: false,
        },
        (decodedText) => {
          void handleScannedPayload(decodedText);
        },
        () => {}
      );

      if (mountedRef.current) {
        setScannerActive(true);
        setScanMessage('Hold QR code inside frame');
      }
    } catch (cameraError) {
      console.error('Camera error:', cameraError);
      if (mountedRef.current) {
        setError(getScannerErrorMessage(cameraError));
      }
      await stopScanner(true);
    } finally {
      if (mountedRef.current) {
        setCameraLoading(false);
      }
    }
  }, [cameras, getScannerInstance, handleScannedPayload, selectedCameraId, stopScanner]);

  const handleManualConnect = () => {
    const parsedPayload = parsePatientPayload(manualInput);

    if (!parsedPayload) {
      setError('Enter a valid Netsanet payload or wallet address.');
      return;
    }

    setError('');
    setScanMessage('Connecting...');
    onScan(parsedPayload);
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileLoading(true);
    setError('');

    try {
      await stopScanner();
      const scanner = getScannerInstance();
      const decodedText = await scanner.scanFile(file, false);
      const parsedPayload = parsePatientPayload(decodedText);

      if (!parsedPayload) {
        setError('Invalid QR code in image.');
        return;
      }

      setManualInput(decodedText);
      setScanMessage('QR decoded successfully.');
      toast.success('QR image scanned');
      onScan(parsedPayload);
    } catch (fileError) {
      console.error('Image scan error:', fileError);
      setError('Unable to decode image.');
    } finally {
      await stopScanner();
      if (mountedRef.current) {
        setFileLoading(false);
      }
      event.target.value = '';
    }
  };

  return (
    <section className="card-premium">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl" style={{ backgroundColor: '#E8F4EC' }}>
            <QrCode className="size-5" style={{ color: '#22A05B' }} />
          </div>
          <div>
            <h3 className="font-bold">QR Scanner</h3>
            <p className="text-sm text-slate-500">Scan patient QR code</p>
          </div>
        </div>

        {scannerActive && (
          <div className="badge-success">
            <ScanLine className="size-3 animate-pulse" />
            Scanning
          </div>
        )}
      </div>

      <div className="mt-4 rounded-3xl p-4 ring-2" style={{ backgroundColor: '#1A2A30', ringColor: 'rgba(34, 160, 91, 0.3)' }}>
        <div className="relative aspect-[4/3] overflow-hidden rounded-2xl">
          <div
            id={readerIdRef.current}
            className="absolute inset-0 h-full w-full [&_canvas]:h-full [&_canvas]:w-full [&_video]:h-full [&_video]:w-full [&_video]:object-cover"
          />

          {!scannerActive && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-white">
              <QrCode className="size-10 text-slate-400" />
              <p className="mt-3 font-medium">Ready to scan</p>
              <p className="mt-1 text-sm text-slate-400">
                Start camera to scan patient QR
              </p>
            </div>
          )}

          <div className="pointer-events-none absolute inset-6 rounded-xl border-2 shadow-[0_0_20px_rgba(34,160,91,0.3)]" style={{ borderColor: 'rgba(34, 160, 91, 0.5)' }} />
        </div>

        <div className="mt-4 flex items-center gap-3">
          <select
            value={selectedCameraId}
            onChange={(event) => setSelectedCameraId(event.target.value)}
            className="input-premium flex-1"
          >
            {cameras.length === 0 ? (
              <option value="">Select camera</option>
            ) : (
              cameras.map((camera, index) => (
                <option key={camera.id} value={camera.id}>
                  {formatCameraLabel(camera, index)}
                </option>
              ))
            )}
          </select>

          {scannerActive ? (
            <button
              onClick={() => void stopScanner(true)}
              disabled={cameraLoading}
              className="btn-secondary"
            >
              <StopCircle className="size-4" />
              Stop
            </button>
          ) : (
            <button
              onClick={() => void startCameraScan()}
              disabled={cameraLoading}
              className="btn-primary"
            >
              <Play className="size-4" />
              {cameraLoading ? 'Starting...' : 'Start'}
            </button>
          )}
        </div>

        {scanMessage && !error && (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-info-light px-3 py-2 text-sm text-info-foreground">
            <ScanLine className="size-4" />
            {scanMessage}
          </div>
        )}
      </div>

      <div className="mt-4">
        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Or enter manually
        </p>
        <textarea
          value={manualInput}
          onChange={(event) => setManualInput(event.target.value)}
          placeholder="netsanet:0x... or 0x..."
          rows={3}
          className="input-premium"
        />
      </div>

      <div className="mt-4 flex gap-3">
        <button
          onClick={handleManualConnect}
          className="btn-primary flex-1"
        >
          <Camera className="size-4" />
          Connect
        </button>

        <label className="btn-secondary cursor-pointer">
          <Upload className="size-4" />
          {fileLoading ? 'Reading...' : 'Upload'}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageUpload}
          />
        </label>
      </div>

      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-lg bg-destructive/5 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <p>{error}</p>
        </div>
      )}
    </section>
  );
}
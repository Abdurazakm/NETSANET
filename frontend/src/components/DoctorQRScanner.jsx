import { useState } from 'react';

export default function DoctorQRScanner({ onScan }) {
  const [manualInput, setManualInput] = useState('');
  const [error, setError] = useState('');

  // Parses the QR code value. Format is either:
  // 1. "netsanet:<address>:<base64Key>"
  // 2. "<address>"
  const handleInput = (value) => {
    setError('');
    
    if (value.startsWith('netsanet:')) {
      const parts = value.split(':');
      if (parts.length >= 3) {
        const address = parts[1];
        const base64Key = parts.slice(2).join(':'); // In case base64 has colons, though it shouldn't
        onScan({ address, base64Key });
        return;
      }
    } 
    
    // Fallback: Just an address
    if (value.startsWith('0x') && value.length === 42) {
      onScan({ address: value, base64Key: null });
      return;
    }

    setError('Invalid QR Code format or Ethereum address.');
  };

  return (
    <div className="glass-panel p-8 rounded-xl border-eth-yellow border-t-4 max-w-2xl mx-auto text-center shadow-xl">
      <div className="w-16 h-16 rounded-full bg-eth-yellow/10 flex items-center justify-center mx-auto mb-4">
        <span className="text-2xl">📷</span>
      </div>
      
      <h2 className="text-2xl font-bold mb-2">Scan Patient Medical ID</h2>
      <p className="text-muted mb-8 max-w-md mx-auto">
        Scan the patient's QR code to connect their record to this clinic session, or paste their Ethereum address manually.
      </p>

      {/* Simulated Scanner Area */}
      <div className="bg-black aspect-video rounded-xl border border-gray-800 flex flex-col items-center justify-center mb-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-eth-yellow/5 to-transparent animate-[scan_2s_ease-in-out_infinite]" />
        <p className="text-secondary text-sm z-10">Camera feed disabled for demo</p>
        <p className="text-xs text-gray-600 mt-2 z-10">Please use manual entry below</p>
      </div>

      <div className="max-w-md mx-auto relative">
        <input 
          type="text" 
          value={manualInput}
          onChange={(e) => setManualInput(e.target.value)}
          placeholder="netsanet:0x... or 0x..."
          className="w-full bg-[#1a1a1a] border border-gray-700 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-eth-yellow transition-colors text-white"
        />
        <button 
          onClick={() => handleInput(manualInput)}
          className="mt-4 w-full bg-eth-yellow text-bg-dark font-bold py-3 rounded-lg hover:bg-yellow-500 transition-colors"
        >
          Connect Patient
        </button>
        {error && <p className="text-error text-xs mt-2">{error}</p>}
      </div>
    </div>
  );
}

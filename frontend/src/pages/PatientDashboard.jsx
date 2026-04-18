import { useState, useEffect } from 'react';
import { deriveKeyFromWallet } from '../utils/encryption';
import PatientRegistration from '../components/PatientRegistration';
import QRCodeDisplay from '../components/QRCodeDisplay';
import AccessManager from '../components/AccessManager';
import MedicalTimeline from '../components/MedicalTimeline';

export default function PatientDashboard({ provider, signer, address, contract }) {
  const [patientData, setPatientData] = useState(null);
  const [encryptionKey, setEncryptionKey] = useState(null);
  const [loading, setLoading] = useState(true);

  // 1. Check if registered on chain
  const checkRegistration = async () => {
    try {
      setLoading(true);
      const data = await contract.patients(address);
      if (data.exists) {
        setPatientData({ name: data.name, createdAt: Number(data.createdAt) });
      } else {
        setPatientData(null); // Not registered
      }
    } catch (err) {
      console.error('Failed to check registration:', err);
    } finally {
      setLoading(false);
    }
  };

  // 2. Derive encryption key from wallet signature
  const handleDeriveKey = async () => {
    try {
      const key = await deriveKeyFromWallet(signer);
      setEncryptionKey(key);
    } catch (err) {
      console.error('Key derivation failed:', err);
      // User rejected the signature
    }
  };

  useEffect(() => {
    if (contract && address) {
      checkRegistration();
    }
  }, [contract, address]);

  if (loading) {
    return <div className="text-center p-10 animate-pulse text-secondary border border-gray-800 rounded-xl mt-6">Loading blockchain data...</div>;
  }

  // Not registered flow
  if (!patientData) {
    return <PatientRegistration contract={contract} onRegistered={checkRegistration} />;
  }

  // Registered but needs to unlock encryption key
  if (!encryptionKey) {
    return (
      <div className="glass-panel p-8 rounded-xl text-center mt-6 border-eth-green border-t-4 shadow-xl">
        <h2 className="text-2xl font-bold mb-2 text-primary">Welcome back, {patientData.name}</h2>
        <p className="text-muted mb-8 max-w-lg mx-auto">
          To view your encrypted medical history, you need to derive your decryption key. 
          Please sign the authorization message in MetaMask.
        </p>
        <button 
          onClick={handleDeriveKey}
          className="bg-eth-green hover:bg-green-600 text-white font-bold py-3 px-8 rounded-lg outline-none active:scale-95 transition-transform"
        >
          Unlock Medical Records 🔐
        </button>
      </div>
    );
  }

  // Fully unlocked dashboard
  return (
    <div className="mt-8 space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-center bg-surface p-4 rounded-xl border border-gray-700 shadow-sm">
        <h2 className="text-xl font-bold text-eth-green">Patient: {patientData.name}</h2>
        <span className="text-xs text-muted font-mono bg-[#1a1a1a] px-3 py-1 rounded border border-gray-800">
          {address}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - ID & Access */}
        <div className="space-y-6">
          <QRCodeDisplay address={address} />
          <AccessManager contract={contract} address={address} />
        </div>

        {/* Right Column - Timeline */}
        <div className="lg:col-span-2">
          <MedicalTimeline 
            contract={contract} 
            address={address} 
            encryptionKey={encryptionKey} 
          />
        </div>
      </div>
    </div>
  );
}

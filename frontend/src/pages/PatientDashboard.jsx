import { useState, useEffect } from "react";
import { deriveKeyFromWallet, exportKeyToBase64 } from "../utils/encryption";
import PatientRegistration from "../components/PatientRegistration";
import QRCodeDisplay from "../components/QRCodeDisplay";
import AccessManager from "../components/AccessManager";
import MedicalTimeline from "../components/MedicalTimeline";

export default function PatientDashboard({ signer, address, contract }) {
  const [patientData, setPatientData] = useState(null);
  const [encryptionKey, setEncryptionKey] = useState(null);
  const [base64Key, setBase64Key] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkRegistration = async () => {
    try {
      setLoading(true);
      const data = await contract.patients(address);

      if (data.exists) {
        setPatientData({ name: data.name, createdAt: Number(data.createdAt) });
      } else {
        setPatientData(null);
      }
    } catch (err) {
      console.error("Failed to check registration:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeriveKey = async () => {
    try {
      const key = await deriveKeyFromWallet(signer);
      setEncryptionKey(key);
      const exported = await exportKeyToBase64(key);
      setBase64Key(exported);
    } catch (err) {
      console.error("Key derivation failed:", err);
    }
  };

  useEffect(() => {
    if (!contract || !address) {
      return undefined;
    }

    let cancelled = false;
    const timeoutId = window.setTimeout(async () => {
      try {
        setLoading(true);
        const data = await contract.patients(address);

        if (cancelled) {
          return;
        }

        if (data.exists) {
          setPatientData({ name: data.name, createdAt: Number(data.createdAt) });
        } else {
          setPatientData(null);
        }
      } catch (err) {
        if (!cancelled) {
          console.error("Failed to check registration:", err);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [contract, address]);

  if (loading) {
    return (
      <div className="glass-panel mt-6 p-10 text-center text-slate-500 dark:text-slate-300">
        Loading blockchain data...
      </div>
    );
  }

  if (!patientData) {
    return (
      <PatientRegistration contract={contract} onRegistered={checkRegistration} />
    );
  }

  if (!encryptionKey) {
    return (
      <div className="glass-panel mt-6 px-6 py-8 text-center sm:px-8">
        <p className="section-kicker">Encrypted patient workspace</p>
        <h2 className="mt-3 font-display text-3xl font-bold text-slate-900 dark:text-slate-50">
          Welcome back, {patientData.name}
        </h2>
        <p className="panel-copy mx-auto mt-3 mb-8 max-w-2xl">
          To view your encrypted medical history, you need to derive your
          decryption key. Please sign the authorization message in MetaMask.
        </p>
        <button
          onClick={handleDeriveKey}
          className="btn-primary px-8 py-3 text-lg"
        >
          Unlock Medical Records
        </button>
      </div>
    );
  }

  return (
    <div className="mt-8 space-y-6 animate-fade-in">
      <div className="glass-panel px-5 py-5 sm:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="section-kicker">Patient workspace</p>
            <h2 className="mt-3 font-display text-3xl font-bold text-slate-900 dark:text-slate-50">
              {patientData.name}
            </h2>
            <p className="panel-copy mt-2 max-w-2xl">
              Manage your QR identity, review access requests, and read the
              encrypted timeline that only unlocks with your signature.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="surface-chip">Patient wallet</span>
            <span className="surface-chip break-all font-mono text-[11px] sm:text-xs">
              {address}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6">
          <QRCodeDisplay address={address} base64Key={base64Key} />
          <AccessManager contract={contract} address={address} />
        </div>

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

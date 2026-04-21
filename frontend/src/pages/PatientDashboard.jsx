import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Calendar,
  Clock,
  History,
  KeyRound,
  ListTodo,
  RefreshCw,
  Shield,
  ShieldCheck,
  User,
} from 'lucide-react';
import { deriveKeyFromWallet, exportKeyToBase64 } from '../utils/encryption';
import PatientRegistration from '../components/PatientRegistration';
import QRCodeDisplay from '../components/QRCodeDisplay';
import AccessManager from '../components/AccessManager';
import AccessRequests from '../components/AccessRequests';
import MedicalTimeline from '../components/MedicalTimeline';
import PatientAuditLog from '../components/PatientAuditLog';
import { AddressPill } from '../components/app/address-pill';
import { StatCard } from '../components/app/stat-card';

const TABS = [
  { id: 'overview', label: 'Overview', icon: User },
  { id: 'records', label: 'Records', icon: ListTodo },
  { id: 'access', label: 'Access', icon: Shield },
  { id: 'history', label: 'History', icon: History },
];

function formatRegistrationDate(timestamp) {
  if (!timestamp) return 'Unknown';
  return new Date(timestamp * 1000).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function getInitials(name) {
  if (!name) return '??';
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

function getUnlockErrorMessage(error) {
  const message = [error?.shortMessage, error?.reason, error?.info?.error?.message, error?.message]
    .filter(Boolean).join(' ').toLowerCase();
  if (message.includes('user rejected') || message.includes('action_rejected')) {
    return 'Signature request was cancelled. Sign the wallet prompt.';
  }
  return 'Unable to unlock the secure vault. Reconnect wallet and try again.';
}

export default function PatientDashboard({ signer, address, contract }) {
  const [patientData, setPatientData] = useState(null);
  const [encryptionKey, setEncryptionKey] = useState(null);
  const [base64Key, setBase64Key] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [unlocking, setUnlocking] = useState(false);
  const [unlockError, setUnlockError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');

  const checkRegistration = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError('');
      const data = await contract.patients(address);
      if (data.exists) {
        setPatientData({ name: data.name, createdAt: Number(data.createdAt) });
      } else {
        setPatientData(null);
      }
    } catch (error) {
      console.error('Failed to check patient registration:', error);
      setLoadError('Unable to load dashboard. Confirm wallet connection.');
    } finally {
      setLoading(false);
    }
  }, [address, contract]);

  const handleDeriveKey = async () => {
    try {
      setUnlocking(true);
      setUnlockError('');
      const key = await deriveKeyFromWallet(signer);
      const exportedKey = await exportKeyToBase64(key);
      setEncryptionKey(key);
      setBase64Key(exportedKey);
    } catch (error) {
      console.error('Key derivation failed:', error);
      setUnlockError(getUnlockErrorMessage(error));
    } finally {
      setUnlocking(false);
    }
  };

  useEffect(() => {
    if (contract && address) {
      const timeoutId = window.setTimeout(() => void checkRegistration(), 0);
      return () => window.clearTimeout(timeoutId);
    }
  }, [address, contract, checkRegistration]);

  const registrationDate = useMemo(() => formatRegistrationDate(patientData?.createdAt), [patientData?.createdAt]);

  if (loading) {
    return (
      <div className="card-premium p-12 text-center">
        <div className="mx-auto flex max-w-md flex-col items-center">
          <div className="size-12 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
          <h2 className="mt-6 text-xl font-bold">Loading...</h2>
          <p className="mt-2 text-sm text-muted-foreground">Syncing patient data</p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="card-premium p-8 text-center border-destructive/30 bg-destructive/5">
        <AlertCircle className="mx-auto size-10 text-destructive" />
        <h2 className="mt-4 text-lg font-bold">Dashboard unavailable</h2>
        <p className="mt-2 text-sm text-muted-foreground">{loadError}</p>
        <button onClick={checkRegistration} className="btn-primary mt-6">
          <RefreshCw className="size-4" /> Retry
        </button>
      </div>
    );
  }

  if (!patientData) {
    return <PatientRegistration contract={contract} onRegistered={checkRegistration} address={address} />;
  }

  if (!encryptionKey) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="card-premium">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:gap-6">
              <div className="flex size-16 items-center justify-center rounded-xl bg-primary text-2xl font-bold text-white">
                {getInitials(patientData.name)}
              </div>
              <div>
                <h2 className="text-3xl font-bold">Welcome back, {patientData.name}</h2>
                <p className="mt-1 text-muted-foreground">Sign once to unlock your medical records</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <AddressPill value={address} label="Wallet" className="bg-muted/50" />
              <div className="badge-info">Registered {registrationDate}</div>
            </div>
          </div>
          {unlockError && (
            <div className="mt-4 flex items-start gap-3 rounded-lg bg-destructive/5 p-4 text-sm text-destructive">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <p>{unlockError}</p>
            </div>
          )}
          <button onClick={handleDeriveKey} disabled={unlocking} className="btn-primary mt-6 w-full lg:w-auto lg:min-w-[240px]">
            <KeyRound className="size-4" />
            {unlocking ? 'Unlocking...' : 'Unlock Medical Records'}
          </button>
        </div>
        <div className="card-flat">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-info-light">
              <ShieldCheck className="size-5 text-info" />
            </div>
            <div>
              <p className="text-sm font-medium">Secure Vault</p>
              <p className="text-xs text-muted-foreground">One signature unlocks your records</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="card-premium p-4">
        <div className="flex items-center gap-6">
          <div className="flex size-12 items-center justify-center rounded-xl bg-primary text-xl font-bold text-white">
            {getInitials(patientData.name)}
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold">{patientData.name}</h2>
            <p className="text-sm text-muted-foreground">Wallet: {address.slice(0, 8)}...{address.slice(-6)}</p>
          </div>
          <div className="flex gap-4">
            <StatCard icon={Calendar} label="Registered" value={registrationDate} className="min-w-[160px]" />
            <StatCard icon={ShieldCheck} label="Vault" value="Unlocked" className="min-w-[160px]" />
          </div>
        </div>
      </div>

      <div className="border-b border-border">
        <nav className="-mb-px flex gap-1">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                  isActive
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground'
                }`}
              >
                <Icon className="size-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="card-flat">
            <h3 className="text-lg font-bold">Quick Actions</h3>
            <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
              <button onClick={() => setActiveTab('records')} className="btn-secondary flex-col gap-2 h-auto py-4">
                <ListTodo className="size-6" />
                <span>View Records</span>
              </button>
              <button onClick={() => setActiveTab('access')} className="btn-secondary flex-col gap-2 h-auto py-4">
                <Shield className="size-6" />
                <span>Manage Access</span>
              </button>
              <button onClick={() => setActiveTab('access')} className="btn-secondary flex-col gap-2 h-auto py-4">
                <Clock className="size-6" />
                <span>Access Requests</span>
              </button>
              <button onClick={() => setActiveTab('history')} className="btn-secondary flex-col gap-2 h-auto py-4">
                <History className="size-6" />
                <span>Audit Log</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'records' && (
        <MedicalTimeline contract={contract} address={address} encryptionKey={encryptionKey} />
      )}

      {activeTab === 'access' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-1">
              <QRCodeDisplay address={address} base64Key={base64Key} />
            </div>
            <div className="lg:col-span-2 space-y-6">
              <AccessRequests contract={contract} address={address} />
              <AccessManager contract={contract} address={address} />
            </div>
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <PatientAuditLog contract={contract} address={address} />
      )}
    </div>
  );
}
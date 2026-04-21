import { useState } from 'react';
import {
  Activity,
  CheckCircle2,
  ClipboardList,
  FilePenLine,
  History,
  Mail,
  QrCode,
  Shield,
  ShieldCheck,
  Stethoscope,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import DoctorQRScanner from '../components/DoctorQRScanner';
import DoctorAccessManager from '../components/DoctorAccessManager';
import DoctorRequestAccess from '../components/DoctorRequestAccess';
import RecordSubmissionForm from '../components/RecordSubmissionForm';
import DoctorMedicalTimeline from '../components/DoctorMedicalTimeline';
import { StatCard } from '../components/app/stat-card';

const TABS = [
  { id: 'overview', label: 'Overview', icon: Stethoscope },
  { id: 'records', label: 'Records', icon: ClipboardList },
  { id: 'access', label: 'Access', icon: Shield },
  { id: 'history', label: 'History', icon: History },
];

export default function DoctorDashboard({ address, contract }) {
  const [scannedPatient, setScannedPatient] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeTab, setActiveTab] = useState('overview');

  const handleScan = (patientData) => {
    setScannedPatient(patientData);
  };

  const handleClearPatient = () => {
    setScannedPatient(null);
  };

  const handleRecordAdded = async (cid, category, recordType) => {
    try {
      const tx = await contract.addRecord(scannedPatient.address, cid, category, recordType);
      await tx.wait();
      toast.success('Record stored on chain successfully.');
      setRefreshKey((currentValue) => currentValue + 1);
    } catch (err) {
      console.error(err);
      toast.error(`Failed to save on chain: ${err.message}`);
      throw err;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="card-premium p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex size-12 items-center justify-center rounded-xl bg-primary text-xl font-bold text-white">
              DR
            </div>
            <div>
              <h2 className="text-xl font-bold">Doctor Dashboard</h2>
              <p className="text-sm text-muted-foreground">Scan patients and manage records</p>
            </div>
          </div>
          <div className="flex gap-4">
            <StatCard icon={Users} label="Sessions" value={scannedPatient ? "1" : "0"} className="min-w-[120px]" />
            <StatCard icon={FilePenLine} label="Records" value="0" className="min-w-[120px]" />
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
          {scannedPatient ? (
            <div className="card-premium">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-lg font-bold">Patient Session Active</h3>
                  <p className="text-sm text-muted-foreground">
                    {scannedPatient.address.slice(0, 8)}...{scannedPatient.address.slice(-6)}
                  </p>
                </div>
                <button onClick={handleClearPatient} className="btn-secondary text-sm">
                  <Users className="size-4" />
                  End Session
                </button>
              </div>
              <div className="mt-4 flex items-center gap-3 rounded-lg bg-success-light/50 p-3">
                <CheckCircle2 className="size-5 text-success" />
                <div>
                  <p className="text-sm font-medium text-success-foreground">Session Active</p>
                  <p className="text-xs text-muted-foreground">
                    {scannedPatient.base64Key ? 'Encryption key received' : 'Wallet-only mode'}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="card-flat text-center">
              <QrCode className="mx-auto size-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-bold">No Patient Connected</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Scan a patient QR code to start a session
              </p>
              <button onClick={() => setActiveTab('records')} className="btn-primary mt-4">
                <QrCode className="size-4" />
                Scan QR
              </button>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <button onClick={() => setActiveTab('records')} className="btn-secondary flex-col gap-2 h-auto py-4">
              <ClipboardList className="size-6" />
              <span>Add Records</span>
            </button>
            <button onClick={() => setActiveTab('access')} className="btn-secondary flex-col gap-2 h-auto py-4">
              <Mail className="size-6" />
              <span>Request Access</span>
            </button>
            <button onClick={() => setActiveTab('access')} className="btn-secondary flex-col gap-2 h-auto py-4">
              <ShieldCheck className="size-6" />
              <span>Manage Access</span>
            </button>
            <button onClick={() => setActiveTab('history')} className="btn-secondary flex-col gap-2 h-auto py-4">
              <History className="size-6" />
              <span>View History</span>
            </button>
          </div>
        </div>
      )}

      {activeTab === 'records' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div>
              <DoctorQRScanner onScan={handleScan} activePatient={scannedPatient} />
            </div>
            <div className="lg:col-span-2 space-y-6">
              <RecordSubmissionForm
                patientAddress={scannedPatient?.address ?? ''}
                base64Key={scannedPatient?.base64Key ?? null}
                onRecordAdded={handleRecordAdded}
              />
              <DoctorMedicalTimeline
                key={refreshKey}
                contract={contract}
                doctorAddress={address}
                patientAddress={scannedPatient?.address ?? ''}
                base64Key={scannedPatient?.base64Key ?? null}
              />
            </div>
          </div>
        </div>
      )}

      {activeTab === 'access' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <DoctorRequestAccess
              contract={contract}
              patientAddress={scannedPatient?.address ?? ''}
              doctorAddress={address}
            />
            <DoctorAccessManager
              contract={contract}
              doctorAddress={address}
              patientAddress={scannedPatient?.address ?? ''}
            />
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="card-flat">
          <h3 className="text-lg font-bold">Activity History</h3>
          <p className="mt-2 text-sm text-muted-foreground">Coming soon...</p>
        </div>
      )}
    </div>
  );
}
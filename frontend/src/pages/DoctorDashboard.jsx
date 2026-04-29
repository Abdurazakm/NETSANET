import { useState } from "react";
import DoctorQRScanner from "../components/DoctorQRScanner";
import DoctorAccessManager from "../components/DoctorAccessManager";
import RecordSubmissionForm from "../components/RecordSubmissionForm";
import DoctorMedicalTimeline from "../components/DoctorMedicalTimeline";

export default function DoctorDashboard({ address, contract }) {
  const [scannedPatient, setScannedPatient] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleScan = (patientData) => {
    setScannedPatient(patientData);
  };

  const handleClearPatient = () => {
    setScannedPatient(null);
  };

  const handleRecordAdded = async (cid, category, recordType) => {
    try {
      const tx = await contract.addRecord(
        scannedPatient.address,
        cid,
        category,
        recordType,
      );
      await tx.wait();
      alert("Record stored on-chain successfully!");
      setRefreshKey((previous) => previous + 1);
    } catch (err) {
      console.error(err);
      alert(`Failed to save on chain: ${err.message}`);
      throw err;
    }
  };

  return (
    <div className="mt-8 space-y-6 animate-fade-in">
      <div className="glass-panel px-5 py-5 sm:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="section-kicker">Doctor workspace</p>
            <h2 className="mt-3 font-display text-3xl font-bold text-slate-900 dark:text-slate-50">
              Doctor dashboard
            </h2>
            <p className="panel-copy mt-2 max-w-2xl">
              Scan a patient QR, request consent by category, add encrypted
              records, and review only the timeline slices the patient approves.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="surface-chip">Clinic wallet</span>
            <span className="surface-chip break-all font-mono text-[11px] sm:text-xs">
              {address}
            </span>
          </div>
        </div>
      </div>

      {!scannedPatient ? (
        <DoctorQRScanner onScan={handleScan} />
      ) : (
        <div className="space-y-6">
          <div className="glass-panel px-5 py-5 sm:px-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="section-kicker">Active session</p>
                <p className="mt-3 text-sm font-semibold text-slate-900 dark:text-slate-50">
                  Active patient
                </p>
                <p className="mt-2 break-all font-mono text-sm text-slate-600 dark:text-slate-200">
                  {scannedPatient.address}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <span className="surface-chip">Patient connected</span>
                {scannedPatient.base64Key && (
                  <span className="surface-chip border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                    Session key received
                  </span>
                )}
                <button
                  onClick={handleClearPatient}
                  className="btn-danger px-4 py-2 text-xs"
                >
                  Close Session
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="space-y-6">
              <DoctorAccessManager
                contract={contract}
                doctorAddress={address}
                patientAddress={scannedPatient.address}
              />
              <RecordSubmissionForm
                patientAddress={scannedPatient.address}
                base64Key={scannedPatient.base64Key}
                onRecordAdded={handleRecordAdded}
              />
            </div>

            <div className="lg:col-span-2">
              <DoctorMedicalTimeline
                key={refreshKey}
                contract={contract}
                doctorAddress={address}
                patientAddress={scannedPatient.address}
                base64Key={scannedPatient.base64Key}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

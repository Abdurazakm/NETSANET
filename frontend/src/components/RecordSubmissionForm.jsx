import { useState } from 'react';
import { AlertCircle, FilePlus2 } from 'lucide-react';
import { submitRecord, CATEGORY_LABELS } from '../utils/records';
import { importKeyFromBase64 } from '../utils/encryption';

export default function RecordSubmissionForm({ patientAddress, base64Key, onRecordAdded }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [category, setCategory] = useState('0');
  const [recordType, setRecordType] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [medication, setMedication] = useState('');
  const [cd4Count, setCd4Count] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!base64Key) {
      setError('Cannot submit a record without the patient session key.');
      return;
    }

    if (!recordType.trim()) {
      setError('Record type / title is required.');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const cryptoKey = await importKeyFromBase64(base64Key);
      const recordData = {
        diagnosis,
        medication,
        cd4Count,
        notes,
      };

      const cid = await submitRecord(
        cryptoKey,
        recordData,
        patientAddress,
        CATEGORY_LABELS[category],
        recordType.trim()
      );

      await onRecordAdded(cid, category, recordType.trim());

      setCategory('0');
      setRecordType('');
      setDiagnosis('');
      setMedication('');
      setCd4Count('');
      setNotes('');
    } catch (err) {
      console.error(err);
      setError(`Failed to submit record: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!patientAddress) {
    return (
      <section className="card-premium">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
            <FilePlus2 className="size-5 text-muted-foreground" />
          </div>
          <div>
            <h3 className="font-bold">Add Medical Record</h3>
            <p className="text-sm text-muted-foreground">
              Scan patient QR to enable
            </p>
          </div>
        </div>
        <div className="mt-4 rounded-lg border border-dashed border-border p-4 text-center">
          <p className="text-sm text-muted-foreground">
            Scan a patient QR code to start a session and add records
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="card-premium">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
            <FilePlus2 className="size-5 text-primary" />
          </div>
          <div>
            <h3 className="font-bold">Add Record</h3>
            <p className="text-sm text-muted-foreground">
              Submit encrypted medical record
            </p>
          </div>
        </div>
      </div>

      {!base64Key && (
        <div className="mt-4 rounded-lg bg-warning-light px-4 py-3 text-sm text-warning-foreground">
          Session key missing. Record submission disabled.
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label className="block text-sm font-medium">Category</label>
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="mt-2 input-premium"
          >
            {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium">Record Title</label>
          <input
            type="text"
            required
            value={recordType}
            onChange={(event) => setRecordType(event.target.value)}
            placeholder="e.g. CD4 Checkup"
            className="mt-2 input-premium"
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Diagnosis</label>
          <input
            type="text"
            value={diagnosis}
            onChange={(event) => setDiagnosis(event.target.value)}
            placeholder="e.g. Type 2 Diabetes"
            className="mt-2 input-premium"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium">Medication</label>
            <input
              type="text"
              value={medication}
              onChange={(event) => setMedication(event.target.value)}
              placeholder="e.g. Metformin"
              className="mt-2 input-premium"
            />
          </div>

          <div>
            <label className="block text-sm font-medium">CD4 Count</label>
            <input
              type="text"
              value={cd4Count}
              onChange={(event) => setCd4Count(event.target.value)}
              placeholder="e.g. 600"
              className="mt-2 input-premium"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium">Notes</label>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={3}
            placeholder="Observations..."
            className="mt-2 input-premium"
          />
        </div>

        {error ? (
          <div className="flex items-start gap-2 rounded-lg bg-destructive/5 p-3 text-sm text-destructive">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <p>{error}</p>
          </div>
        ) : null}

        <button
          type="submit"
          disabled={loading || !base64Key}
          className="btn-primary w-full"
        >
          <FilePlus2 className="size-4" />
          {loading ? 'Submitting...' : 'Sign & Submit Record'}
        </button>
      </form>
    </section>
  );
}

import { useState } from 'react';
import { Mail, MessageSquare, Send, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { CATEGORY_LABELS } from '../utils/records';

const DEFAULT_CATEGORY = '0';
const DEFAULT_DURATION = '24';

export default function DoctorRequestAccess({ contract, patientAddress, doctorAddress }) {
  const [category, setCategory] = useState(DEFAULT_CATEGORY);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleRequest = async (e) => {
    e.preventDefault();
    if (!patientAddress) return;
    if (patientAddress.toLowerCase() === doctorAddress?.toLowerCase()) {
      toast.error('Cannot request access to yourself');
      return;
    }

    try {
      setLoading(true);
      const tx = await contract.requestAccess(patientAddress, category, message);
      await tx.wait();
      toast.success('Access request sent to patient');
      setSent(true);
    } catch (err) {
      console.error('Request failed:', err);
      toast.error('Failed to send request: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  if (!patientAddress) {
    return (
      <section className="card-premium">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
            <Mail className="size-5 text-muted-foreground" />
          </div>
          <div>
            <h3 className="font-bold">Request Access</h3>
            <p className="text-sm text-muted-foreground">
              Scan patient QR to request
            </p>
          </div>
        </div>
        <div className="mt-4 rounded-lg border border-dashed border-border p-4 text-center">
          <Wallet className="mx-auto size-6 text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">
            No patient connected
          </p>
        </div>
      </section>
    );
  }

  const isSelfRequest = patientAddress.toLowerCase() === doctorAddress?.toLowerCase();

  if (isSelfRequest) {
    return (
      <section className="card-premium">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-destructive-light">
            <Mail className="size-5 text-destructive" />
          </div>
          <div>
            <h3 className="font-bold">Cannot Request Access</h3>
            <p className="text-sm text-muted-foreground">
              This is your own address
            </p>
          </div>
        </div>
        <div className="mt-4 rounded-lg bg-destructive-light/50 p-4">
          <p className="text-sm text-destructive-foreground">
            You cannot request access to your own medical records. Please scan a patient's QR code.
          </p>
        </div>
      </section>
    );
  }

  if (sent) {
    return (
      <section className="card-premium">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-success-light">
            <Mail className="size-5 text-success" />
          </div>
          <div>
            <h3 className="font-bold">Request Sent</h3>
            <p className="text-sm text-muted-foreground">
              Waiting for patient approval
            </p>
          </div>
        </div>
        <div className="mt-4 rounded-lg bg-success-light/50 p-4">
          <p className="text-sm text-success-foreground">
            Your access request has been sent to the patient. They will need to approve your request before you can view their medical records.
          </p>
        </div>
        <button
          onClick={() => setSent(false)}
          className="btn-secondary mt-4 w-full"
        >
          Send Another Request
        </button>
      </section>
    );
  }

  return (
    <section className="card-premium">
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
          <Mail className="size-5 text-primary" />
        </div>
        <div>
          <h3 className="font-bold">Request Access</h3>
          <p className="text-sm text-muted-foreground">
            Request access to patient records
          </p>
        </div>
      </div>

      <form onSubmit={handleRequest} className="mt-4 space-y-4">
        <div>
          <label className="block text-sm font-medium">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
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
          <label className="block text-sm font-medium">Message (optional)</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Reason for access request..."
            rows={2}
            className="mt-2 input-premium"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full"
        >
          {loading ? (
            'Sending...'
          ) : (
            <>
              <Send className="size-4" />
              Send Access Request
            </>
          )}
        </button>
      </form>
    </section>
  );
}
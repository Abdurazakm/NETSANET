import { useCallback, useEffect, useState } from 'react';
import { Check, Clock, Mail, MessageSquare, X, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { CATEGORY_COLORS, CATEGORY_LABELS } from '../utils/records';

const DEFAULT_DURATION = '24';
const MAX_DURATION_HOURS = 168;

function shortenAddress(value) {
  if (!value || value.length < 12) return value || '';
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function formatDateTime(timestamp) {
  if (!timestamp) return 'Unknown';
  return new Date(timestamp * 1000).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function AccessRequests({ contract, address }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [showForm, setShowForm] = useState(null);
  const [duration, setDuration] = useState(DEFAULT_DURATION);

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      const [doctors, categories, timestamps, messages] = await contract.getPendingRequests(address);
      
      const requestsData = doctors.map((doctor, i) => ({
        id: `${doctor}-${categories[i]}-${timestamps[i]}`,
        doctor,
        category: Number(categories[i]),
        requestedAt: Number(timestamps[i]),
        message: messages[i] || '',
      }));
      
      setRequests(requestsData);
    } catch (err) {
      console.error('Failed to fetch requests:', err);
    } finally {
      setLoading(false);
    }
  }, [contract, address]);

  useEffect(() => {
    if (contract && address) {
      fetchRequests();
      const interval = setInterval(fetchRequests, 15000);
      return () => clearInterval(interval);
    }
  }, [contract, address, fetchRequests]);

  const handleApprove = async (request) => {
    const id = `${request.doctor}-${request.category}`;
    try {
      setProcessingId(id);
      const tx = await contract.approveRequest(request.doctor, request.category, duration);
      await tx.wait();
      toast.success('Access request approved');
      fetchRequests();
    } catch (err) {
      console.error('Approve failed:', err);
      toast.error('Failed to approve request');
    } finally {
      setProcessingId(null);
      setShowForm(null);
    }
  };

  const handleReject = async (request) => {
    const id = `${request.doctor}-${request.category}`;
    try {
      setProcessingId(id);
      const tx = await contract.rejectRequest(request.doctor, request.category);
      await tx.wait();
      toast.success('Access request rejected');
      fetchRequests();
    } catch (err) {
      console.error('Reject failed:', err);
      toast.error('Failed to reject request');
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <section className="card-premium">
        <div className="flex items-center gap-3">
          <Mail className="size-5 text-primary" />
          <h3 className="font-bold">Access Requests</h3>
        </div>
        <div className="mt-4 animate-pulse text-sm text-muted-foreground">
          Loading pending requests...
        </div>
      </section>
    );
  }

  return (
    <section className="card-premium">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
            <Mail className="size-5 text-primary" />
          </div>
          <div>
            <h3 className="font-bold">Access Requests</h3>
            <p className="text-sm text-muted-foreground">
              {requests.length > 0 
                ? `${requests.length} pending request${requests.length > 1 ? 's' : ''}`
                : 'No pending requests'
              }
            </p>
          </div>
        </div>
      </div>

      {requests.length === 0 ? (
        <div className="mt-4 rounded-lg border border-dashed border-border p-4 text-center">
          <Mail className="mx-auto size-6 text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">
            No pending access requests from doctors
          </p>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {requests.map((request) => (
            <div
              key={request.id}
              className="rounded-lg border border-border bg-muted/30 p-4"
            >
              <div className="flex flex-col gap-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span
                      className="size-3 rounded-full"
                      style={{ backgroundColor: CATEGORY_COLORS[request.category] || 'var(--primary)' }}
                    />
                    <span className="font-medium">
                      {CATEGORY_LABELS[request.category]}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="size-3" />
                    {formatDateTime(request.requestedAt)}
                  </div>
                </div>

                <div className="rounded-lg bg-white p-3">
                  <p className="text-xs text-muted-foreground">Doctor Wallet</p>
                  <p className="font-mono text-sm">{shortenAddress(request.doctor)}</p>
                  {request.message && (
                    <div className="mt-2 flex items-start gap-2">
                      <MessageSquare className="size-3 mt-1 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">{request.message}</p>
                    </div>
                  )}
                </div>

                {showForm === request.id ? (
                  <div className="flex flex-col gap-3 rounded-lg border border-border bg-white p-3">
                    <label className="text-sm font-medium">Access Duration (hours)</label>
                    <input
                      type="number"
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                      min="1"
                      max={MAX_DURATION_HOURS}
                      className="input-premium"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApprove(request)}
                        disabled={processingId === request.id}
                        className="btn-primary flex-1"
                      >
                        <Check className="size-4" />
                        Approve
                      </button>
                      <button
                        onClick={() => setShowForm(null)}
                        className="btn-secondary"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowForm(request.id)}
                      className="btn-primary flex-1"
                    >
                      <Check className="size-4" />
                      Review & Approve
                    </button>
                    <button
                      onClick={() => handleReject(request)}
                      disabled={processingId === request.id}
                      className="btn-secondary text-destructive"
                    >
                      <XCircle className="size-4" />
                      Reject
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
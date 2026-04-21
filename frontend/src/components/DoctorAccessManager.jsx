import { useCallback, useEffect, useMemo, useState } from 'react';
import { Lock, RefreshCw, Shield, ShieldCheck } from 'lucide-react';
import { CATEGORY_COLORS, CATEGORY_LABELS } from '../utils/records';

export default function DoctorAccessManager({ contract, doctorAddress, patientAddress }) {
  const [accessStatuses, setAccessStatuses] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAccessStatuses = useCallback(async ({ silent = false } = {}) => {
    try {
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const statuses = {};

      for (const catId of Object.keys(CATEGORY_LABELS)) {
        const hasAccess = await contract.hasActiveAccess(patientAddress, doctorAddress, catId);
        statuses[catId] = hasAccess;
      }

      setAccessStatuses(statuses);
    } catch (err) {
      console.error('Failed to fetch access statuses', err);
    } finally {
      if (silent) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  }, [contract, doctorAddress, patientAddress]);

  useEffect(() => {
    if (contract && patientAddress && doctorAddress) {
      const timeoutId = window.setTimeout(() => {
        void fetchAccessStatuses();
      }, 0);

      return () => window.clearTimeout(timeoutId);
    }

    return undefined;
  }, [contract, patientAddress, doctorAddress, fetchAccessStatuses]);

  const grantedCount = useMemo(
    () => Object.values(accessStatuses).filter(Boolean).length,
    [accessStatuses]
  );

  if (!patientAddress) {
    return (
      <section className="card-premium">
        <div className="flex items-center gap-3">
          <Shield className="size-5 text-muted-foreground" />
          <h3 className="font-bold">Patient Access</h3>
        </div>
        <div className="mt-4 rounded-lg border border-dashed border-border p-4 text-center">
          <p className="text-sm text-muted-foreground">
            Scan patient QR to view access
          </p>
        </div>
      </section>
    );
  }

  if (loading) {
    return (
      <section className="card-premium animate-pulse p-4">
        Checking access...
      </section>
    );
  }

  return (
    <section className="card-premium">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="size-5 text-primary" />
          <h3 className="font-bold">Access Status</h3>
        </div>

        <button
          onClick={() => fetchAccessStatuses({ silent: true })}
          className="btn-ghost"
        >
          <RefreshCw className={`size-4 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="mt-4 rounded-lg bg-primary/5 px-4 py-3">
        <p className="text-sm font-medium text-primary">
          {grantedCount} of {Object.keys(CATEGORY_LABELS).length} categories
        </p>
      </div>

      <div className="mt-4 space-y-2">
        {Object.entries(CATEGORY_LABELS).map(([catId, label]) => {
          const hasAccess = accessStatuses[catId];
          const color = CATEGORY_COLORS[catId] || 'var(--primary)';

          return (
            <div
              key={catId}
              className={`flex items-center justify-between rounded-lg border p-3 transition ${
                hasAccess
                  ? 'border-success/30 bg-success-light/30'
                  : 'border-border bg-muted/30'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="size-3 rounded-full" style={{ backgroundColor: color }} />
                <span className="text-sm font-medium">
                  {label}
                </span>
              </div>

              {hasAccess ? (
                <span className="badge-success">
                  <ShieldCheck className="size-3" />
                  Granted
                </span>
              ) : (
                <span className="badge-warning">
                  <Lock className="size-3" />
                  Locked
                </span>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

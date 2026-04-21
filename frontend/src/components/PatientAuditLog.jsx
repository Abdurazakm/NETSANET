import { useCallback, useEffect, useState } from 'react';
import { Eye, RefreshCw, Shield, ShieldCheck, ShieldOff } from 'lucide-react';
import { CATEGORY_COLORS, CATEGORY_LABELS } from '../utils/records';

function normalizeEntry(entry) {
  return {
    accessor: entry.accessor,
    category: Number(entry.category),
    timestamp: Number(entry.timestamp),
    action: entry.action,
  };
}

function AuditSkeleton() {
  return (
    <div className="card-flat animate-pulse p-4">
      <div className="h-4 w-28 rounded bg-muted" />
      <div className="mt-3 h-4 w-40 rounded bg-muted" />
    </div>
  );
}

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

function getActionMeta(action) {
  const normalizedAction = action?.toUpperCase() || '';

  if (normalizedAction.includes('GRANTED')) {
    return {
      label: 'Granted',
      className: 'badge-success',
      Icon: ShieldCheck,
      description: 'Access granted to provider',
    };
  }

  if (normalizedAction.includes('REVOKED')) {
    return {
      label: 'Revoked',
      className: 'badge-destructive',
      Icon: ShieldOff,
      description: 'Access revoked',
    };
  }

  if (normalizedAction.includes('USED') || normalizedAction.includes('VIEW')) {
    return {
      label: 'Viewed',
      className: 'badge-info',
      Icon: Eye,
      description: 'Records viewed by provider',
    };
  }

  return {
    label: 'Audit',
    className: 'badge-primary',
    Icon: Shield,
    description: 'Access event recorded',
  };
}

export default function PatientAuditLog({ contract, address }) {
  const [auditLog, setAuditLog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchAuditLog = useCallback(async ({ silent = false } = {}) => {
    try {
      setError('');

      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const data = await contract.getMyAuditLog();
      setAuditLog(
        data
          .map(normalizeEntry)
          .sort((left, right) => right.timestamp - left.timestamp)
      );
    } catch (fetchError) {
      console.error('Failed to fetch audit log:', fetchError);
      setError('Unable to load audit log.');
    } finally {
      if (silent) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  }, [contract]);

  useEffect(() => {
    if (contract && address) {
      const timeoutId = window.setTimeout(() => {
        void fetchAuditLog();
      }, 0);

      return () => window.clearTimeout(timeoutId);
    }

    return undefined;
  }, [address, contract, fetchAuditLog]);

  const recentEntries = auditLog.slice(0, 8);

  return (
    <section className="card-premium">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Shield className="size-4 text-primary" />
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Activity Log
            </span>
          </div>
          <h3 className="mt-2 text-lg font-bold">Access History</h3>
        </div>

        <button
          onClick={() => fetchAuditLog({ silent: true })}
          className="btn-ghost"
        >
          <RefreshCw className={`size-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="mt-4 space-y-3">
        {loading ? (
          <>
            <AuditSkeleton />
            <AuditSkeleton />
            <AuditSkeleton />
          </>
        ) : error ? (
          <div className="card-flat p-6 text-center border-destructive/30 bg-destructive/5">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        ) : recentEntries.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-6 text-center">
            <Shield className="mx-auto size-8 text-muted-foreground" />
            <p className="mt-3 font-medium">No activity yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Grant access to see history here
            </p>
          </div>
        ) : (
          recentEntries.map((entry, index) => {
            const meta = getActionMeta(entry.action);
            const ActionIcon = meta.Icon;

            return (
              <article
                key={`${entry.accessor}-${entry.timestamp}-${index}`}
                className="flex items-start gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-muted/30"
              >
                <div className="flex size-8 items-center justify-center rounded-lg bg-muted">
                  <ActionIcon className="size-4 text-muted-foreground" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={meta.className}>{meta.label}</span>
                    <span
                      className="size-2 rounded-full"
                      style={{ backgroundColor: CATEGORY_COLORS[entry.category] || 'var(--primary)' }}
                    />
                    <span className="text-sm font-medium">
                      {CATEGORY_LABELS[entry.category]}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {meta.description} • {shortenAddress(entry.accessor)}
                  </p>
                </div>

                <span className="text-xs text-muted-foreground">
                  {formatDateTime(entry.timestamp)}
                </span>
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}
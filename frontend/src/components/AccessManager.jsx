import { useCallback, useEffect, useMemo, useState } from 'react';
import { ethers } from 'ethers';
import {
  AlertCircle,
  Clock3,
  Plus,
  RefreshCw,
  ShieldCheck,
  ShieldOff,
} from 'lucide-react';
import { toast } from 'sonner';
import { CATEGORY_COLORS, CATEGORY_LABELS } from '../utils/records';
import { Button } from './ui/button';

const DEFAULT_CATEGORY = '0';
const DEFAULT_DURATION = '24';
const MAX_DURATION_HOURS = 168;

function normalizeGrant(grant) {
  return {
    doctor: grant.doctor,
    category: Number(grant.category),
    grantedAt: Number(grant.grantedAt),
    expiresAt: Number(grant.expiresAt),
    revoked: Boolean(grant.revoked),
  };
}

function getGrantKey(doctor, category) {
  return `${doctor.toLowerCase()}-${category}`;
}

function sortGrants(left, right) {
  const statusOrder = {
    active: 0,
    expired: 1,
    revoked: 2,
  };

  const leftStatus = getGrantStatus(left).kind;
  const rightStatus = getGrantStatus(right).kind;

  if (statusOrder[leftStatus] !== statusOrder[rightStatus]) {
    return statusOrder[leftStatus] - statusOrder[rightStatus];
  }

  return right.expiresAt - left.expiresAt;
}

function getGrantStatus(grant) {
  const now = Math.floor(Date.now() / 1000);

  if (grant.revoked) {
    return {
      kind: 'revoked',
      label: 'Revoked',
      className: 'border-destructive/30 bg-destructive/5 text-destructive',
      description: 'Patient manually revoked this category share.',
    };
  }

  if (now >= grant.expiresAt) {
    return {
      kind: 'expired',
      label: 'Expired',
      className: 'border-warning/30 bg-warning/5 text-warning',
      description: `Ended ${formatDateTime(grant.expiresAt)}.`,
    };
  }

  return {
    kind: 'active',
    label: 'Active',
    className: 'border-success/30 bg-success/5 text-success',
    description: `Live until ${formatDateTime(grant.expiresAt)}.`,
  };
}

function formatDateTime(timestamp) {
  if (!timestamp) {
    return 'Unknown time';
  }

  return new Date(timestamp * 1000).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function shortenAddress(value) {
  if (!value || value.length < 12) {
    return value || '';
  }

  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function extractErrorMessage(error) {
  return [
    error?.shortMessage,
    error?.reason,
    error?.info?.error?.message,
    error?.message,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function getGrantFormError(patientAddress, doctorAddress, duration) {
  const trimmedDoctor = doctorAddress.trim();

  if (!trimmedDoctor) {
    return 'Enter the doctor wallet address before granting access.';
  }

  if (!ethers.isAddress(trimmedDoctor)) {
    return 'Enter a valid doctor wallet address.';
  }

  if (trimmedDoctor.toLowerCase() === patientAddress?.toLowerCase()) {
    return 'You cannot grant access to the patient wallet itself.';
  }

  const numericDuration = Number(duration);

  if (!Number.isInteger(numericDuration) || numericDuration < 1) {
    return 'Access duration must be at least 1 hour.';
  }

  if (numericDuration > MAX_DURATION_HOURS) {
    return 'Access duration cannot exceed 168 hours (7 days).';
  }

  return '';
}

function getGrantErrorMessage(error) {
  const message = extractErrorMessage(error);

  if (!message) {
    return 'Unable to update access right now. Please retry.';
  }

  if (message.includes('invalid doctor address')) {
    return 'The contract rejected the doctor wallet address.';
  }

  if (message.includes('cannot grant access to yourself')) {
    return 'Patient wallet cannot grant access to itself.';
  }

  if (message.includes('duration must be > 0')) {
    return 'Access duration must be greater than zero.';
  }

  if (message.includes('duration cannot exceed 7 days')) {
    return 'Access duration must stay within the 7 day demo limit.';
  }

  if (message.includes('already revoked')) {
    return 'This access grant is already revoked.';
  }

  if (message.includes('already expired')) {
    return 'This access grant has already expired.';
  }

  if (message.includes('no grant exists')) {
    return 'There is no matching access grant to revoke.';
  }

  if (message.includes('user rejected') || message.includes('action_rejected')) {
    return 'Transaction was rejected in the wallet.';
  }

  return 'Access update failed. Check the wallet prompt, network, and contract state, then retry.';
}

function upsertGrant(currentGrants, nextGrant) {
  const nextKey = getGrantKey(nextGrant.doctor, nextGrant.category);
  const existingIndex = currentGrants.findIndex(
    (grant) => getGrantKey(grant.doctor, grant.category) === nextKey
  );

  if (existingIndex === -1) {
    return [...currentGrants, nextGrant].sort(sortGrants);
  }

  return currentGrants
    .map((grant, index) => (index === existingIndex ? { ...grant, ...nextGrant } : grant))
    .sort(sortGrants);
}

function GrantSkeleton() {
  return (
    <div className="rounded-2xl border border-[#e3eaff] bg-[#f8fbff] p-4 animate-pulse">
      <div className="h-4 w-32 rounded bg-[#dbe5ff]" />
      <div className="mt-3 h-3 w-48 rounded bg-[#ebf1ff]" />
      <div className="mt-4 h-10 rounded-xl bg-white" />
    </div>
  );
}

export default function AccessManager({ contract, address }) {
  const [grants, setGrants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const [showGrantForm, setShowGrantForm] = useState(false);
  const [newDocAddress, setNewDocAddress] = useState('');
  const [newCat, setNewCat] = useState(DEFAULT_CATEGORY);
  const [newDuration, setNewDuration] = useState(DEFAULT_DURATION);
  const [formError, setFormError] = useState('');
  const [granting, setGranting] = useState(false);
  const [revokingKey, setRevokingKey] = useState('');

  const fetchGrants = useCallback(async ({ silent = false } = {}) => {
    try {
      setError('');

      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const data = await contract.getMyAccessGrants();
      setGrants(data.map(normalizeGrant).sort(sortGrants));
    } catch (fetchError) {
      console.error('Failed to fetch access grants:', fetchError);
      setError('Unable to load access grants right now. Refresh to try again.');
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
        void fetchGrants();
      }, 0);

      return () => window.clearTimeout(timeoutId);
    }

    return undefined;
  }, [address, contract, fetchGrants]);

  const summary = useMemo(
    () =>
      grants.reduce(
        (counts, grant) => {
          const status = getGrantStatus(grant).kind;
          counts[status] += 1;
          return counts;
        },
        { active: 0, expired: 0, revoked: 0 }
      ),
    [grants]
  );

  const handleGrant = async (event) => {
    event.preventDefault();
    setFormError('');

    const validationError = getGrantFormError(address, newDocAddress, newDuration);
    if (validationError) {
      setFormError(validationError);
      toast.error(validationError);
      return;
    }

    try {
      setGranting(true);
      const doctorAddress = ethers.getAddress(newDocAddress.trim());
      const categoryNumber = Number(newCat);
      const durationHours = Number(newDuration);

      const tx = await contract.grantAccess(doctorAddress, categoryNumber, durationHours);
      const confirmation = tx.wait();

      toast.promise(confirmation, {
        loading: 'Granting doctor access...',
        success: 'Doctor access updated.',
        error: () => 'Access update failed before confirmation.',
      });

      await confirmation;

      const now = Math.floor(Date.now() / 1000);
      setGrants((currentGrants) =>
        upsertGrant(currentGrants, {
          doctor: doctorAddress,
          category: categoryNumber,
          grantedAt: now,
          expiresAt: now + durationHours * 3600,
          revoked: false,
        })
      );

      setNewDocAddress('');
      setNewCat(DEFAULT_CATEGORY);
      setNewDuration(DEFAULT_DURATION);
      setShowGrantForm(false);
      void fetchGrants({ silent: true });
    } catch (grantError) {
      console.error('Failed to grant access:', grantError);
      const errorMessage = getGrantErrorMessage(grantError);
      setFormError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setGranting(false);
    }
  };

  const handleRevoke = async (doctor, category) => {
    const revokeKey = getGrantKey(doctor, category);

    try {
      setRevokingKey(revokeKey);

      const tx = await contract.revokeAccess(doctor, category);
      const confirmation = tx.wait();

      toast.promise(confirmation, {
        loading: 'Revoking access...',
        success: 'Access revoked successfully.',
        error: () => 'Access revoke failed before confirmation.',
      });

      await confirmation;

      setGrants((currentGrants) =>
        currentGrants
          .map((grant) =>
            getGrantKey(grant.doctor, grant.category) === revokeKey
              ? { ...grant, revoked: true }
              : grant
          )
          .sort(sortGrants)
      );

      void fetchGrants({ silent: true });
    } catch (revokeError) {
      console.error('Failed to revoke access:', revokeError);
      toast.error(getGrantErrorMessage(revokeError));
    } finally {
      setRevokingKey('');
    }
  };

  return (
    <section className="card-premium">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-primary" />
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Access Control
            </span>
          </div>
          <h3 className="mt-2 text-lg font-bold">
            Doctor Access
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage who can view your medical records
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchGrants({ silent: true })}
          >
            <RefreshCw className={`size-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setFormError('');
              setShowGrantForm((currentValue) => !currentValue);
            }}
          >
            <Plus className="size-4" />
            {showGrantForm ? 'Close Form' : 'Grant Access'}
          </Button>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <div className="rounded-xl border border-success/30 bg-success/5 px-4 py-3 text-sm text-success">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em]">Active</p>
          <p className="mt-1 text-lg font-semibold">{summary.active}</p>
        </div>
        <div className="rounded-xl border border-warning/30 bg-warning/5 px-4 py-3 text-sm text-warning">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em]">Expired</p>
          <p className="mt-1 text-lg font-semibold">{summary.expired}</p>
        </div>
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em]">Revoked</p>
          <p className="mt-1 text-lg font-semibold">{summary.revoked}</p>
        </div>
      </div>

      {showGrantForm && (
        <form
          onSubmit={handleGrant}
          className="mt-6 rounded-2xl border border-accent bg-muted p-5"
        >
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(170px,0.8fr)_120px]">
            <div>
              <label className="block text-sm font-medium text-foreground">
                Doctor Wallet
              </label>
              <input
                type="text"
                required
                value={newDocAddress}
                onChange={(event) => setNewDocAddress(event.target.value)}
                placeholder="0x..."
                disabled={granting}
                className="mt-2 w-full rounded-xl border border-input bg-white px-4 py-2.5 font-mono text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground">
                Category
              </label>
              <select
                value={newCat}
                onChange={(event) => setNewCat(event.target.value)}
                disabled={granting}
                className="mt-2 w-full rounded-xl border border-input bg-white px-4 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              >
                {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground">
                Hours
              </label>
              <input
                type="number"
                required
                min="1"
                max={MAX_DURATION_HOURS}
                value={newDuration}
                onChange={(event) => setNewDuration(event.target.value)}
                disabled={granting}
                className="mt-2 w-full rounded-xl border border-input bg-white px-4 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          {formError ? (
            <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                <p>{formError}</p>
              </div>
            </div>
          ) : null}

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm leading-6 text-muted-foreground">
              Demo note: grants can last from 1 hour up to 7 days. Reusing the same doctor and category updates the existing grant.
            </p>

            <Button
              type="submit"
              size="lg"
              className="min-w-[180px]"
              disabled={granting}
            >
              {granting ? 'Granting Access...' : 'Authorize Doctor'}
            </Button>
          </div>
        </form>
      )}

      {error ? (
        <div className="mt-5 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <p>{error}</p>
          </div>
        </div>
      ) : null}

      <div className="mt-6 space-y-3">
        {loading ? (
          <>
            <GrantSkeleton />
            <GrantSkeleton />
          </>
        ) : grants.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-accent bg-muted/50 p-8 text-center">
            <ShieldCheck className="mx-auto size-10 text-primary" />
            <p className="mt-4 text-lg font-semibold">
              No doctors currently have access
            </p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Add a doctor wallet, choose a category, and grant timed access for the live demo.
            </p>
          </div>
        ) : (
          grants.map((grant) => {
            const status = getGrantStatus(grant);
            const isRevoking = revokingKey === getGrantKey(grant.doctor, grant.category);

            return (
              <div
                key={getGrantKey(grant.doctor, grant.category)}
                className="rounded-2xl border border-accent bg-muted/30 p-5 shadow-sm"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className="size-3 rounded-full"
                        style={{ backgroundColor: CATEGORY_COLORS[grant.category] || 'var(--primary)' }}
                      />
                      <span className="font-semibold">
                        {CATEGORY_LABELS[grant.category]}
                      </span>
                      <span
                        className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] ${status.className}`}
                      >
                        {status.label}
                      </span>
                    </div>

                    <div className="mt-3 rounded-xl border border-input bg-card p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                        Doctor Wallet
                      </p>
                      <p className="mt-2 break-all font-mono text-sm text-foreground">
                        {grant.doctor}
                      </p>
                    </div>

                    <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                      <div className="rounded-xl border border-input bg-card p-4">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                          Granted
                        </p>
                        <p className="mt-2">{formatDateTime(grant.grantedAt)}</p>
                      </div>
                      <div className="rounded-xl border border-input bg-card p-4">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                          Status Detail
                        </p>
                        <p className="mt-2">{status.description}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex min-w-[180px] flex-col gap-3">
                    <div className="rounded-xl border border-input bg-card p-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2 text-foreground">
                        {status.kind === 'revoked' ? (
                          <ShieldOff className="size-4 text-destructive" />
                        ) : (
                          <Clock3 className="size-4 text-primary" />
                        )}
                        <span className="font-medium">
                          {status.kind === 'active'
                            ? 'Visible to doctor now'
                            : status.kind === 'expired'
                              ? 'Grant ended automatically'
                              : 'Grant removed by patient'}
                        </span>
                      </div>
                      <p className="mt-2 font-mono text-xs text-muted-foreground">
                        {shortenAddress(grant.doctor)}
                      </p>
                    </div>

                    {status.kind === 'active' ? (
                      <Button
                        variant="destructive"
                        size="lg"
                        onClick={() => handleRevoke(grant.doctor, grant.category)}
                        disabled={isRevoking}
                        className="w-full"
                      >
                        {isRevoking ? 'Revoking...' : 'Revoke Access'}
                      </Button>
                    ) : (
                      <div className="rounded-xl border border-accent bg-muted px-4 py-3 text-center text-sm text-muted-foreground">
                        {status.kind === 'expired'
                          ? 'Grant can be renewed by creating a new time window.'
                          : 'Create a new grant any time to restore access.'}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}

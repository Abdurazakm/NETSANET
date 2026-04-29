import { useEffect, useState } from "react";
import { CATEGORY_COLORS, CATEGORY_LABELS } from "../utils/records";

function truncateAddress(address) {
  if (!address) {
    return "";
  }

  return `${address.substring(0, 8)}...${address.substring(38)}`;
}

function formatDate(timestampSeconds) {
  if (!timestampSeconds) {
    return "Just now";
  }

  return new Date(Number(timestampSeconds) * 1000).toLocaleString();
}

function getErrorMessage(error, fallbackMessage) {
  return error?.reason || error?.shortMessage || error?.message || fallbackMessage;
}

function getGrantStatus(grant) {
  if (grant.revoked) {
    return {
      text: "Revoked",
      helperText: "Access was revoked by the patient.",
      chipClassName:
        "border border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-300",
    };
  }

  const now = Math.floor(Date.now() / 1000);

  if (now >= Number(grant.expiresAt)) {
    return {
      text: "Expired",
      helperText: `Expired on ${formatDate(grant.expiresAt)}`,
      chipClassName:
        "border border-slate-300/70 bg-slate-200/70 text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200",
    };
  }

  return {
    text: "Active",
    helperText: `Valid until ${formatDate(grant.expiresAt)}`,
    chipClassName:
      "border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  };
}

export default function AccessManager({ contract, address }) {
  const [grants, setGrants] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [requestActionKey, setRequestActionKey] = useState(null);
  const [showGrantForm, setShowGrantForm] = useState(false);
  const [newDocAddress, setNewDocAddress] = useState("");
  const [newCat, setNewCat] = useState("0");
  const [newDuration, setNewDuration] = useState("24");
  const [granting, setGranting] = useState(false);

  const fetchAccessData = async () => {
    try {
      setLoading(true);

      const [grantData, pendingRequestData] = await Promise.all([
        contract.getMyAccessGrants(),
        contract.getMyPendingAccessRequests(),
      ]);

      setGrants(grantData);
      setPendingRequests(pendingRequestData);
    } catch (error) {
      console.error("Failed to load access data:", error);
    } finally {
      setLoading(false);
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

        const [grantData, pendingRequestData] = await Promise.all([
          contract.getMyAccessGrants(),
          contract.getMyPendingAccessRequests(),
        ]);

        if (cancelled) {
          return;
        }

        setGrants(grantData);
        setPendingRequests(pendingRequestData);
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to load access data:", error);
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

  const handleRevoke = async (doctor, category) => {
    try {
      const tx = await contract.revokeAccess(doctor, category);
      await tx.wait();
      await fetchAccessData();
    } catch (error) {
      console.error("Failed to revoke access:", error);
      alert(
        getErrorMessage(
          error,
          "Failed to revoke access. Ensure it is not already expired or revoked.",
        ),
      );
    }
  };

  const handleGrant = async (event) => {
    event.preventDefault();

    if (!newDocAddress.trim()) {
      return;
    }

    try {
      setGranting(true);

      const tx = await contract.grantAccess(
        newDocAddress.trim(),
        parseInt(newCat, 10),
        parseInt(newDuration, 10),
      );
      await tx.wait();

      setNewDocAddress("");
      setNewCat("0");
      setNewDuration("24");
      setShowGrantForm(false);
      await fetchAccessData();
    } catch (error) {
      console.error("Failed to grant access:", error);
      alert(
        getErrorMessage(
          error,
          "Failed to grant access. Please check the address and try again.",
        ),
      );
    } finally {
      setGranting(false);
    }
  };

  const handleRequestResponse = async (doctor, category, approve) => {
    const actionKey = `${doctor}-${category}-${approve ? "approve" : "decline"}`;

    try {
      setRequestActionKey(actionKey);
      const tx = await contract.respondToAccessRequest(doctor, category, approve);
      await tx.wait();
      await fetchAccessData();
    } catch (error) {
      console.error("Failed to respond to request:", error);
      alert(
        getErrorMessage(
          error,
          "Failed to respond to the doctor's request. Please try again.",
        ),
      );
    } finally {
      setRequestActionKey(null);
    }
  };

  if (loading) {
    return (
      <div className="glass-panel p-6 text-sm text-slate-500 dark:text-slate-300">
        Loading access grants...
      </div>
    );
  }

  return (
    <div className="glass-panel px-6 py-7 sm:px-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="section-kicker">Permission control</p>
          <h3 className="mt-3 font-display text-2xl font-bold text-slate-900 dark:text-slate-50">
            Who has access?
          </h3>
          <p className="panel-copy mt-2 max-w-2xl">
            Approve incoming requests or create a manual grant when you already
            know the clinic that should see a category.
          </p>
        </div>

        <button
          onClick={() => setShowGrantForm((current) => !current)}
          className="btn-ghost self-start px-4 py-2.5 text-sm"
        >
          {showGrantForm ? "Close Grant Form" : "Grant Access"}
        </button>
      </div>

      {showGrantForm && (
        <form
          onSubmit={handleGrant}
          className="glass-inset mt-5 space-y-4 rounded-[24px] p-5"
        >
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
              Doctor wallet address
            </label>
            <input
              type="text"
              required
              value={newDocAddress}
              onChange={(event) => setNewDocAddress(event.target.value)}
              placeholder="0x..."
              className="font-mono"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_120px]">
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
                Category
              </label>
              <select
                value={newCat}
                onChange={(event) => setNewCat(event.target.value)}
              >
                {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
                Hours
              </label>
              <input
                type="number"
                required
                min="1"
                max="168"
                value={newDuration}
                onChange={(event) => setNewDuration(event.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={granting || !newDocAddress}
            className="btn-primary w-full disabled:opacity-50"
          >
            {granting ? "Broadcasting Tx..." : "Authorize Doctor"}
          </button>
        </form>
      )}

      <div className="mt-8 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="section-kicker">Incoming requests</p>
            <p className="panel-muted mt-2">
              Doctors request category-level access here before they can review
              records.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="surface-chip">{pendingRequests.length} open</span>
            <button onClick={fetchAccessData} className="btn-ghost px-4 py-2 text-xs">
              Refresh
            </button>
          </div>
        </div>

        {pendingRequests.length === 0 ? (
          <div className="empty-state">
            <p className="text-base font-semibold text-slate-900 dark:text-slate-50">
              No pending doctor requests right now.
            </p>
            <p className="panel-muted mt-2">
              When a clinic asks for a category, it will show up here with the
              requested duration.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingRequests.map((request, index) => {
              const requestKey = `${request.doctor}-${request.category}-${index}`;
              const color = CATEGORY_COLORS[request.category] || "#94a3b8";
              const isApproving =
                requestActionKey ===
                `${request.doctor}-${request.category}-approve`;
              const isDeclining =
                requestActionKey ===
                `${request.doctor}-${request.category}-decline`;

              return (
                <div
                  key={requestKey}
                  className="glass-inset rounded-[24px] p-4 sm:p-5"
                >
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                      <span
                        className="inline-flex rounded-full px-3 py-1 text-xs font-semibold text-slate-900 dark:text-slate-50"
                        style={{
                          backgroundColor: `${color}1f`,
                          border: `1px solid ${color}44`,
                        }}
                      >
                        {CATEGORY_LABELS[request.category]}
                      </span>
                      <span className="surface-chip">Pending request</span>
                    </div>

                    <div className="space-y-3">
                      <div className="mx-auto w-full max-w-md rounded-[20px] border border-slate-300/20 bg-white/5 px-4 py-3 dark:border-white/10 dark:bg-white/[0.03]">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
                          Doctor Wallet
                        </p>
                        <p
                          className="mt-2 break-all font-mono text-xs leading-6 text-slate-700 dark:text-slate-200"
                          title={request.doctor}
                        >
                          {request.doctor}
                        </p>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-[20px] border border-slate-300/20 bg-white/5 px-4 py-3 dark:border-white/10 dark:bg-white/[0.03]">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
                            Requested Duration
                          </p>
                          <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-50">
                            {Number(request.requestedDurationHours)} hours
                          </p>
                        </div>

                        <div className="rounded-[20px] border border-slate-300/20 bg-white/5 px-4 py-3 dark:border-white/10 dark:bg-white/[0.03]">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
                            Requested At
                          </p>
                          <p className="mt-2 break-words text-sm leading-6 text-slate-700 dark:text-slate-200">
                            {formatDate(request.requestedAt)}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-[20px] border border-sky-500/20 bg-sky-500/5 px-4 py-3 text-sm text-slate-700 dark:border-sky-400/20 dark:bg-sky-400/[0.05] dark:text-slate-200">
                      You are approving access only for{" "}
                      <span className="font-semibold text-slate-900 dark:text-slate-50">
                        {CATEGORY_LABELS[request.category]}
                      </span>
                      .
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row">
                      <button
                        onClick={() =>
                          handleRequestResponse(
                            request.doctor,
                            request.category,
                            true,
                          )
                        }
                        disabled={isApproving || isDeclining}
                        className="btn-primary w-full sm:flex-1 disabled:opacity-50"
                      >
                        {isApproving
                          ? "Approving..."
                          : `Accept ${Number(request.requestedDurationHours)}h`}
                      </button>
                      <button
                        onClick={() =>
                          handleRequestResponse(
                            request.doctor,
                            request.category,
                            false,
                          )
                        }
                        disabled={isApproving || isDeclining}
                        className="btn-danger w-full sm:flex-1 disabled:opacity-50"
                      >
                        {isDeclining ? "Declining..." : "Decline"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-8 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="section-kicker">Active and past grants</p>
            <p className="panel-muted mt-2">
              Every grant stays category-scoped, and you can revoke active ones
              at any time.
            </p>
          </div>
          <span className="surface-chip">{grants.length} total</span>
        </div>

        {grants.length === 0 ? (
          <div className="empty-state">
            <p className="text-base font-semibold text-slate-900 dark:text-slate-50">
              No one currently has access to your records.
            </p>
            <p className="panel-muted mt-2">
              Once you approve a request or manually authorize a clinic, the
              grant will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {grants.map((grant, index) => {
              const status = getGrantStatus(grant);
              const isActive = status.text === "Active";
              const categoryColor = CATEGORY_COLORS[grant.category] || "#94a3b8";

              return (
                <div
                  key={`${grant.doctor}-${grant.category}-${index}`}
                  className="glass-inset rounded-[24px] p-4 sm:p-5"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <span
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: categoryColor }}
                        />
                        <span className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                          {CATEGORY_LABELS[grant.category]}
                        </span>
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${status.chipClassName}`}
                        >
                          {status.text}
                        </span>
                      </div>

                      <p
                        className="font-mono text-xs text-slate-600 dark:text-slate-200"
                        title={grant.doctor}
                      >
                        Doctor: {truncateAddress(grant.doctor)}
                      </p>
                      <p className="panel-muted">{status.helperText}</p>
                    </div>

                    {isActive && (
                      <button
                        onClick={() => handleRevoke(grant.doctor, grant.category)}
                        className="btn-danger self-start px-4 py-2 text-xs"
                      >
                        Revoke Now
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

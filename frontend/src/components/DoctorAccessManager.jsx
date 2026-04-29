import { useEffect, useState } from "react";
import { CATEGORY_COLORS, CATEGORY_LABELS } from "../utils/records";

const REQUEST_STATUS = {
  NONE: 0,
  PENDING: 1,
  APPROVED: 2,
  DECLINED: 3,
};

function getErrorMessage(error, fallbackMessage) {
  return error?.reason || error?.shortMessage || error?.message || fallbackMessage;
}

function formatDate(timestampSeconds) {
  if (!timestampSeconds) {
    return "No timestamp";
  }

  return new Date(Number(timestampSeconds) * 1000).toLocaleString();
}

function getCategoryViewModel(categoryData) {
  if (!categoryData) {
    return {
      label: "Checking",
      badgeClassName:
        "border border-slate-300/70 bg-slate-200/70 text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200",
      helperText: "Checking whether this category is currently available.",
      cardClassName: "",
      canRequest: false,
      requestLabel: "Request Access",
    };
  }

  const now = Math.floor(Date.now() / 1000);
  const requestStatus = categoryData.requestExists
    ? Number(categoryData.request.status)
    : REQUEST_STATUS.NONE;

  if (categoryData.hasAccess) {
    return {
      label: "Granted",
      badgeClassName:
        "border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
      helperText: `Active until ${formatDate(categoryData.grant.expiresAt)}`,
      cardClassName:
        "border-emerald-500/20 bg-emerald-500/10 dark:bg-emerald-500/10",
      canRequest: false,
      requestLabel: "Request Access",
    };
  }

  if (requestStatus === REQUEST_STATUS.PENDING) {
    return {
      label: "Pending",
      badgeClassName:
        "border border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300",
      helperText: `Waiting for patient response since ${formatDate(
        categoryData.request.requestedAt,
      )}`,
      cardClassName:
        "border-sky-500/20 bg-sky-500/10 dark:bg-sky-500/10",
      canRequest: false,
      requestLabel: "Request Access",
    };
  }

  if (categoryData.grantExists && categoryData.grant.revoked) {
    return {
      label: "Revoked",
      badgeClassName:
        "border border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-300",
      helperText: "Access was revoked by the patient.",
      cardClassName:
        "border-rose-500/20 bg-rose-500/10 dark:bg-rose-500/10",
      canRequest: true,
      requestLabel: "Request Again",
    };
  }

  if (categoryData.grantExists && now >= Number(categoryData.grant.expiresAt)) {
    return {
      label: "Expired",
      badgeClassName:
        "border border-slate-300/70 bg-slate-200/70 text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200",
      helperText: `Previous access ended on ${formatDate(
        categoryData.grant.expiresAt,
      )}`,
      cardClassName: "",
      canRequest: true,
      requestLabel: "Request Again",
    };
  }

  if (requestStatus === REQUEST_STATUS.DECLINED) {
    return {
      label: "Declined",
      badgeClassName:
        "border border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-300",
      helperText: `Patient declined this request on ${formatDate(
        categoryData.request.respondedAt,
      )}`,
      cardClassName: "",
      canRequest: true,
      requestLabel: "Request Again",
    };
  }

  return {
    label: "Not Granted",
    badgeClassName:
      "border border-slate-300/70 bg-slate-200/70 text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200",
    helperText: "Request access to let the patient approve this category.",
    cardClassName: "",
    canRequest: true,
    requestLabel: "Request Access",
  };
}

export default function DoctorAccessManager({
  contract,
  doctorAddress,
  patientAddress,
}) {
  const [categoryStates, setCategoryStates] = useState({});
  const [loading, setLoading] = useState(true);
  const [panelError, setPanelError] = useState("");
  const [openRequestCategory, setOpenRequestCategory] = useState(null);
  const [requestDuration, setRequestDuration] = useState("24");
  const [submittingCategory, setSubmittingCategory] = useState(null);

  const fetchAccessStatuses = async () => {
    try {
      setLoading(true);
      setPanelError("");

      const entries = await Promise.all(
        Object.keys(CATEGORY_LABELS).map(async (catId) => {
          const [hasAccess, grantResult, requestResult] = await Promise.all([
            contract.hasActiveAccess(patientAddress, doctorAddress, catId),
            contract.getGrantDetails(patientAddress, doctorAddress, catId),
            contract.getAccessRequestDetails(patientAddress, doctorAddress, catId),
          ]);

          const [grant, grantExists] = grantResult;
          const [request, requestExists] = requestResult;

          return [
            catId,
            {
              hasAccess,
              grant,
              grantExists,
              request,
              requestExists,
            },
          ];
        }),
      );

      setCategoryStates(Object.fromEntries(entries));
    } catch (error) {
      console.error("Failed to fetch doctor access state:", error);
      setPanelError(
        getErrorMessage(
          error,
          "Failed to fetch category access for this patient session.",
        ),
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!contract || !patientAddress || !doctorAddress) {
      return undefined;
    }

    let cancelled = false;
    const timeoutId = window.setTimeout(async () => {
      try {
        setLoading(true);
        setPanelError("");

        const entries = await Promise.all(
          Object.keys(CATEGORY_LABELS).map(async (catId) => {
            const [hasAccess, grantResult, requestResult] = await Promise.all([
              contract.hasActiveAccess(patientAddress, doctorAddress, catId),
              contract.getGrantDetails(patientAddress, doctorAddress, catId),
              contract.getAccessRequestDetails(
                patientAddress,
                doctorAddress,
                catId,
              ),
            ]);

            const [grant, grantExists] = grantResult;
            const [request, requestExists] = requestResult;

            return [
              catId,
              {
                hasAccess,
                grant,
                grantExists,
                request,
                requestExists,
              },
            ];
          }),
        );

        if (cancelled) {
          return;
        }

        setCategoryStates(Object.fromEntries(entries));
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to fetch doctor access state:", error);
          setPanelError(
            getErrorMessage(
              error,
              "Failed to fetch category access for this patient session.",
            ),
          );
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
  }, [contract, patientAddress, doctorAddress]);

  const handleStartRequest = (catId, existingRequest) => {
    setOpenRequestCategory(catId);
    setRequestDuration(
      existingRequest?.requestedDurationHours
        ? String(Number(existingRequest.requestedDurationHours))
        : "24",
    );
    setPanelError("");
  };

  const handleSubmitRequest = async (event, catId) => {
    event.preventDefault();

    try {
      setSubmittingCategory(catId);
      setPanelError("");

      const tx = await contract.requestAccess(
        patientAddress,
        parseInt(catId, 10),
        parseInt(requestDuration, 10),
      );
      await tx.wait();

      setOpenRequestCategory(null);
      setRequestDuration("24");
      await fetchAccessStatuses();
    } catch (error) {
      console.error("Failed to submit access request:", error);
      setPanelError(
        getErrorMessage(
          error,
          "Failed to submit the access request. Please try again.",
        ),
      );
    } finally {
      setSubmittingCategory(null);
    }
  };

  if (loading) {
    return (
      <div className="glass-panel p-6 text-sm text-slate-500 dark:text-slate-300">
        Checking access permissions...
      </div>
    );
  }

  return (
    <div className="glass-panel px-6 py-7 sm:px-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="section-kicker">Category permissions</p>
          <h3 className="mt-3 font-display text-2xl font-bold text-slate-900 dark:text-slate-50">
            Category access
          </h3>
          <p className="panel-copy mt-2 max-w-2xl">
            Only approved categories can be opened. Request missing categories
            here and wait for the patient to approve or decline them.
          </p>
        </div>

        <button onClick={fetchAccessStatuses} className="btn-ghost self-start px-4 py-2 text-xs">
          Refresh
        </button>
      </div>

      {panelError && (
        <div className="mt-5 rounded-[20px] border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-500">
          {panelError}
        </div>
      )}

      <div className="mt-6 space-y-4">
        {Object.entries(CATEGORY_LABELS).map(([catId, label]) => {
          const color = CATEGORY_COLORS[catId] || "#94a3b8";
          const categoryData = categoryStates[catId];
          const viewModel = getCategoryViewModel(categoryData);
          const isFormOpen = openRequestCategory === catId;
          const isSubmitting = submittingCategory === catId;

          return (
            <div
              key={catId}
              className={`glass-inset rounded-[24px] p-4 sm:p-5 ${viewModel.cardClassName}`}
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                    <span className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                      {label}
                    </span>
                  </div>

                  <p className="panel-muted">{viewModel.helperText}</p>
                </div>

                <div className="flex flex-col items-start gap-3 lg:items-end">
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${viewModel.badgeClassName}`}
                  >
                    {viewModel.label}
                  </span>

                  {viewModel.canRequest && !isFormOpen && (
                    <button
                      onClick={() =>
                        handleStartRequest(catId, categoryData?.request)
                      }
                      className="btn-ghost px-4 py-2 text-xs"
                    >
                      {viewModel.requestLabel}
                    </button>
                  )}
                </div>
              </div>

              {viewModel.canRequest && isFormOpen && (
                <form
                  onSubmit={(event) => handleSubmitRequest(event, catId)}
                  className="mt-5 border-t border-slate-300/60 pt-5 dark:border-white/10"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                    <div className="sm:w-32">
                      <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
                        Hours
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="168"
                        required
                        value={requestDuration}
                        onChange={(event) => setRequestDuration(event.target.value)}
                      />
                    </div>

                    <p className="panel-muted pb-1 text-sm">
                      The patient will receive this request with your selected
                      duration.
                    </p>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="btn-secondary px-4 py-2 text-sm disabled:opacity-50"
                    >
                      {isSubmitting ? "Sending..." : "Send Request"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setOpenRequestCategory(null);
                        setRequestDuration("24");
                      }}
                      disabled={isSubmitting}
                      className="btn-ghost px-4 py-2 text-sm disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

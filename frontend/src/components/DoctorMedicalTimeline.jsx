import { useState, useEffect } from "react";
import {
  retrieveRecords,
  CATEGORY_LABELS,
  CATEGORY_COLORS,
  buildRecordDisplayFields,
  extractRecordAuthor,
  formatRecordFieldValue,
  formatRecordAuthor,
} from "../utils/records";
import { importKeyFromBase64 } from "../utils/encryption";

function formatRecordDate(timestamp) {
  return new Date(timestamp).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function truncateAddress(address) {
  return `${address.substring(0, 6)}...${address.substring(38)}`;
}

export default function DoctorMedicalTimeline({
  contract,
  doctorAddress,
  patientAddress,
  base64Key,
}) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cryptoKey, setCryptoKey] = useState(null);

  useEffect(() => {
    async function prepareKey() {
      if (base64Key) {
        try {
          setError("");
          const key = await importKeyFromBase64(base64Key);
          setCryptoKey(key);
        } catch (err) {
          console.error("Failed to import key:", err);
          setError("Failed to import the patient's cryptographic key.");
        }
      } else {
        setError("Missing patient cryptographic key. Records cannot be decrypted.");
      }
    }

    prepareKey();
  }, [base64Key]);

  useEffect(() => {
    if (!contract || !patientAddress || !doctorAddress || !cryptoKey) {
      return undefined;
    }

    let cancelled = false;
    const timeoutId = window.setTimeout(async () => {
      try {
        setLoading(true);
        setError("");

        let allChainRecords = [];

        for (const catId of Object.keys(CATEGORY_LABELS)) {
          const hasAccess = await contract.hasActiveAccess(
            patientAddress,
            doctorAddress,
            catId,
          );

          if (hasAccess) {
            try {
              const categoryRecords =
                await contract.getRecordsByCategory.staticCall(
                  patientAddress,
                  catId,
                );
              const tx = await contract.getRecordsByCategory(
                patientAddress,
                catId,
              );
              await tx.wait();
              allChainRecords = allChainRecords.concat(Array.from(categoryRecords));
            } catch (fetchError) {
              console.error(`Failed to fetch category ${catId}:`, fetchError);
            }
          }
        }

        if (cancelled) {
          return;
        }

        if (allChainRecords.length === 0) {
          setRecords([]);
          return;
        }

        const cids = allChainRecords.map((record) => record.ipfsCID);
        const decryptedResults = await retrieveRecords(cryptoKey, cids);

        if (cancelled) {
          return;
        }

        const combined = allChainRecords.map((chainRecord, index) => ({
          timestamp: Number(chainRecord.timestamp) * 1000,
          addedByClinic: chainRecord.addedByClinic,
          category: Number(chainRecord.category),
          recordType: chainRecord.recordType,
          payload: decryptedResults[index].success
            ? decryptedResults[index].data
            : null,
          error: !decryptedResults[index].success
            ? decryptedResults[index].error
            : null,
        }));

        combined.sort((a, b) => b.timestamp - a.timestamp);
        setRecords(combined);
      } catch (err) {
        if (!cancelled) {
          console.error(err);
          setError("Failed to fetch records from the blockchain.");
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
  }, [contract, patientAddress, doctorAddress, cryptoKey]);

  if (loading) {
    return (
      <div className="glass-panel px-6 py-10 sm:px-7">
        <div className="mx-auto flex max-w-md flex-col items-center text-center">
          <div className="relative flex h-16 w-16 items-center justify-center">
            <span className="absolute inset-0 rounded-full bg-sky-500/15 blur-md dark:bg-sky-400/20" />
            <span className="absolute h-16 w-16 animate-pulse rounded-full border border-sky-500/30 dark:border-sky-400/30" />
            <span className="h-12 w-12 animate-spin rounded-full border-4 border-sky-500/20 border-t-sky-500 dark:border-sky-400/20 dark:border-t-sky-300" />
          </div>

          <p className="mt-6 text-sm font-semibold uppercase tracking-[0.28em] text-sky-700 dark:text-sky-300">
            Authorized sync
          </p>
          <h4 className="mt-3 font-display text-xl font-bold text-slate-900 dark:text-slate-50">
            Fetching patient history...
          </h4>
          <p className="panel-copy mt-3 animate-pulse">
            Checking granted categories, reading record pointers, and decrypting
            any history this clinic session is allowed to see.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-panel px-6 py-7 sm:px-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="section-kicker">Authorized timeline</p>
          <h3 className="mt-3 font-display text-2xl font-bold text-slate-900 dark:text-slate-50">
            Patient timeline
          </h3>
          <p className="panel-copy mt-2">
            This view only includes categories the patient approved for this
            clinic session.
          </p>
        </div>
        <span className="surface-chip">
          {records.length} {records.length === 1 ? "record" : "records"}
        </span>
      </div>

      {error && (
        <div className="mt-5 rounded-[20px] border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-500">
          {error}
          {!base64Key && " You will not be able to read the patient's records."}
        </div>
      )}

      {records.length === 0 && !loading && !error ? (
        <div className="empty-state mt-6">
          <p className="text-base font-semibold text-slate-900 dark:text-slate-50">
            No records available.
          </p>
          <p className="panel-muted mt-2">
            The patient either has no records, or your clinic has not been
            granted access to the categories that contain them.
          </p>
        </div>
      ) : (
        <div className="timeline-track mt-6 space-y-6 pl-7">
          {records.map((record, index) => {
            const details = buildRecordDisplayFields(
              record.category,
              record.payload?.data,
            );
            const author = extractRecordAuthor(record.payload);
            const fallbackLabel =
              record.addedByClinic === doctorAddress
                ? "You"
                : truncateAddress(record.addedByClinic);
            const authorLabel = formatRecordAuthor(author, fallbackLabel);
            const primaryDetails = details.filter(
              (detail) => detail.key !== "notes",
            );
            const noteDetail = details.find((detail) => detail.key === "notes");

            return (
              <div key={index} className="relative pl-5">
                <span
                  className="absolute left-[-0.17rem] top-6 h-4 w-4 rounded-full border-4 border-white dark:border-slate-950"
                  style={{
                    backgroundColor: CATEGORY_COLORS[record.category] || "#fff",
                  }}
                />

                <div className="timeline-card">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <span
                        className="inline-flex rounded-full px-3 py-1 text-xs font-semibold text-white"
                        style={{
                          backgroundColor:
                            CATEGORY_COLORS[record.category] || "#94a3b8",
                        }}
                      >
                        {CATEGORY_LABELS[record.category]}
                      </span>
                      <h4 className="mt-4 font-display text-xl font-bold text-slate-900 dark:text-slate-50">
                        {record.recordType}
                      </h4>
                      <p
                        className="mt-2 text-xs text-slate-500 dark:text-slate-300"
                        title={record.addedByClinic}
                      >
                        Added by {authorLabel}
                      </p>
                    </div>

                    <span className="surface-chip">
                      {formatRecordDate(record.timestamp)}
                    </span>
                  </div>

                  {record.payload ? (
                    <div className="timeline-payload mt-5 space-y-3">
                      {primaryDetails.map((detail) => (
                        <div key={detail.label}>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
                            {detail.label}
                          </p>
                          <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-100">
                            {formatRecordFieldValue(detail.value)}
                          </p>
                        </div>
                      ))}

                      {noteDetail && (
                        <div className="border-t border-slate-300/70 pt-3 dark:border-white/10">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
                            {noteDetail.label}
                          </p>
                          <p className="mt-2 text-sm italic text-slate-600 dark:text-slate-200">
                            "{formatRecordFieldValue(noteDetail.value)}"
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="mt-5 rounded-[18px] border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-500">
                      Decryption failed or the IPFS CID is unavailable. (
                      {record.error})
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

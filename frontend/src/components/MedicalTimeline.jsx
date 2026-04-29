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

export default function MedicalTimeline({ contract, encryptionKey }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!contract || !encryptionKey) {
      return undefined;
    }

    let cancelled = false;
    const timeoutId = window.setTimeout(async () => {
      try {
        setLoading(true);
        setError("");

        const chainRecords = await contract.getMyRecords();

        if (chainRecords.length === 0) {
          if (!cancelled) {
            setRecords([]);
          }
          return;
        }

        const cids = chainRecords.map((record) => record.ipfsCID);
        const decryptedResults = await retrieveRecords(encryptionKey, cids);

        if (cancelled) {
          return;
        }

        const combined = chainRecords.map((chainRecord, index) => ({
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
          setError("Failed to load records from the blockchain.");
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
  }, [contract, encryptionKey]);

  if (loading) {
    return (
      <div className="glass-panel p-6 text-center text-slate-500 dark:text-slate-300">
        Decrypting your medical history...
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-panel p-6 text-sm text-rose-500">
        {error}
      </div>
    );
  }

  return (
    <div className="glass-panel px-6 py-7 sm:px-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="section-kicker">Encrypted timeline</p>
          <h3 className="mt-3 font-display text-2xl font-bold text-slate-900 dark:text-slate-50">
            Your medical timeline
          </h3>
          <p className="panel-copy mt-2">
            Each entry here was encrypted before upload, then decrypted locally
            with your wallet-derived key.
          </p>
        </div>
        <span className="surface-chip">
          {records.length} {records.length === 1 ? "record" : "records"}
        </span>
      </div>

      {records.length === 0 ? (
        <div className="empty-state mt-6">
          <p className="text-base font-semibold text-slate-900 dark:text-slate-50">
            Your history is empty.
          </p>
          <p className="panel-muted mt-2">
            Share your QR code with a clinic to start building your record.
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
            const authorLabel = formatRecordAuthor(
              author,
              truncateAddress(record.addedByClinic),
            );
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

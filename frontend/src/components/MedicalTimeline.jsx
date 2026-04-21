import { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  FileClock,
  FileSearch,
  RefreshCw,
  ShieldAlert,
} from 'lucide-react';
import { CATEGORY_COLORS, CATEGORY_LABELS, retrieveRecords } from '../utils/records';

function RecordSkeleton() {
  return (
    <div className="rounded-[26px] border border-[#dfe7ff] bg-[#fbfcff] p-5 animate-pulse">
      <div className="flex flex-wrap gap-3">
        <div className="h-5 w-24 rounded-full bg-[#dbe5ff]" />
        <div className="h-5 w-28 rounded-full bg-[#eef3ff]" />
      </div>
      <div className="mt-4 h-6 w-52 rounded bg-[#dbe5ff]" />
      <div className="mt-3 h-4 w-40 rounded bg-[#eef3ff]" />
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="h-20 rounded-2xl bg-white" />
        <div className="h-20 rounded-2xl bg-white" />
      </div>
    </div>
  );
}

function formatDateTime(timestamp) {
  if (!timestamp) {
    return 'Unknown time';
  }

  return new Date(timestamp).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatFieldLabel(key) {
  const overrides = {
    cd4Count: 'CD4 Count',
    viralLoad: 'Viral Load',
    nextAppointment: 'Next Appointment',
    nextSession: 'Next Session',
    moodScore: 'Mood Score',
    drugTolerances: 'Drug Tolerances',
  };

  if (overrides[key]) {
    return overrides[key];
  }

  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (value) => value.toUpperCase())
    .trim();
}

function getRecordFields(payload) {
  const data = payload?.data ?? payload ?? {};

  return Object.entries(data).filter(([, value]) => value !== '' && value !== null && value !== undefined);
}

function shortenAddress(value) {
  if (!value || value.length < 12) {
    return value || '';
  }

  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

export default function MedicalTimeline({ contract, address, encryptionKey }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [lastLoadedAt, setLastLoadedAt] = useState(null);

  const fetchAndDecryptRecords = useCallback(async ({ silent = false } = {}) => {
    try {
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError('');

      const chainRecords = await contract.getMyRecords();

      if (chainRecords.length === 0) {
        setRecords([]);
        setLastLoadedAt(Date.now());
        return;
      }

      const cids = chainRecords.map((record) => record.ipfsCID);
      const decryptedResults = await retrieveRecords(encryptionKey, cids);

      const combinedRecords = chainRecords
        .map((chainRecord, index) => ({
          ipfsCID: chainRecord.ipfsCID,
          timestamp: Number(chainRecord.timestamp) * 1000,
          addedByClinic: chainRecord.addedByClinic,
          category: Number(chainRecord.category),
          recordType: chainRecord.recordType,
          payload: decryptedResults[index].success ? decryptedResults[index].data : null,
          error: !decryptedResults[index].success ? decryptedResults[index].error : null,
        }))
        .sort((left, right) => right.timestamp - left.timestamp);

      setRecords(combinedRecords);
      setLastLoadedAt(Date.now());
    } catch (fetchError) {
      console.error('Failed to fetch patient timeline:', fetchError);
      setError('We could not load the encrypted timeline. Check the wallet, network, and IPFS connectivity, then retry.');
    } finally {
      if (silent) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  }, [contract, encryptionKey]);

  useEffect(() => {
    if (contract && address && encryptionKey) {
      const timeoutId = window.setTimeout(() => {
        void fetchAndDecryptRecords();
      }, 0);

      return () => window.clearTimeout(timeoutId);
    }

    return undefined;
  }, [address, contract, encryptionKey, fetchAndDecryptRecords]);

  return (
    <section className="card-premium">
      <div>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <FileClock className="size-4 text-primary" />
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Timeline
              </span>
            </div>
            <h3 className="mt-2 text-xl font-bold">Medical Records</h3>
          </div>

          <div className="flex items-center gap-3">
            <span className="badge-primary">
              {records.length} {records.length === 1 ? 'record' : 'records'}
            </span>
            <button
              onClick={() => fetchAndDecryptRecords({ silent: true })}
              className="btn-ghost"
            >
              <RefreshCw className={`size-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {lastLoadedAt && (
          <p className="mt-2 text-xs text-muted-foreground">
            Last synced: {formatDateTime(lastLoadedAt)}
          </p>
        )}
      </div>

      <div className="mt-6 space-y-4">
        {loading ? (
          <>
            <RecordSkeleton />
            <RecordSkeleton />
          </>
        ) : error ? (
          <div className="card-flat border-destructive/30 bg-destructive/5 p-6 text-center">
            <AlertCircle className="mx-auto size-8 text-destructive" />
            <p className="mt-3 font-medium text-destructive">Timeline unavailable</p>
            <p className="mt-1 text-sm text-muted-foreground">{error}</p>
            <button
              onClick={() => fetchAndDecryptRecords()}
              className="btn-primary mt-4"
            >
              <RefreshCw className="size-4" />
              Try Again
            </button>
          </div>
        ) : records.length === 0 ? (
          <div className="card-flat border-dashed border-border p-8 text-center">
            <FileSearch className="mx-auto size-8 text-muted-foreground" />
            <p className="mt-3 font-medium">No records yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Records will appear here after doctor submission
            </p>
          </div>
        ) : (
          records.map((record) => {
            const fields = getRecordFields(record.payload);
            const noteField = fields.find(([key]) => key === 'notes');
            const mainFields = fields.filter(([key]) => key !== 'notes');

            return (
              <article
                key={`${record.ipfsCID}-${record.timestamp}`}
                className="rounded-[28px] border border-[#dfe7ff] bg-[#fbfcff] p-5 shadow-sm"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className="rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-white"
                        style={{
                          backgroundColor: CATEGORY_COLORS[record.category] || '#1047b6',
                        }}
                      >
                        {CATEGORY_LABELS[record.category]}
                      </span>
                      <span className="rounded-full border border-[#dce5ff] bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#7b88a3]">
                        {formatDateTime(record.timestamp)}
                      </span>
                    </div>

                    <h4 className="mt-4 text-2xl font-semibold tracking-tight text-[#102347]">
                      {record.recordType}
                    </h4>

                    <div className="mt-3 rounded-2xl border border-[#e6ecff] bg-white p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#7b88a3]">
                        Added By Clinic
                      </p>
                      <p className="mt-2 font-mono text-sm text-[#24406c]">
                        {record.addedByClinic} ({shortenAddress(record.addedByClinic)})
                      </p>
                    </div>

                    {record.payload ? (
                      <>
                        {mainFields.length > 0 ? (
                          <div className="mt-4 grid gap-3 sm:grid-cols-2">
                            {mainFields.map(([key, value]) => (
                              <div
                                key={key}
                                className="rounded-2xl border border-[#e6ecff] bg-white p-4"
                              >
                                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#7b88a3]">
                                  {formatFieldLabel(key)}
                                </p>
                                <p className="mt-2 text-sm leading-6 text-[#24406c]">
                                  {String(value)}
                                </p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="mt-4 rounded-2xl border border-[#e6ecff] bg-white p-4 text-sm text-[#60708f]">
                            Record decrypted successfully, but there are no additional structured fields to display.
                          </div>
                        )}

                        {noteField ? (
                          <div className="panel-subtle mt-4 p-5 text-[#102347] shadow-none">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#7b88a3]">
                              Clinical Notes
                            </p>
                            <p className="mt-3 text-sm leading-7 text-[#24406c]">
                              {String(noteField[1])}
                            </p>
                          </div>
                        ) : null}
                      </>
                    ) : (
                      <div className="mt-4 rounded-2xl border border-[#f2c0c7] bg-[#fff4f5] p-4 text-sm text-[#b42335]">
                        <div className="flex items-start gap-3">
                          <ShieldAlert className="mt-0.5 size-4 shrink-0" />
                          <p>
                            Decryption failed for this record. {record.error || 'The encrypted payload could not be read from IPFS.'}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="w-full max-w-[220px] rounded-[24px] border border-[#e1e9ff] bg-white p-4 text-sm text-[#60708f]">
                    <div className="flex items-center gap-2 text-[#17305a]">
                      <FileClock className="size-4 text-[#1047b6]" />
                      <span className="font-medium">Record status</span>
                    </div>
                    <p className="mt-3 leading-6">
                      {record.payload
                        ? 'Encrypted record fetched and displayed successfully.'
                        : 'Record exists on chain, but the encrypted payload could not be decoded.'}
                    </p>
                  </div>
                </div>
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}

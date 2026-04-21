import { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  FileClock,
  FileSearch,
  RefreshCw,
  ShieldAlert,
} from 'lucide-react';
import { retrieveRecords, CATEGORY_LABELS, CATEGORY_COLORS } from '../utils/records';
import { importKeyFromBase64 } from '../utils/encryption';

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
    cd4Count: 'CD4 / Vital Stat',
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

export default function DoctorMedicalTimeline({
  contract,
  doctorAddress,
  patientAddress,
  base64Key,
}) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [cryptoKey, setCryptoKey] = useState(null);

  useEffect(() => {
    let active = true;

    async function prepareKey() {
      if (!base64Key) {
        setCryptoKey(null);
        setError('Patient session is missing the shared encryption key, so authorized records cannot be decrypted.');
        return;
      }

      try {
        const key = await importKeyFromBase64(base64Key);
        if (active) {
          setCryptoKey(key);
          setError('');
        }
      } catch (err) {
        console.error('Failed to import doctor session key:', err);
        if (active) {
          setCryptoKey(null);
          setError("Failed to import the patient's cryptographic key.");
        }
      }
    }

    void prepareKey();

    return () => {
      active = false;
    };
  }, [base64Key]);

  const fetchAuthorizedRecords = useCallback(async ({ silent = false } = {}) => {
    try {
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      if (!cryptoKey) {
        setRecords([]);
        return;
      }

      setError('');

      let allChainRecords = [];

      for (const catId of Object.keys(CATEGORY_LABELS)) {
        const hasAccess = await contract.hasActiveAccess(patientAddress, doctorAddress, catId);
        if (hasAccess) {
          try {
            const catRecords = await contract.getRecordsByCategory(patientAddress, catId);
            allChainRecords = allChainRecords.concat(catRecords);
          } catch (categoryError) {
            console.error(`Failed to fetch category ${catId}:`, categoryError);
          }
        }
      }

      if (allChainRecords.length === 0) {
        setRecords([]);
        return;
      }

      const cids = allChainRecords.map((record) => record.ipfsCID);
      const decryptedResults = await retrieveRecords(cryptoKey, cids);

      const combinedRecords = allChainRecords
        .map((chainRecord, index) => ({
          timestamp: Number(chainRecord.timestamp) * 1000,
          addedByClinic: chainRecord.addedByClinic,
          category: Number(chainRecord.category),
          recordType: chainRecord.recordType,
          payload: decryptedResults[index].success ? decryptedResults[index].data : null,
          error: !decryptedResults[index].success ? decryptedResults[index].error : null,
        }))
        .sort((left, right) => right.timestamp - left.timestamp);

      setRecords(combinedRecords);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch authorized records from the blockchain.');
    } finally {
      if (silent) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  }, [contract, cryptoKey, doctorAddress, patientAddress]);

  useEffect(() => {
    if (contract && patientAddress && doctorAddress && cryptoKey) {
      const timeoutId = window.setTimeout(() => {
        void fetchAuthorizedRecords();
      }, 0);

      return () => window.clearTimeout(timeoutId);
    }

    return undefined;
  }, [contract, patientAddress, doctorAddress, cryptoKey, fetchAuthorizedRecords]);

  if (!patientAddress) {
    return (
      <section className="page-card h-full rounded-[34px] p-6 text-[#102347] sm:p-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[#7b88a3]">
          Authorized Timeline
        </p>
        <h3 className="mt-2 text-3xl font-semibold tracking-tight">
          Timeline ready when a patient session starts
        </h3>
        <div className="mt-6 rounded-[28px] border border-dashed border-[#d7e2ff] bg-[#f8fbff] p-10 text-center">
          <FileSearch className="mx-auto size-12 text-[#1047b6]" />
          <p className="mt-4 text-xl font-semibold text-[#102347]">
            No patient selected yet
          </p>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[#60708f]">
            Scan a patient QR code or paste the secure payload to load only the records this doctor is permitted to view.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="page-card h-full rounded-[34px] p-6 text-[#102347] sm:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[#7b88a3]">
            Authorized Timeline
          </p>
          <h3 className="mt-2 text-3xl font-semibold tracking-tight">
            Patient records you are allowed to view
          </h3>
          <p className="mt-2 text-sm leading-6 text-[#60708f]">
            This timeline only shows records inside the categories the patient granted to the current doctor wallet.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-full border border-[#dce5ff] bg-[#f7f9fd] px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-[#1047b6] shadow-sm">
            {records.length} {records.length === 1 ? 'Record' : 'Records'}
          </div>
          <button
            onClick={() => fetchAuthorizedRecords({ silent: true })}
            className="inline-flex items-center gap-2 rounded-full border border-[#dce5ff] bg-[#f7f9fd] px-4 py-2 text-sm font-medium text-[#17305a] shadow-sm transition hover:border-[#b9cbff]"
          >
            <RefreshCw className={`size-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        {error ? (
          <div className="rounded-[28px] border border-[#f2c0c7] bg-[#fff6f7] p-6 text-center">
            <AlertCircle className="mx-auto size-10 text-[#d64257]" />
            <p className="mt-4 text-lg font-semibold text-[#9f1d33]">
              Authorized timeline unavailable
            </p>
            <p className="mt-2 text-sm leading-6 text-[#b04b5d]">{error}</p>
          </div>
        ) : null}

        {loading ? (
          <>
            <RecordSkeleton />
            <RecordSkeleton />
          </>
        ) : !error && records.length === 0 ? (
          <div className="rounded-[28px] border border-dashed border-[#d7e2ff] bg-[#f8fbff] p-10 text-center">
            <FileSearch className="mx-auto size-12 text-[#1047b6]" />
            <p className="mt-4 text-xl font-semibold text-[#102347]">
              No authorized records available
            </p>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[#60708f]">
              The patient may not have any records yet, or this doctor wallet has not been granted access to the categories containing them.
            </p>
          </div>
        ) : (
          records.map((record, index) => {
            const fields = getRecordFields(record.payload);
            const noteField = fields.find(([key]) => key === 'notes');
            const mainFields = fields.filter(([key]) => key !== 'notes');

            return (
              <article
                key={`${record.timestamp}-${index}`}
                className="rounded-[28px] border border-[#dfe7ff] bg-[#fbfcff] p-5 shadow-sm"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className="rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-white"
                        style={{ backgroundColor: CATEGORY_COLORS[record.category] || '#1047b6' }}
                      >
                        {CATEGORY_LABELS[record.category]}
                      </span>
                      <span className="rounded-full border border-[#dce5ff] bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#7b88a3]">
                        {formatDateTime(record.timestamp)}
                      </span>
                    </div>

                    <h4 className="mt-4 text-2xl font-semibold tracking-tight">
                      {record.recordType}
                    </h4>

                    <div className="mt-3 rounded-2xl border border-[#e6ecff] bg-white p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#7b88a3]">
                        Added By Clinic
                      </p>
                      <p className="mt-2 font-mono text-sm text-[#24406c]">
                        {record.addedByClinic === doctorAddress
                          ? 'You'
                          : `${record.addedByClinic} (${shortenAddress(record.addedByClinic)})`}
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
                        ? 'Authorized record fetched and decrypted successfully.'
                        : 'Record is on chain, but the payload could not be decoded for this session.'}
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

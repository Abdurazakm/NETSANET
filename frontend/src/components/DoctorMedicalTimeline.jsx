import { useState, useEffect } from 'react';
import { retrieveRecords, CATEGORY_LABELS, CATEGORY_COLORS } from '../utils/records';
import { importKeyFromBase64 } from '../utils/encryption';

export default function DoctorMedicalTimeline({ contract, doctorAddress, patientAddress, base64Key }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cryptoKey, setCryptoKey] = useState(null);

  // First prepare the crypto key
  useEffect(() => {
    async function prepareKey() {
      if (base64Key) {
        try {
          const key = await importKeyFromBase64(base64Key);
          setCryptoKey(key);
        } catch (err) {
          console.error("Failed to import key:", err);
          setError("Failed to import patient's cryptographic key.");
        }
      } else {
        setError("Missing patient's cryptographic key. Records cannot be decrypted.");
      }
    }
    prepareKey();
  }, [base64Key]);

  const fetchAuthorizedRecords = async () => {
    try {
      setLoading(true);
      setError(''); // Clear previous errors (aside from key errors handled above)

      if (!cryptoKey) {
        // Can't decrypt without key, although we might want to still show encrypted CIDs.
        // For MVP, we just wait for the key if it exists.
        if (!base64Key) {
          setLoading(false);
          return;
        }
      }

      let allChainRecords = [];

      // Fetch categories the doctor has access to
      for (const catId of Object.keys(CATEGORY_LABELS)) {
        const hasAccess = await contract.hasActiveAccess(patientAddress, doctorAddress, catId);
        if (hasAccess) {
          // Fetch the records for this authorized category
          try {
            // Note: getRecordsByCategory may revert if access is not truly granted in contract
            const catRecords = await contract.getRecordsByCategory(patientAddress, catId);
            allChainRecords = allChainRecords.concat(catRecords);
          } catch (e) {
            console.error(`Failed to fetch category ${catId}:`, e);
          }
        }
      }

      if (allChainRecords.length === 0) {
        setRecords([]);
        setLoading(false);
        return;
      }

      // Decrypt all fetched records
      const cids = allChainRecords.map(r => r.ipfsCID);
      const decryptedResults = await retrieveRecords(cryptoKey, cids);
      
      const combined = allChainRecords.map((chainRec, idx) => ({
        timestamp: Number(chainRec.timestamp) * 1000,
        addedByClinic: chainRec.addedByClinic,
        category: Number(chainRec.category),
        recordType: chainRec.recordType,
        payload: decryptedResults[idx].success ? decryptedResults[idx].data : null,
        error: !decryptedResults[idx].success ? decryptedResults[idx].error : null
      }));

      // Sort newest first
      combined.sort((a, b) => b.timestamp - a.timestamp);
      setRecords(combined);

    } catch (err) {
      console.error(err);
      setError('Failed to fetch records from the blockchain.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (contract && patientAddress && doctorAddress && cryptoKey) {
      fetchAuthorizedRecords();
    }
  }, [contract, patientAddress, doctorAddress, cryptoKey]);

  if (loading) return <div className="animate-pulse p-4 text-center">Fetching authorized medical history...</div>;

  return (
    <div className="glass-panel p-6 rounded-xl border border-gray-800 h-full">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold">Patient Timeline (Authorized View)</h3>
        <span className="text-sm text-secondary bg-surface px-3 py-1 rounded-full">
          {records.length} {records.length === 1 ? 'Record' : 'Records'}
        </span>
      </div>

      {error && !base64Key && (
        <div className="text-error bg-red-900/20 p-4 rounded-lg border border-red-500/50 mb-6 text-sm">
          ⚠️ {error} You will not be able to read the patient's records.
        </div>
      )}

      {records.length === 0 && !loading && !error ? (
        <div className="text-center py-10 bg-surface rounded-lg border border-dashed border-gray-700">
          <p className="text-muted">No records available.</p>
          <p className="text-sm text-secondary mt-2">
            The patient either has no records, or you have not been granted access to the categories containing them.
          </p>
        </div>
      ) : (
        <div className="relative border-l-2 border-gray-700 ml-4 space-y-8">
          {records.map((rec, idx) => {
            const hasData = !!rec.payload;
            const date = new Date(rec.timestamp).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
            
            return (
              <div key={idx} className="relative pl-6">
                <div 
                  className="absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 border-bg-dark"
                  style={{ backgroundColor: CATEGORY_COLORS[rec.category] || '#fff' }}
                />
                
                <div className="bg-surface rounded-lg p-5 border border-gray-700 hover:border-gray-500 transition-colors">
                  <div className="flex flex-wrap justify-between items-baseline mb-2 gap-2">
                    <span 
                      className="text-xs font-bold uppercase tracking-wider px-2 py-1 rounded-sm text-white"
                      style={{ backgroundColor: CATEGORY_COLORS[rec.category] || '#ccc' }}
                    >
                      {CATEGORY_LABELS[rec.category]}
                    </span>
                    <span className="text-sm text-muted">{date}</span>
                  </div>
                  
                  <h4 className="text-lg font-semibold mb-1 text-primary">{rec.recordType}</h4>
                  <p className="text-xs font-mono text-muted mb-4 truncate" title={rec.addedByClinic}>
                    Added by: {rec.addedByClinic === doctorAddress ? "You" : `${rec.addedByClinic.substring(0,6)}...${rec.addedByClinic.substring(38)}`}
                  </p>

                  {hasData ? (
                    <div className="bg-[#1a1a1a] p-4 rounded-md border border-gray-800 text-sm">
                      {rec.payload.data?.diagnosis && (
                        <p className="mb-2"><span className="text-secondary">Diagnosis:</span> {rec.payload.data.diagnosis}</p>
                      )}
                      {rec.payload.data?.medication && (
                        <p className="mb-2"><span className="text-secondary">Medication:</span> {rec.payload.data.medication}</p>
                      )}
                      {rec.payload.data?.cd4Count && (
                        <p className="mb-2"><span className="text-secondary">CD4/Vital Stat:</span> {rec.payload.data.cd4Count}</p>
                      )}
                      {rec.payload.data?.notes && (
                        <p className="italic text-gray-400 mt-3 pt-3 border-t border-gray-800">
                          "{rec.payload.data.notes}"
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="text-error text-sm p-3 bg-red-900/20 rounded border border-red-900/50">
                      ⚠️ Decryption failed or IPFS CID unavailable. ({rec.error})
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

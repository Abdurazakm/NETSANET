import { useState, useEffect } from 'react';
import { retrieveRecords, CATEGORY_LABELS, CATEGORY_COLORS } from '../utils/records';

export default function MedicalTimeline({ contract, address, encryptionKey }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchAndDecryptRecords = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Fetch CIDs and metadata from blockchain
      const chainRecords = await contract.getMyRecords();
      
      if (chainRecords.length === 0) {
        setRecords([]);
        return;
      }

      // Map blockchain data
      const cids = chainRecords.map(r => r.ipfsCID);
      
      // Decrypt all from IPFS
      const decryptedResults = await retrieveRecords(encryptionKey, cids);
      
      // Combine chain metadata with decrypted payload
      const combined = chainRecords.map((chainRec, idx) => ({
        timestamp: Number(chainRec.timestamp) * 1000, // convert to ms
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
      setError('Failed to load records from the blockchain.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (contract && encryptionKey) {
      fetchAndDecryptRecords();
    }
  }, [contract, encryptionKey]);

  if (loading) return <div className="animate-pulse p-4 text-center">Decrypting your medical history...</div>;
  if (error) return <div className="text-error p-4">{error}</div>;

  return (
    <div className="glass-panel p-6 rounded-xl border border-gray-800">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold">Your Medical Timeline</h3>
        <span className="text-sm text-secondary bg-surface px-3 py-1 rounded-full">
          {records.length} {records.length === 1 ? 'Record' : 'Records'}
        </span>
      </div>

      {records.length === 0 ? (
        <div className="text-center py-10 bg-surface rounded-lg border border-dashed border-gray-700">
          <p className="text-muted">Your history is completely empty.</p>
          <p className="text-sm text-secondary mt-2">Share your QR code with a clinic to start building your record.</p>
        </div>
      ) : (
        <div className="relative border-l-2 border-gray-700 ml-4 space-y-8">
          {records.map((rec, idx) => {
            const hasData = !!rec.payload;
            const date = new Date(rec.timestamp).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
            
            return (
              <div key={idx} className="relative pl-6">
                {/* Timeline Dot */}
                <div 
                  className="absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 border-bg-dark"
                  style={{ backgroundColor: CATEGORY_COLORS[rec.category] || '#fff' }}
                />
                
                {/* Content Card */}
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
                    Added by: {rec.addedByClinic.substring(0,6)}...{rec.addedByClinic.substring(38)}
                  </p>

                  {/* Decrypted Payload */}
                  {hasData ? (
                    <div className="bg-[#1a1a1a] p-4 rounded-md border border-gray-800 text-sm">
                      {rec.payload.data?.diagnosis && (
                        <p className="mb-2"><span className="text-secondary">Diagnosis:</span> {rec.payload.data.diagnosis}</p>
                      )}
                      {rec.payload.data?.medication && (
                        <p className="mb-2"><span className="text-secondary">Medication:</span> {rec.payload.data.medication}</p>
                      )}
                      {rec.payload.data?.cd4Count && (
                        <p className="mb-2"><span className="text-secondary">CD4 Count:</span> {rec.payload.data.cd4Count}</p>
                      )}
                      {rec.payload.data?.notes && (
                        <p className="italic text-gray-400 mt-3 pt-3 border-t border-gray-800">
                          "{rec.payload.data.notes}"
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="text-error text-sm p-3 bg-red-900/20 rounded">
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

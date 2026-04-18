import { useState } from 'react';
import { submitRecord, CATEGORY_LABELS } from '../utils/records';
import { importKeyFromBase64 } from '../utils/encryption';

export default function RecordSubmissionForm({ patientAddress, base64Key, onRecordAdded }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Form State
  const [category, setCategory] = useState('0'); // default
  const [recordType, setRecordType] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [medication, setMedication] = useState('');
  const [cd4Count, setCd4Count] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!base64Key) {
      setError('Cannot submit record without decrypting the session (missing patient key).');
      return;
    }
    if (!recordType) {
      setError('Title/Record Type is required.');
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      
      const cryptoKey = await importKeyFromBase64(base64Key);
      
      const recordData = {
        diagnosis,
        medication,
        cd4Count,
        notes
      };

      // 1. Encrypt and Upload to IPFS (returns CID)
      const cid = await submitRecord(
        cryptoKey, 
        recordData, 
        patientAddress, 
        CATEGORY_LABELS[category], 
        recordType
      );

      // Wait, the on-chain call must be made! The submitRecord util only uploads to IPFS.
      // We must call the smart contract to store the CID.
      // The parent component should probably pass the 'contract' prop so we can add it.
      // Or we can invoke an onRecordAdded event with the payload.
      await onRecordAdded(cid, category, recordType);

      // Reset form on success
      setCategory('0');
      setRecordType('');
      setDiagnosis('');
      setMedication('');
      setCd4Count('');
      setNotes('');
      
    } catch (err) {
      console.error(err);
      setError('Failed to submit record: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-panel p-6 rounded-xl border border-gray-800">
      <h3 className="text-lg font-bold mb-4">Add New Record</h3>
      
      {!base64Key && (
        <div className="mb-4 p-3 bg-red-900/20 border border-red-900 shadow-sm rounded text-xs text-error">
          A patient key is required to encrypt records. Missing key.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs text-secondary mb-1">Category</label>
          <select 
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full bg-[#1a1a1a] border border-gray-700 rounded p-2 text-sm focus:border-eth-yellow outline-none text-white"
          >
            {Object.entries(CATEGORY_LABELS).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs text-secondary mb-1">Record Type / Title *</label>
          <input 
            type="text" 
            required
            value={recordType}
            onChange={(e) => setRecordType(e.target.value)}
            placeholder="e.g. CD4 Checkup, MRI Scan..." 
            className="w-full bg-[#1a1a1a] border border-gray-700 rounded p-2 text-sm focus:border-eth-yellow outline-none text-white"
          />
        </div>

        <div>
          <label className="block text-xs text-secondary mb-1">Diagnosis</label>
          <input 
            type="text" 
            value={diagnosis}
            onChange={(e) => setDiagnosis(e.target.value)}
            placeholder="e.g. Type 2 Diabetes" 
            className="w-full bg-[#1a1a1a] border border-gray-700 rounded p-2 text-sm focus:border-eth-yellow outline-none text-white"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-secondary mb-1">Medication</label>
            <input 
              type="text" 
              value={medication}
              onChange={(e) => setMedication(e.target.value)}
              placeholder="e.g. Metformin 500mg" 
              className="w-full bg-[#1a1a1a] border border-gray-700 rounded p-2 text-sm focus:border-eth-yellow outline-none text-white"
            />
          </div>
          <div>
            <label className="block text-xs text-secondary mb-1">Vitals / CD4 Count</label>
            <input 
              type="text" 
              value={cd4Count}
              onChange={(e) => setCd4Count(e.target.value)}
              placeholder="e.g. 600" 
              className="w-full bg-[#1a1a1a] border border-gray-700 rounded p-2 text-sm focus:border-eth-yellow outline-none text-white"
            />
          </div>
        </div>

        <div>
           <label className="block text-xs text-secondary mb-1">Doctor's Notes</label>
           <textarea 
             value={notes}
             onChange={(e) => setNotes(e.target.value)}
             rows={3}
             placeholder="Observations, next steps..."
             className="w-full bg-[#1a1a1a] border border-gray-700 rounded p-2 text-sm focus:border-eth-yellow outline-none text-white"
           />
        </div>

        {error && <p className="text-error text-xs">{error}</p>}

        <button 
          type="submit" 
          disabled={loading || !base64Key}
          className="w-full bg-eth-yellow hover:bg-yellow-500 text-bg-dark font-bold py-3 rounded text-sm disabled:opacity-50 transition-colors"
        >
          {loading ? 'Encrypting & Storing...' : 'Sign & Submit Record'}
        </button>
      </form>
    </div>
  );
}

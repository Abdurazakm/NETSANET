import { useState, useEffect } from 'react';
import { CATEGORY_LABELS, CATEGORY_COLORS } from '../utils/records';

export default function DoctorAccessManager({ contract, doctorAddress, patientAddress }) {
  const [accessStatuses, setAccessStatuses] = useState({});
  const [loading, setLoading] = useState(true);

  // Check which categories the doctor has access to
  const fetchAccessStatuses = async () => {
    try {
      setLoading(true);
      const statuses = {};
      
      // The categories are 0 through 6
      for (const catId of Object.keys(CATEGORY_LABELS)) {
        const hasAccess = await contract.hasActiveAccess(patientAddress, doctorAddress, catId);
        statuses[catId] = hasAccess;
      }
      
      setAccessStatuses(statuses);
    } catch (err) {
      console.error('Failed to fetch access statuses', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (contract && patientAddress && doctorAddress) {
      fetchAccessStatuses();
    }
  }, [contract, patientAddress, doctorAddress]);

  if (loading) {
    return <div className="p-4 animate-pulse text-secondary">Checking access permissions...</div>;
  }

  return (
    <div className="glass-panel p-6 rounded-xl border border-gray-800">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold">Category Access</h3>
        <button 
          onClick={fetchAccessStatuses}
          className="text-xs bg-surface hover:bg-gray-700 px-3 py-1 rounded transition-colors"
        >
          Refresh
        </button>
      </div>

      <p className="text-sm text-muted mb-4">
        You can only view records for categories where the patient has explicitly granted you access.
      </p>

      <div className="space-y-3">
        {Object.entries(CATEGORY_LABELS).map(([catId, label]) => {
          const hasAccess = accessStatuses[catId];
          const color = CATEGORY_COLORS[catId] || '#ccc';

          return (
            <div 
              key={catId} 
              className={`flex justify-between items-center p-3 rounded-lg border ${
                hasAccess ? 'bg-[#1a1a1a] border-gray-700' : 'bg-transparent border-gray-800 opacity-60'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                <span className={`text-sm ${hasAccess ? 'font-semibold text-white' : 'text-gray-400'}`}>
                  {label}
                </span>
              </div>
              
              {hasAccess ? (
                <span className="text-xs font-bold text-success bg-green-900/20 px-2 py-1 rounded">
                  Granted
                </span>
              ) : (
                <button 
                  onClick={() => alert(`Please ask the patient to scan your address and grant you access to ${label}.\n\nYour Address: ${doctorAddress}`)}
                  className="text-xs text-eth-yellow underline hover:text-yellow-400"
                >
                  Request Access
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

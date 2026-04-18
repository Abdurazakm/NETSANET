import { useState, useEffect } from 'react';
import { CATEGORY_LABELS, CATEGORY_COLORS } from '../utils/records';

export default function AccessManager({ contract, address }) {
  const [grants, setGrants] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // New Grant Form State
  const [showGrantForm, setShowGrantForm] = useState(false);
  const [newDocAddress, setNewDocAddress] = useState('');
  const [newCat, setNewCat] = useState('0'); // GENERAL_CONSULTATION default
  const [newDuration, setNewDuration] = useState('24'); // Default 24 hours
  const [granting, setGranting] = useState(false);

  const fetchGrants = async () => {
    try {
      setLoading(true);
      const data = await contract.getMyAccessGrants();
      setGrants(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (contract && address) {
      fetchGrants();
    }
  }, [contract, address]);

  const handleRevoke = async (doctor, category) => {
    try {
      const tx = await contract.revokeAccess(doctor, category);
      await tx.wait();
      fetchGrants(); // Refresh
    } catch (err) {
      console.error('Failed to revoke:', err);
      alert('Failed to revoke access. Ensure it is not already expired/revoked.');
    }
  };

  const handleGrant = async (e) => {
    e.preventDefault();
    if (!newDocAddress.trim()) return;
    try {
      setGranting(true);
      const categoryNum = parseInt(newCat);
      const durationHours = parseInt(newDuration);
      
      const tx = await contract.grantAccess(newDocAddress, categoryNum, durationHours);
      await tx.wait();
      
      setNewDocAddress('');
      setShowGrantForm(false);
      fetchGrants(); // Refresh list
    } catch (err) {
      console.error('Failed to grant:', err);
      alert('Failed to grant access. Please check the address and try again.');
    } finally {
      setGranting(false);
    }
  };

  if (loading) return <div className="p-4 text-secondary animate-pulse">Loading access grants...</div>;

  const getStatus = (grant) => {
    if (grant.revoked) return { text: 'Revoked', color: 'text-error' };
    const now = Math.floor(Date.now() / 1000);
    if (now >= Number(grant.expiresAt)) return { text: 'Expired', color: 'text-muted' };
    return { text: 'Active', color: 'text-success' };
  };

  return (
    <div className="glass-panel p-6 rounded-xl border border-gray-800">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Who Has Access?</h3>
        <button 
          onClick={() => setShowGrantForm(!showGrantForm)}
          className="text-xs bg-surface hover:bg-gray-700 text-eth-green border border-eth-green px-3 py-1 rounded transition-colors"
        >
          {showGrantForm ? 'Cancel' : '+ Grant Access'}
        </button>
      </div>

      {/* GRANT FORM */}
      {showGrantForm && (
        <form onSubmit={handleGrant} className="bg-[#1a1a1a] p-4 rounded-lg border border-gray-700 mb-6 space-y-3">
          <div>
            <label className="block text-xs text-secondary mb-1">Doctor Wallet Address</label>
            <input 
              type="text" 
              required
              value={newDocAddress}
              onChange={(e) => setNewDocAddress(e.target.value)}
              placeholder="0x..." 
              className="w-full bg-bg-dark border border-gray-700 rounded p-2 text-sm text-white focus:border-eth-green outline-none font-mono"
            />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs text-secondary mb-1">Category</label>
              <select 
                value={newCat}
                onChange={(e) => setNewCat(e.target.value)}
                className="w-full bg-bg-dark border border-gray-700 rounded p-2 text-sm text-white focus:border-eth-green outline-none"
              >
                {Object.entries(CATEGORY_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </div>
            <div className="w-24">
              <label className="block text-xs text-secondary mb-1">Hours</label>
              <input 
                type="number" 
                required
                min="1"
                value={newDuration}
                onChange={(e) => setNewDuration(e.target.value)}
                className="w-full bg-bg-dark border border-gray-700 rounded p-2 text-sm text-white focus:border-eth-green outline-none"
              />
            </div>
          </div>
          <button 
            type="submit" 
            disabled={granting || !newDocAddress}
            className="w-full bg-eth-green hover:bg-green-600 text-white font-bold py-2 rounded text-sm disabled:opacity-50 mt-2"
          >
            {granting ? 'Broadcasting Tx...' : 'Authorize Doctor'}
          </button>
        </form>
      )}
      
      {grants.length === 0 ? (
        <p className="text-secondary text-sm">No one currently has access to your records.</p>
      ) : (
        <div className="space-y-4">
          {grants.map((grant, idx) => {
            const status = getStatus(grant);
            const isActive = status.text === 'Active';
            
            return (
              <div key={idx} className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-surface p-4 rounded-lg border border-gray-700">
                <div className="mb-3 sm:mb-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span 
                      className="w-2 h-2 rounded-full" 
                      style={{ backgroundColor: CATEGORY_COLORS[grant.category] || '#ccc' }}
                    />
                    <span className="font-medium text-sm">
                      {CATEGORY_LABELS[grant.category]}
                    </span>
                  </div>
                  <p className="text-xs font-mono text-muted mb-1 truncate max-w-[200px]" title={grant.doctor}>
                    Doc: {grant.doctor.substring(0, 8)}...
                  </p>
                  <p className={`text-xs font-semibold ${status.color}`}>
                    {status.text}
                  </p>
                </div>
                
                {isActive && (
                  <button 
                    onClick={() => handleRevoke(grant.doctor, grant.category)}
                    className="bg-red-500/20 hover:bg-red-500/40 text-error text-xs px-3 py-1.5 rounded"
                  >
                    Revoke Now
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

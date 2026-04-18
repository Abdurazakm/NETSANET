import { useState } from 'react';

export default function PatientRegistration({ contract, onRegistered }) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setLoading(true);
      setError('');
      
      const tx = await contract.registerPatient(name);
      await tx.wait(); // Wait for confirmation
      
      onRegistered(name);
    } catch (err) {
      console.error(err);
      setError('Registration failed. Make sure you are on Sepolia and have test ETH.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-panel p-6 rounded-xl mt-6 border-eth-green border-t-4">
      <h2 className="text-xl font-bold mb-4">Register as a New Patient</h2>
      <p className="text-sm text-muted mb-6">
        Create your digital medical identity. Your real medical data will be encrypted and stored separately.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="block text-sm text-secondary mb-1">Full Name</label>
          <input 
            type="text" 
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Selam Tadesse"
            className="w-full bg-surface border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:border-eth-green"
            required
          />
        </div>

        {error && <p className="text-error text-sm">{error}</p>}

        <button 
          type="submit" 
          disabled={loading || !name}
          className="bg-eth-green hover:bg-green-600 self-start mt-2"
        >
          {loading ? 'Registering on Blockchain...' : 'Create My Medical Identity'}
        </button>
      </form>
    </div>
  );
}

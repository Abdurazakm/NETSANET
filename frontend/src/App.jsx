import { useState } from 'react';
import WalletConnect from './components/WalletConnect';
import PatientDashboard from './pages/PatientDashboard';
import DoctorDashboard from './pages/DoctorDashboard';
function App() {
  const [role, setRole] = useState('patient'); // 'patient' or 'doctor'
  const [walletState, setWalletState] = useState(null); // { provider, signer, address, contract }

  return (
    <div className="min-h-screen app-bg text-white font-sans transition-colors duration-300">
      <div className="max-w-6xl mx-auto px-4 py-8">
        
        {/* Header containing Logo & Role Toggle */}
        <header className="flex flex-col md:flex-row justify-between items-center mb-10 gap-6 glass-panel px-6 py-4 rounded-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-eth-green to-eth-yellow flex items-center justify-center shadow-lg pt-1">
              <span className="text-2xl">🛡️</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-eth-green to-eth-yellow">
                Netsanet
              </h1>
              <p className="text-[10px] text-muted uppercase tracking-widest font-semibold">
                Patient-Owned Medical Records
              </p>
            </div>
          </div>

          {/* Role Toggle Switch */}
          <div className="flex bg-[#1a1a1a] p-1 rounded-lg border border-gray-800">
            <button
              onClick={() => setRole('patient')}
              className={`px-6 py-2 rounded-md text-sm font-bold transition-all ${
                role === 'patient' 
                  ? 'bg-surface text-eth-green shadow-md' 
                  : 'text-secondary hover:text-white'
              }`}
            >
              Patient
            </button>
            <button
              onClick={() => setRole('doctor')}
              className={`px-6 py-2 rounded-md text-sm font-bold transition-all ${
                role === 'doctor' 
                  ? 'bg-surface text-eth-yellow shadow-md' 
                  : 'text-secondary hover:text-white'
              }`}
            >
              Doctor / Clinic
            </button>
          </div>
          
          {/* Wallet Status indicator */}
          {walletState && (
            <div className="flex items-center gap-2 bg-[#1a1a1a] px-3 py-1.5 rounded-full border border-gray-800">
              <span className="w-2 h-2 rounded-full bg-eth-green animate-pulse"></span>
              <span className="text-xs font-mono text-secondary">
                {walletState.address.substring(0, 6)}...{walletState.address.substring(38)}
              </span>
            </div>
          )}
        </header>

        {/* Content Body */}
        <main>
          {!walletState ? (
            // User must connect their MetaMask first
            <WalletConnect onConnect={(state) => setWalletState(state)} />
          ) : (
            // Connected: Route to the appropriate dashboard based on the toggle
            <>
              {role === 'patient' ? (
                <PatientDashboard 
                  provider={walletState.provider}
                  signer={walletState.signer}
                  address={walletState.address}
                  contract={walletState.contract}
                />
              ) : (
                <DoctorDashboard
                  provider={walletState.provider}
                  signer={walletState.signer}
                  address={walletState.address}
                  contract={walletState.contract}
                />
              )}
            </>
          )}
        </main>
        
      </div>
    </div>
  );
}

export default App;

import { useState } from 'react'
import './index.css'

function App() {
  const [activeTab, setActiveTab] = useState('patient')

  return (
    <div className="min-h-screen bg-dark">
      {/* Header */}
      <header className="glass-panel eth-border-top p-4 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Netsanet <span className="text-gradient">ነፃነት</span></h1>
            <p className="text-sm text-muted">Patient-Owned Medical Records</p>
          </div>
          
          {/* Role Toggle */}
          <div className="flex bg-surface rounded-lg p-1">
            <button 
              className={`px-4 py-2 rounded-md ${activeTab === 'patient' ? 'bg-primary' : 'bg-transparent text-secondary hover:text-white'}`}
              onClick={() => setActiveTab('patient')}
            >
              Patient App
            </button>
            <button 
              className={`px-4 py-2 rounded-md ${activeTab === 'doctor' ? 'bg-primary' : 'bg-transparent text-secondary hover:text-white'}`}
              onClick={() => setActiveTab('doctor')}
            >
              Doctor App
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-4xl mx-auto p-4 mt-8">
        {activeTab === 'patient' ? (
          <div>
            <h2>Patient Dashboard</h2>
            <p className="text-muted mt-2">Connect your wallet to view and manage your medical records.</p>
          </div>
        ) : (
          <div>
            <h2>Doctor Dashboard</h2>
            <p className="text-muted mt-2">Connect your wallet to request access to patient records.</p>
          </div>
        )}
      </main>
    </div>
  )
}

export default App

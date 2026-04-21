import { useState } from 'react';
import { AlertCircle, ShieldCheck, Wallet } from 'lucide-react';
import { connectWallet } from '../utils/contract';

export default function WalletConnect({ onConnect }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleConnect = async () => {
    try {
      setLoading(true);
      setError('');
      const { provider, signer, address, contract } = await connectWallet();
      onConnect({ provider, signer, address, contract });
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to connect wallet');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="card-premium max-w-lg w-full">
        <div className="text-center">
          <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-primary/10">
            <ShieldCheck className="size-8 text-primary" />
          </div>
          <h2 className="mt-6 text-2xl font-bold">Connect Your Wallet</h2>
          <p className="mt-3 text-muted-foreground">
            Connect with MetaMask to access the Netsanet healthcare platform. Your wallet serves as both your identity and authentication.
          </p>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-4">
          <div className="rounded-lg border border-border bg-muted/30 p-4">
            <Wallet className="size-5 text-primary" />
            <p className="mt-2 text-sm font-medium">One Wallet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Works for patient and doctor flows
            </p>
          </div>
          <div className="rounded-lg border border-border bg-muted/30 p-4">
            <ShieldCheck className="size-5 text-primary" />
            <p className="mt-2 text-sm font-medium">Encrypted</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Records stay private
            </p>
          </div>
        </div>

        <button
          onClick={handleConnect}
          disabled={loading}
          className="btn-primary mt-8 w-full"
        >
          {loading ? 'Connecting...' : 'Connect MetaMask'}
        </button>

        {error && (
          <div className="mt-4 flex items-start gap-2 rounded-lg bg-destructive/5 p-3 text-sm text-destructive">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <div className="mt-6 rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
          <p className="font-medium">Before connecting:</p>
          <ul className="mt-2 list-disc pl-4 space-y-1">
            <li>Open MetaMask and unlock your wallet</li>
            <li>Make sure you're on Sepolia testnet</li>
            <li>Approve the connection request</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
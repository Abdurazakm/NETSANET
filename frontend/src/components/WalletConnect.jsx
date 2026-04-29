import { useState } from "react";
import { connectWallet } from "../utils/contract";

export default function WalletConnect({ onConnect }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleConnect = async () => {
    try {
      setLoading(true);
      setError("");
      const { provider, signer, address, contract } = await connectWallet();
      onConnect({ provider, signer, address, contract });
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to connect wallet");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-panel mx-auto mt-8 max-w-3xl px-6 py-8 text-center sm:px-10 sm:py-10">
      <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-[22px] bg-gradient-to-br from-eth-green/20 to-sky-500/20 text-eth-green shadow-lg shadow-sky-950/10">
        <svg
          className="h-8 w-8"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M20 7l-8-4-8 4v10l8 4 8-4V7z" />
          <path d="M8 11h8" />
          <path d="M12 7v8" />
        </svg>
      </div>

      <p className="section-kicker">Secure entry</p>
      <h2 className="mt-3 font-display text-3xl font-bold text-slate-900 dark:text-slate-50">
        Connect your wallet
      </h2>
      <p className="panel-copy mx-auto mt-3 max-w-2xl">
        Netsanet uses MetaMask to authenticate you and derive your personal
        encryption key. No usernames, no passwords, and no extra identity layer
        sitting between the patient and their records.
      </p>

      <div className="glass-inset mx-auto mt-6 grid max-w-2xl gap-3 rounded-[24px] p-4 sm:grid-cols-3">
        <div className="rounded-[20px] px-4 py-4 text-left">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
            Wallet-authenticated
          </p>
          <p className="panel-muted mt-1 text-xs">
            MetaMask proves identity directly from the address the user
            controls.
          </p>
        </div>
        <div className="rounded-[20px] px-4 py-4 text-left">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
            Private by default
          </p>
          <p className="panel-muted mt-1 text-xs">
            Records stay encrypted until the patient explicitly unlocks them.
          </p>
        </div>
        <div className="rounded-[20px] px-4 py-4 text-left">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
            Consent-aware flow
          </p>
          <p className="panel-muted mt-1 text-xs">
            Clinics request category-level access instead of getting blanket
            read permissions.
          </p>
        </div>
      </div>

      <button
        onClick={handleConnect}
        disabled={loading}
        className="btn-primary mt-6 px-8 py-3 text-lg disabled:opacity-50"
      >
        {loading ? "Connecting..." : "Connect MetaMask"}
      </button>

      {error && (
        <div className="mt-4 rounded-[20px] border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-200">
          {error}
        </div>
      )}
    </div>
  );
}

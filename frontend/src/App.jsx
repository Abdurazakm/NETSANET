import { useEffect, useState } from "react";
import WalletConnect from "./components/WalletConnect";
import PatientDashboard from "./pages/PatientDashboard";
import DoctorDashboard from "./pages/DoctorDashboard";

const THEME_STORAGE_KEY = "netsanet-theme";

const ROLE_OPTIONS = [
  {
    id: "patient",
    title: "Patient",
    subtitle: "Own your encrypted timeline",
    accentClassName:
      "bg-gradient-to-br from-eth-green to-teal-500 text-white shadow-lg shadow-emerald-900/15",
  },
  {
    id: "doctor",
    title: "Doctor / Clinic",
    subtitle: "Review with explicit consent",
    accentClassName:
      "bg-gradient-to-br from-eth-yellow to-sky-500 text-white shadow-lg shadow-sky-900/15",
  },
];

function applyTheme(isDarkMode) {
  if (typeof document === "undefined") {
    return;
  }

  document.body.classList.toggle("dark", isDarkMode);
  document.documentElement.classList.toggle("dark", isDarkMode);
}

function getInitialDarkMode() {
  if (typeof window === "undefined") {
    return true;
  }

  const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);

  if (storedTheme === "dark") {
    return true;
  }

  if (storedTheme === "light") {
    return false;
  }

  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? true;
}

function formatAddress(address) {
  if (!address) {
    return "";
  }

  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function App() {
  const [role, setRole] = useState("patient");
  const [walletState, setWalletState] = useState(null);
  const [darkMode, setDarkMode] = useState(() => {
    const initialDarkMode = getInitialDarkMode();
    applyTheme(initialDarkMode);
    return initialDarkMode;
  });

  useEffect(() => {
    if (!window.ethereum) {
      return undefined;
    }

    const handleAccountsChanged = () => {
      window.location.reload();
    };

    window.ethereum.on("accountsChanged", handleAccountsChanged);

    return () => {
      window.ethereum.removeListener?.("accountsChanged", handleAccountsChanged);
    };
  }, []);

  useEffect(() => {
    applyTheme(darkMode);
    window.localStorage.setItem(
      THEME_STORAGE_KEY,
      darkMode ? "dark" : "light",
    );
  }, [darkMode]);

  const activeRole = ROLE_OPTIONS.find((option) => option.id === role);

  return (
    <div
      className={`app-shell min-h-screen transition-colors duration-500 ${
        darkMode ? "text-dark-text" : "text-slate-900"
      }`}
    >
      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
        <header className="glass-panel mb-8 px-5 py-5 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-1 items-start gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-[20px] bg-gradient-to-br from-eth-green via-teal-500 to-eth-yellow text-white shadow-lg shadow-sky-950/25">
                <svg
                  className="h-7 w-7"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M12 3l7 3v5c0 5-3.2 8.8-7 10-3.8-1.2-7-5-7-10V6l7-3z" />
                  <path d="M9.75 12h4.5" />
                  <path d="M12 9.75v4.5" />
                </svg>
              </div>

              <div className="space-y-3">
                <p className="section-kicker">Patient-owned medical records</p>
                <div className="space-y-2">
                  <h1 className="font-display text-3xl font-bold text-gradient sm:text-4xl">
                    Netsanet
                  </h1>
                  <p className="panel-copy max-w-2xl">
                    A cleaner workspace for private record sharing, patient
                    consent, and clinic collaboration without losing the simple
                    structure you already built.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex w-full flex-col gap-4 xl:max-w-[620px]">
              <div className="glass-inset flex flex-col gap-2 p-2 sm:flex-row">
                {ROLE_OPTIONS.map((option) => {
                  const isActive = role === option.id;

                  return (
                    <button
                      key={option.id}
                      onClick={() => setRole(option.id)}
                      className={`group flex-1 rounded-[20px] px-4 py-3 text-left ${
                        isActive
                          ? option.accentClassName
                          : "bg-transparent text-slate-600 hover:bg-white/60 dark:text-slate-300 dark:hover:bg-white/5"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`flex h-11 w-11 items-center justify-center rounded-2xl border text-[0.68rem] font-display font-semibold uppercase tracking-[0.28em] ${
                            isActive
                              ? "border-white/25 bg-white/15 text-white"
                              : "border-slate-300/70 bg-white/60 text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
                          }`}
                        >
                          {option.id === "patient" ? "PT" : "DR"}
                        </span>
                        <span className="min-w-0">
                          <span className="block text-sm font-bold">
                            {option.title}
                          </span>
                          <span
                            className={`block text-xs ${
                              isActive
                                ? "text-white/80"
                                : "text-slate-500 dark:text-slate-400"
                            }`}
                          >
                            {option.subtitle}
                          </span>
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="panel-copy">
                  <span className="font-semibold">
                    {activeRole?.title ?? "Patient"} workspace
                  </span>{" "}
                  is active. The dashboard layout stays the same while the
                  controls and permissions shift to match the role.
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => setDarkMode((current) => !current)}
                    className="btn-ghost shrink-0 px-4 py-3 text-sm"
                    title={
                      darkMode ? "Switch to light mode" : "Switch to dark mode"
                    }
                  >
                    {darkMode ? (
                      <svg
                        className="h-4 w-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <circle cx="12" cy="12" r="4" />
                        <path d="M12 2.5v2.2" />
                        <path d="M12 19.3v2.2" />
                        <path d="M4.9 4.9l1.6 1.6" />
                        <path d="M17.5 17.5l1.6 1.6" />
                        <path d="M2.5 12h2.2" />
                        <path d="M19.3 12h2.2" />
                        <path d="M4.9 19.1l1.6-1.6" />
                        <path d="M17.5 6.5l1.6-1.6" />
                      </svg>
                    ) : (
                      <svg
                        className="h-4 w-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M21 12.8A8.5 8.5 0 1111.2 3 6.5 6.5 0 0021 12.8z" />
                      </svg>
                    )}
                    <span>{darkMode ? "Light mode" : "Dark mode"}</span>
                  </button>

                  {walletState ? (
                    <div className="glass-inset flex items-center gap-3 rounded-full px-3 py-2">
                      <span className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-100">
                        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_18px_rgba(52,211,153,0.8)]" />
                        {formatAddress(walletState.address)}
                      </span>
                      <button
                        onClick={() => {
                          setWalletState(null);
                          setRole("patient");
                        }}
                        className="text-xs font-semibold text-rose-500 transition-colors hover:text-rose-400"
                      >
                        Disconnect
                      </button>
                    </div>
                  ) : (
                    <span className="surface-chip">Wallet not connected</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </header>

        <main>
          {!walletState ? (
            <WalletConnect onConnect={(state) => setWalletState(state)} />
          ) : (
            <>
              <div style={{ display: role === "patient" ? "block" : "none" }}>
                <PatientDashboard
                  signer={walletState.signer}
                  address={walletState.address}
                  contract={walletState.contract}
                />
              </div>
              <div style={{ display: role === "doctor" ? "block" : "none" }}>
                <DoctorDashboard
                  signer={walletState.signer}
                  address={walletState.address}
                  contract={walletState.contract}
                />
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;

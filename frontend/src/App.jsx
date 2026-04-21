import { useMemo, useState } from "react";
import {
  BrowserRouter,
  Link,
  NavLink,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import {
  Activity,
  ActivitySquare,
  BarChart3,
  Calendar,
  ChevronRight,
  Home,
  LogOut,
  QrCode,
  Settings,
  Shield,
  Stethoscope,
  UserRound,
  Wallet,
} from "lucide-react";

import { AddressPill } from "@/components/app/address-pill";
import WalletConnect from "./components/WalletConnect";
import DoctorDashboard from "./pages/DoctorDashboard";
import DoctorAnalytics from "./pages/DoctorAnalytics";
import PatientDashboard from "./pages/PatientDashboard";
import ClinicalPlanner from "./pages/ClinicalPlanner";

const NAV_ITEMS = [
  {
    to: "/patient",
    label: "Patient",
    description: "Manage records & access",
    icon: UserRound,
    children: [
      {
        to: "/patient/planner",
        label: "Clinical Planner",
        icon: Calendar,
      },
    ],
  },
  {
    to: "/doctor",
    label: "Doctor",
    description: "Scan & add records",
    icon: Stethoscope,
    children: [
      {
        to: "/doctor/analytics",
        label: "Analytics",
        icon: BarChart3,
      },
    ],
  },
];

const PAGE_META = {
  "/patient": {
    eyebrow: "Workspace",
    title: "Patient Overview",
    description: "Manage your medical records and grant doctor access.",
  },
  "/patient/planner": {
    eyebrow: "Patient",
    title: "Clinical Planner",
    description: "Manage your weekly schedule and appointments.",
  },
  "/doctor": {
    eyebrow: "Workspace",
    title: "Doctor Dashboard",
    description: "Scan patients and submit medical records.",
  },
  "/doctor/analytics": {
    eyebrow: "Doctor",
    title: "Analytics",
    description: "View your practice analytics and metrics.",
  },
};

function SidebarLogo() {
  return (
    <Link to="/" className="flex items-center gap-3 px-3 py-2 -mx-3">
      <div className="flex size-10 items-center justify-center rounded-xl shadow-lg" style={{ backgroundColor: '#317873', boxShadow: '0 10px 25px -5px rgba(34, 160, 91, 0.3)' }}>
        <Shield className="size-5 text-white" />
      </div>
      <div>
        <h1 className="text-lg font-bold tracking-tight">Netsanet</h1>
        <p className="text-xs text-slate-500">Medical Records</p>
      </div>
    </Link>
  );
}

function SidebarNav() {
  return (
    <nav className="space-y-1">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const hasChildren = item.children && item.children.length > 0;

        return (
          <div key={item.to}>
            <NavLink
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-full px-4 py-2.5 text-sm font-medium transition-all duration-200 ${
                  isActive && !location.pathname.includes('/analytics') && !location.pathname.includes('/planner')
                    ? "text-foreground"
                    : "text-slate-500 hover:bg-slate-100 hover:text-foreground"
                }`
              }
              style={({ isActive }) => {
                const isExactActive = isActive && !location.pathname.includes('/analytics') && !location.pathname.includes('/planner');
                return isExactActive ? { backgroundColor: '#E8F4EC', color: '#317873' } : {};
              }}
              end={!hasChildren}
            >
              {({ isActive }) => {
                const isExactActive = isActive && !location.pathname.includes('/analytics') && !location.pathname.includes('/planner');
                return (
                  <>
                    <Icon className="size-5" style={isExactActive ? { color: '#317873' } : {}} />
                    <span>{item.label}</span>
                  </>
                );
              }}
            </NavLink>
            {hasChildren && (
              <div className="ml-4 mt-1 space-y-1 border-l border-slate-200 pl-3">
                {item.children.map((child) => {
                  const ChildIcon = child.icon;
                  return (
                    <NavLink
                      key={child.to}
                      to={child.to}
                      className={({ isActive }) =>
                        `flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
                          isActive
                            ? "text-foreground"
                            : "text-slate-500 hover:bg-slate-100 hover:text-foreground"
                        }`
                      }
                      style={({ isActive }) => isActive ? { backgroundColor: '#E8F4EC', color: '#317873' } : {}}
                    >
                      {({ isActive }) => (
                        <>
                          <ChildIcon className="size-3.5" style={isActive ? { color: '#317873' } : {}} />
                          <span>{child.label}</span>
                        </>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}

function SidebarBottom({ walletState }) {
  return (
    <div className="space-y-4 pt-4 border-t border-slate-200">
      <div className="flex items-center gap-3 rounded-2xl p-3" style={{ backgroundColor: '#F1F5F9' }}>
        <div className="flex size-10 items-center justify-center rounded-xl" style={{ backgroundColor: '#E8F4EC' }}>
          <Wallet className="size-5" style={{ color: '#317873' }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium" style={{ color: '#8898AA' }}>
            {walletState ? "Wallet Connected" : "Connect Wallet"}
          </p>
          {walletState && (
            <p className="truncate text-sm font-semibold text-foreground">
              {walletState.address.slice(0, 6)}...{walletState.address.slice(-4)}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function DashboardSidebar({ walletState }) {
  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-slate-200 bg-white px-4 py-6">
      <div className="flex h-full flex-col">
        <SidebarLogo />
        <div className="mt-8 flex-1">
          <SidebarNav />
        </div>
        <SidebarBottom walletState={walletState} />
      </div>
    </aside>
  );
}

function TopBarSearch() {
  return (
    <div className="relative w-full max-w-md">
      <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2">
        <Activity className="size-4 text-slate-400" />
      </div>
      <input
        type="search"
        placeholder="Search patients, records..."
        className="w-full rounded-full border border-slate-200 bg-slate-50 py-2.5 pl-11 pr-4 text-sm outline-none transition-all placeholder:text-slate-400 focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20"
      />
    </div>
  );
}

function TopBarActions({ walletState, onDisconnect }) {
  return (
    <div className="flex items-center gap-3">
      <Link
        to="/doctor#qr-scan"
        className="btn-primary"
      >
        <QrCode className="size-4" />
        <span className="whitespace-nowrap">Scan QR</span>
      </Link>

      <button
        onClick={onDisconnect}
        className="btn-ghost"
      >
        Disconnect
      </button>

      {walletState && (
        <div className="hidden md:block">
          <AddressPill
            value={walletState.address}
            label="Connected"
            className="bg-muted/50"
          />
        </div>
      )}
    </div>
  );
}

function TopBar({ walletState, onDisconnect }) {
  const location = useLocation();
  const meta = useMemo(
    () => PAGE_META[location.pathname] ?? PAGE_META["/patient"],
    [location.pathname]
  );

  return (
    <header className="sticky top-0 z-30 flex flex-col gap-4 border-b border-border bg-card/80 px-6 py-4 backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          <span>{meta.eyebrow}</span>
          <ChevronRight className="size-3" />
          <span className="text-foreground">{meta.title}</span>
        </div>
        <h2 className="mt-1 text-2xl font-bold tracking-tight">{meta.title}</h2>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <TopBarSearch />
        <TopBarActions walletState={walletState} onDisconnect={onDisconnect} />
      </div>
    </header>
  );
}

function AppContentWrapper() {
  const [walletState, setWalletState] = useState(null);

  const handleDisconnect = () => {
    setWalletState(null);
  };

  return (
    <div className="flex min-h-screen">
      <DashboardSidebar walletState={walletState} />

      <div className="flex-1 pl-64">
        <TopBar walletState={walletState} onDisconnect={handleDisconnect} />

        <main className="p-6">
          {!walletState ? (
            <WalletConnect onConnect={(state) => setWalletState(state)} />
          ) : (
            <Routes>
              <Route path="/patient" element={
                <PatientDashboard signer={walletState.signer} address={walletState.address} contract={walletState.contract} />
              } />
              <Route path="/patient/planner" element={
                <ClinicalPlanner address={walletState.address} />
              } />
              <Route path="/doctor" element={
                <DoctorDashboard address={walletState.address} contract={walletState.contract} />
              } />
              <Route path="/doctor/analytics" element={
                <DoctorAnalytics address={walletState.address} contract={walletState.contract} />
              } />
              <Route path="*" element={
                <PatientDashboard signer={walletState.signer} address={walletState.address} contract={walletState.contract} />
              } />
            </Routes>
          )}
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-background font-sans">
        <AppContentWrapper />
      </div>
    </BrowserRouter>
  );
}

export default App;
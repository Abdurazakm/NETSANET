import { cn } from "@/lib/utils";

function shortenAddress(value) {
  if (!value || value.length < 12) return value;
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

export function AddressPill({ value, className, label }) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-600 shadow-sm",
        className
      )}
      title={value}
    >
      {label ? <span className="text-slate-400">{label}</span> : null}
      <span className="font-mono text-foreground">{shortenAddress(value)}</span>
    </div>
  );
}

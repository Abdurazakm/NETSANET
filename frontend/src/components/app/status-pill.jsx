import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const STATUS_STYLES = {
  active: "border-[#c4f0d7] bg-[#e9f8f0] text-[#0b8f5b]",
  expired: "border-[#f2dfbb] bg-[#fff8ec] text-[#b86a00]",
  revoked: "border-[#f5c2ca] bg-[#fff3f4] text-[#c83c51]",
  pending: "border-[#d8e6ff] bg-[#eef4ff] text-[#1047b6]",
  info: "border-[#d8e6ff] bg-[#eef4ff] text-[#1047b6]",
};

export function StatusPill({ status = "info", className, children }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]",
        STATUS_STYLES[status] ?? STATUS_STYLES.info,
        className
      )}
    >
      {children}
    </Badge>
  );
}

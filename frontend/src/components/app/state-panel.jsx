import {
  AlertCircleIcon,
  InboxIcon,
  LoaderCircleIcon,
  ShieldCheckIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

const ICONS = {
  loading: LoaderCircleIcon,
  empty: InboxIcon,
  error: AlertCircleIcon,
  success: ShieldCheckIcon,
};

const STYLES = {
  loading: "border-[#dce5f4] bg-[#f7f9fd] text-[#60708f]",
  empty: "border-dashed border-[#dce5f4] bg-[#f7f9fd] text-[#7b88a3]",
  error: "border-[#f2c0c7] bg-[#fff4f5] text-[#b42335]",
  success: "border-[#c4f0d7] bg-[#e9f8f0] text-[#0b8f5b]",
};

export function StatePanel({
  state = "empty",
  title,
  description,
  className,
  children,
}) {
  const Icon = ICONS[state] ?? ICONS.empty;

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border px-6 py-10 text-center",
        STYLES[state] ?? STYLES.empty,
        className
      )}
    >
      <div className="mb-4 rounded-full border border-current/15 bg-white p-3">
        <Icon
          className={cn(
            "size-5",
            state === "loading" ? "animate-spin" : "animate-none"
          )}
        />
      </div>
      {title ? (
        <p className="font-display text-base font-medium tracking-tight text-primary">
          {title}
        </p>
      ) : null}
      {description ? (
        <p className="mt-2 max-w-lg text-sm leading-6 text-current/85">
          {description}
        </p>
      ) : null}
      {children ? <div className="mt-4 w-full">{children}</div> : null}
    </div>
  );
}

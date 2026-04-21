import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function SectionCard({
  title,
  description,
  action,
  className,
  headerClassName,
  contentClassName,
  children,
}) {
  return (
    <Card
      className={cn(
        "glass-panel gap-0 border-[#dce5f4] bg-white py-0 shadow-[0_18px_55px_rgba(17,42,94,0.08)]",
        className
      )}
    >
      {(title || description || action) && (
        <CardHeader
          className={cn(
            "border-b border-[#e6edf8] px-5 py-4 sm:px-6",
            headerClassName
          )}
        >
          <div>
            {title ? (
              <CardTitle className="font-display text-base tracking-tight">
                {title}
              </CardTitle>
            ) : null}
            {description ? (
              <CardDescription className="mt-1 text-sm text-muted">
                {description}
              </CardDescription>
            ) : null}
          </div>
          {action ? <CardAction>{action}</CardAction> : null}
        </CardHeader>
      )}

      <CardContent className={cn("px-5 py-5 sm:px-6", contentClassName)}>
        {children}
      </CardContent>
    </Card>
  );
}

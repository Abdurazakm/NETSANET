import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";

function StatCard({ icon: Icon, label, value, trend, trendUp, trendLabel, className }) {
  const trendValue = trend || trendLabel;

  return (
    <div className={cn("card-flat hover-lift", className)}>
      {Icon && (
        <div className="stat-icon bg-primary/10">
          <Icon className="size-5 text-primary" />
        </div>
      )}
      <div className="stat-content">
        <p className="stat-label">{label}</p>
        <p className="stat-value">{value}</p>
        {trendValue && (
          <p className="mt-1 flex items-center gap-1 text-xs">
            <span className={cn(
              "flex items-center font-medium",
              trendUp ? "text-green-600" : "text-red-600"
            )}>
              {trendUp ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
              {trend}
            </span>
          </p>
        )}
      </div>
    </div>
  );
}

export { StatCard };

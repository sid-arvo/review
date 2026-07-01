import { cn } from "@/lib/utils";
import { ArrowDown, ArrowUp, Minus, type LucideIcon } from "lucide-react";

interface KpiCardProps {
  label: string;
  value: string;
  delta?: number; // positive = up, negative = down
  deltaLabel?: string;
  invertDeltaColor?: boolean; // when up is bad (e.g. negative sentiment volume)
  icon?: LucideIcon;
}

export function KpiCard({ label, value, delta, deltaLabel, invertDeltaColor, icon: Icon }: KpiCardProps) {
  const isUp = (delta ?? 0) > 0;
  const isFlat = !delta || Math.abs(delta) < 0.001;
  const good = invertDeltaColor ? !isUp : isUp;

  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        {Icon && <Icon className="size-4 text-muted-foreground" />}
      </div>
      <div className="mt-2 text-2xl font-semibold tracking-tight">{value}</div>
      {delta !== undefined && (
        <div
          className={cn(
            "mt-1 flex items-center gap-1 text-xs font-medium",
            isFlat ? "text-muted-foreground" : good ? "text-primary" : "text-destructive"
          )}
        >
          {isFlat ? <Minus className="size-3" /> : isUp ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />}
          {Math.abs(delta).toFixed(1)}
          {deltaLabel}
        </div>
      )}
    </div>
  );
}

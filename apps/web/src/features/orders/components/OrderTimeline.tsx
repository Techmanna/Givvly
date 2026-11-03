import { CheckCircle2, Circle, AlertTriangle } from "lucide-react";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { OrderStatus } from "../types";

const STANDARD_STEPS: Array<{ status: OrderStatus; label: string }> = [
  { status: "PENDING_PAYMENT", label: "Order placed" },
  { status: "CONFIRMED", label: "Payment confirmed" },
  { status: "PACKED", label: "Packed by vendor" },
  { status: "SHIPPED", label: "Out for delivery" },
  { status: "DELIVERED", label: "Delivered to recipient" },
];

export type OrderTimelineProps = {
  currentStatus: OrderStatus;
  timeline: Array<{ status: OrderStatus; at: string }>;
};

export function OrderTimeline({ currentStatus, timeline }: OrderTimelineProps) {
  const byStatus = new Map(timeline.map((t) => [t.status, t.at]));
  const currentIndex = STANDARD_STEPS.findIndex(
    (s) => s.status === currentStatus
  );

  return (
    <div className="space-y-4" aria-label="Order delivery timeline">
      {currentStatus === "DISPUTED" && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-xl border border-danger/30 bg-danger/10 p-3.5 text-sm text-danger"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-medium">Order under dispute review</p>
            {byStatus.get("DISPUTED") && (
              <p className="text-xs opacity-90">
                Opened {formatDate(byStatus.get("DISPUTED")!, "d MMM yyyy, h:mm a")}
              </p>
            )}
          </div>
        </div>
      )}

      <ol className="relative space-y-4">
        {STANDARD_STEPS.map((step, idx) => {
          const timestamp = byStatus.get(step.status);
          const isCompleted =
            Boolean(timestamp) ||
            (currentIndex >= 0 && idx <= currentIndex);
          const isCurrent = step.status === currentStatus;

          return (
            <li key={step.status} className="flex items-start gap-3">
              <div className="mt-0.5 flex flex-col items-center">
                {isCompleted ? (
                  <CheckCircle2
                    className={cn(
                      "h-5 w-5",
                      isCurrent ? "text-primary" : "text-success"
                    )}
                  />
                ) : (
                  <Circle className="h-5 w-5 text-border" />
                )}
              </div>
              <div className="flex-1">
                <p
                  className={cn(
                    "text-sm font-medium",
                    isCompleted ? "text-ink" : "text-ink-muted"
                  )}
                >
                  {step.label}
                </p>
                {timestamp ? (
                  <p className="text-xs text-ink-muted">
                    {formatDate(timestamp, "d MMM yyyy, h:mm a")}
                  </p>
                ) : (
                  <p className="text-xs text-ink-faint">Pending</p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

"use client";

import { Check, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { getNextValidOrderStatus } from "../schemas";
import { useUpdateVendorOrderStatus } from "../hooks/useVendor";
import type { OrderStatus } from "../types";

const VENDOR_STEPS: Array<{ status: OrderStatus; label: string }> = [
  { status: "CONFIRMED", label: "Confirmed" },
  { status: "PACKED", label: "Packed" },
  { status: "SHIPPED", label: "Shipped" },
  { status: "DELIVERED", label: "Delivered" },
];

export type StatusStepperProps = {
  orderId: string;
  currentStatus: OrderStatus;
};

export function StatusStepper({ orderId, currentStatus }: StatusStepperProps) {
  const statusMutation = useUpdateVendorOrderStatus();
  const nextValid = getNextValidOrderStatus(currentStatus);
  const currentIdx = VENDOR_STEPS.findIndex((s) => s.status === currentStatus);

  const handleAdvance = async (target: OrderStatus) => {
    try {
      await statusMutation.mutateAsync({ orderId, status: target });
      toast.success(`Order moved to ${target}`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update order status."
      );
    }
  };

  return (
    <div
      className="flex flex-wrap items-center gap-2"
      aria-label="Fulfillment status stepper"
    >
      {VENDOR_STEPS.map((step, idx) => {
        const isCompleted = currentIdx >= 0 && idx <= currentIdx;
        const isNextLegal = nextValid === step.status;

        return (
          <div key={step.status} className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant={
                isCompleted
                  ? "secondary"
                  : isNextLegal
                    ? "default"
                    : "outline"
              }
              disabled={!isNextLegal || statusMutation.isPending}
              onClick={() => handleAdvance(step.status)}
              className={cn(
                "gap-1.5",
                isCompleted && "border-success/30 bg-success/10 text-success"
              )}
            >
              {isCompleted && <Check className="h-3.5 w-3.5" />}
              <span>{step.label}</span>
            </Button>
            {idx < VENDOR_STEPS.length - 1 && (
              <ArrowRight className="h-3.5 w-3.5 text-ink-faint" />
            )}
          </div>
        );
      })}
    </div>
  );
}


"use client";

import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { disputeFormSchema } from "../schemas";
import { useSubmitOrderDispute } from "../hooks/useOrders";
import type { DisputeFormInput, DisputeType } from "../types";

const DISPUTE_TYPE_LABELS: Record<DisputeType, string> = {
  DAMAGED: "Item arrived damaged",
  WRONG_ITEM: "Wrong item delivered",
  NOT_DELIVERED: "Order not delivered",
  OTHER: "Other issue",
};

export type DisputeFormProps = {
  orderId: string;
  onSubmitted?: () => void;
};

export function DisputeForm({ orderId, onSubmitted }: DisputeFormProps) {
  const [submitted, setSubmitted] = useState(false);
  const disputeMutation = useSubmitOrderDispute(orderId);

  const form = useForm<DisputeFormInput>({
    resolver: zodResolver(disputeFormSchema),
    defaultValues: {
      type: "DAMAGED",
      description: "",
    },
  });

  const selectedType =
    useWatch({ control: form.control, name: "type" }) ?? "DAMAGED";

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await disputeMutation.mutateAsync(values);
      setSubmitted(true);
      toast.success("Dispute submitted. Our support team will review shortly.");
      onSubmitted?.();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not open dispute."
      );
    }
  });

  if (submitted) {
    return (
      <div
        role="status"
        className="rounded-xl border border-warning/30 bg-warning/10 p-4 text-sm text-ink"
      >
        <p className="font-medium">Dispute submitted</p>
        <p className="mt-1 text-xs text-ink-muted">
          We have notified the vendor and Givvly concierge team. We will update
          your order timeline within 24 hours.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <div className="space-y-1.5">
        <Label htmlFor={`dispute-type-${orderId}`}>Issue type</Label>
        <Select
          value={selectedType}
          onValueChange={(v) =>
            form.setValue("type", v as DisputeType, { shouldValidate: true })
          }
        >
          <SelectTrigger id={`dispute-type-${orderId}`}>
            <SelectValue placeholder="Choose issue type" />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(DISPUTE_TYPE_LABELS) as DisputeType[]).map((type) => (
              <SelectItem key={type} value={type}>
                {DISPUTE_TYPE_LABELS[type]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {form.formState.errors.type && (
          <p role="alert" className="text-xs text-danger">
            {form.formState.errors.type.message}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`dispute-desc-${orderId}`}>
          Describe what happened
        </Label>
        <Textarea
          id={`dispute-desc-${orderId}`}
          rows={3}
          placeholder="Please provide details (minimum 20 characters)..."
          {...form.register("description")}
        />
        {form.formState.errors.description && (
          <p role="alert" className="text-xs text-danger">
            {form.formState.errors.description.message}
          </p>
        )}
      </div>

      <Button
        type="submit"
        variant="destructive"
        size="sm"
        disabled={disputeMutation.isPending}
      >
        {disputeMutation.isPending ? "Submitting..." : "Open dispute"}
      </Button>
    </form>
  );
}


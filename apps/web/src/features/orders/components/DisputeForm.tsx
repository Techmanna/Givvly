"use client";

import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ImagePlus, X } from "lucide-react";
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
import { uploadMediaFile } from "@/features/events/api";
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
  const [attachments, setAttachments] = useState<
    Array<{ name: string; url: string; kind: "IMAGE" | "VIDEO" }>
  >([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const disputeMutation = useSubmitOrderDispute(orderId);

  const form = useForm<DisputeFormInput>({
    resolver: zodResolver(disputeFormSchema),
    defaultValues: {
      type: "DAMAGED",
      description: "",
      photos: [],
    },
  });

  const selectedType =
    useWatch({ control: form.control, name: "type" }) ?? "DAMAGED";

  const handleEvidenceFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setUploadError(null);
    const files = Array.from(fileList);
    if (attachments.length + files.length > 5) {
      setUploadError("You can attach up to 5 photos or videos.");
      return;
    }

    setIsUploading(true);
    try {
      const nextItems: Array<{
        name: string;
        url: string;
        kind: "IMAGE" | "VIDEO";
      }> = [];
      for (const file of files) {
        const uploaded = await uploadMediaFile(file, "DISPUTE_PHOTO");
        nextItems.push({
          name: file.name,
          url: uploaded.url,
          kind: uploaded.kind,
        });
      }
      const updated = [...attachments, ...nextItems];
      setAttachments(updated);
      form.setValue(
        "photos",
        updated.map((item) => item.url),
        { shouldValidate: true }
      );
    } catch (err) {
      setUploadError(
        err instanceof Error
          ? err.message
          : "Could not upload evidence file. Please try again."
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveEvidence = (index: number) => {
    const updated = attachments.filter((_, idx) => idx !== index);
    setAttachments(updated);
    form.setValue(
      "photos",
      updated.map((item) => item.url),
      { shouldValidate: true }
    );
  };

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await disputeMutation.mutateAsync({
        ...values,
        ...(attachments.length > 0
          ? { photos: attachments.map((item) => item.url) }
          : {}),
      });
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

      <div className="space-y-2">
        <Label
          htmlFor={`dispute-evidence-${orderId}`}
          className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium text-primary hover:underline"
        >
          <ImagePlus className="h-4 w-4" aria-hidden="true" />
          <span>
            Attach evidence photos or videos ({attachments.length}/5)
          </span>
        </Label>
        <input
          id={`dispute-evidence-${orderId}`}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
          multiple
          disabled={isUploading || attachments.length >= 5}
          className="sr-only"
          onChange={(e) => {
            void handleEvidenceFiles(e.target.files);
            e.currentTarget.value = "";
          }}
        />
        {uploadError ? (
          <p role="alert" className="text-xs text-danger">
            {uploadError}
          </p>
        ) : null}
        {attachments.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {attachments.map((item, idx) => (
              <div
                key={`${item.name}_${idx}`}
                className="flex items-center gap-1.5 rounded-control border border-border bg-muted/40 px-2.5 py-1 text-xs"
              >
                <span className="max-w-36 truncate text-foreground">
                  {item.name}
                </span>
                <button
                  type="button"
                  aria-label={`Remove ${item.name}`}
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => handleRemoveEvidence(idx)}
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <Button
        type="submit"
        variant="destructive"
        size="sm"
        disabled={disputeMutation.isPending || isUploading}
      >
        {isUploading
          ? "Uploading..."
          : disputeMutation.isPending
            ? "Submitting..."
            : "Open dispute"}
      </Button>
    </form>
  );
}


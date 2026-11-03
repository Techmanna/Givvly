"use client";

import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useReportContentMutation } from "../hooks/useWall";
import { reportContentSchema } from "../schemas";
import type { ReportContentInput, ReportReason } from "../types";

export type ReportDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  postId: string;
  authorName: string;
};

const REASON_LABELS: Record<ReportReason, string> = {
  SPAM: "Spam or unwanted advertising",
  HARASSMENT: "Harassment or abusive language",
  INAPPROPRIATE: "Inappropriate content",
  SCAM: "Suspicious or scam content",
  OTHER: "Other concern",
};

export function ReportDialog({
  open,
  onOpenChange,
  postId,
  authorName,
}: ReportDialogProps) {
  const reportMutation = useReportContentMutation();

  const form = useForm<ReportContentInput>({
    resolver: zodResolver(reportContentSchema),
    defaultValues: {
      reason: "INAPPROPRIATE",
      note: "",
    },
  });

  const selectedReason = useWatch({ control: form.control, name: "reason" });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await reportMutation.mutateAsync({
        targetType: "WALL_POST",
        targetId: postId,
        reason: values.reason,
        note: values.note?.trim() || undefined,
      });
      toast.success("Report submitted. Thank you for helping keep this space safe.");
      form.reset();
      onOpenChange(false);
    } catch {
      toast.error("Could not submit your report. Please try again.");
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Report message from {authorName}</DialogTitle>
          <DialogDescription>
            Let us know why this message should be reviewed.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="report-reason">Reason</Label>
            <Select
              value={selectedReason}
              onValueChange={(val) =>
                form.setValue("reason", val as ReportReason, {
                  shouldValidate: true,
                })
              }
            >
              <SelectTrigger id="report-reason">
                <SelectValue placeholder="Choose a reason" />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(REASON_LABELS) as ReportReason[]).map((key) => (
                  <SelectItem key={key} value={key}>
                    {REASON_LABELS[key]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.reason ? (
              <p className="text-xs text-destructive" role="alert">
                {form.formState.errors.reason.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="report-note">Additional details (optional)</Label>
            <Textarea
              id="report-note"
              rows={3}
              maxLength={300}
              {...form.register("note")}
              aria-describedby={
                form.formState.errors.note ? "report-note-error" : undefined
              }
            />
            {form.formState.errors.note ? (
              <p
                id="report-note-error"
                className="text-xs text-destructive"
                role="alert"
              >
                {form.formState.errors.note.message}
              </p>
            ) : null}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={reportMutation.isPending}>
              {reportMutation.isPending ? "Sending..." : "Submit report"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}


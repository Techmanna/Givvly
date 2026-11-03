"use client";

import { CheckCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatDate } from "@/lib/format";
import { useResolveModerationItem } from "../hooks/useAdmin";
import type { AdminModerationItem } from "../types";

export type ModerationCardProps = {
  item: AdminModerationItem;
};

export function ModerationCard({ item }: ModerationCardProps) {
  const resolveMutation = useResolveModerationItem();

  const handleAction = async (status: "APPROVED" | "REMOVED") => {
    try {
      await resolveMutation.mutateAsync({ itemId: item.id, status });
      toast.success(
        status === "APPROVED" ? "Post approved" : "Post removed from wall"
      );
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not update moderation item."
      );
    }
  };

  return (
    <Card>
      <CardContent className="flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-start">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={item.status} />
            <span className="text-xs font-medium text-ink">
              {item.eventName}
            </span>
            <span className="text-xs text-ink-faint">
              • {formatDate(item.createdAt, "d MMM yyyy, h:mm a")}
            </span>
          </div>
          <p className="text-sm text-ink">
            <span className="font-medium">{item.authorName}:</span>{" "}
            {item.text ?? "(Media attachment)"}
          </p>
          {item.reason && (
            <p className="text-xs text-warning">Flag reason: {item.reason}</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={item.status !== "PENDING" || resolveMutation.isPending}
            onClick={() => handleAction("APPROVED")}
            className="gap-1.5"
          >
            <CheckCircle className="h-3.5 w-3.5" />
            Approve
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            disabled={item.status === "REMOVED" || resolveMutation.isPending}
            onClick={() => handleAction("REMOVED")}
            className="gap-1.5"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Remove
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

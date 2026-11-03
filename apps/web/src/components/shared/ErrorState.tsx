"use client";

import { AlertCircle, Copy, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import { cn } from "@/lib/cn";

export type ErrorStateProps = {
  title?: string;
  description?: string;
  errorId?: string;
  onRetry?: () => void;
  className?: string;
};

export function ErrorState({
  title = "Something went wrong",
  description = "We couldn't load this page. Please try again.",
  errorId,
  onRetry,
  className,
}: ErrorStateProps) {
  const handleCopyErrorId = async () => {
    if (!errorId) return;
    try {
      await navigator.clipboard.writeText(errorId);
      toast.success("Error ID copied to clipboard");
    } catch {
      toast.error("Could not copy error ID");
    }
  };

  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center rounded-card border border-border bg-card p-8 text-center",
        className
      )}
    >
      <AlertCircle className="h-10 w-10 text-destructive" aria-hidden="true" />
      <h2 className="mt-4 font-heading text-xl font-semibold text-foreground">
        {title}
      </h2>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        {description}
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        {onRetry ? (
          <Button onClick={onRetry} variant="default">
            <RefreshCw className="h-4 w-4" />
            Try again
          </Button>
        ) : null}
        {errorId ? (
          <Button
            onClick={handleCopyErrorId}
            variant="outline"
            size="sm"
            aria-label={`Copy error id ${errorId}`}
          >
            <Copy className="h-3.5 w-3.5" />
            Copy error id
          </Button>
        ) : null}
      </div>
    </div>
  );
}


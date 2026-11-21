"use client";

import * as React from "react";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import { cn } from "@/lib/cn";

export type FeedbackBannerValue = {
  type: "success" | "error" | "info";
  text: string;
};

export interface FeedbackBannerProps {
  feedback: FeedbackBannerValue | null | undefined;
  onDismiss?: () => void;
  autoScroll?: boolean;
  className?: string;
}

/**
 * Reusable status/alert banner that automatically scrolls into view smoothly
 * whenever a new feedback message is displayed.
 */
export function FeedbackBanner({
  feedback,
  onDismiss,
  autoScroll = true,
  className,
}: FeedbackBannerProps) {
  const bannerRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (!autoScroll || !feedback?.text) return;
    const frame = window.requestAnimationFrame(() => {
      bannerRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [autoScroll, feedback?.type, feedback?.text]);

  if (!feedback?.text) {
    return null;
  }

  const Icon =
    feedback.type === "success"
      ? CheckCircle2
      : feedback.type === "info"
      ? Info
      : AlertCircle;

  return (
    <div
      ref={bannerRef}
      role={feedback.type === "error" ? "alert" : "status"}
      aria-live="polite"
      className={cn(
        "scroll-mt-24 flex items-start justify-between gap-3 rounded-xl border px-4 py-3 text-sm font-medium",
        feedback.type === "success" &&
          "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-700",
        feedback.type === "error" &&
          "border-destructive/30 bg-destructive/10 text-destructive",
        feedback.type === "info" &&
          "border-primary/30 bg-primary/10 text-foreground",
        className
      )}
    >
      <div className="flex items-start gap-2.5">
        <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <span>{feedback.text}</span>
      </div>
      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss message"
          className="shrink-0 rounded-md p-0.5 opacity-70 transition-opacity hover:opacity-100"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}

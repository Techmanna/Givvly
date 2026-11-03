"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/shared/ErrorState";
import { reportError } from "@/lib/analytics";

export default function EventThankYouError({
  error,
  reset,
}: {
  error: Error & { digest?: string; requestId?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportError(error, {
      digest: error.digest,
      requestId: error.requestId,
      route: "/events/[id]/thank-you",
    });
  }, [error]);

  return (
    <ErrorState errorId={error.requestId ?? error.digest} onRetry={reset} />
  );
}


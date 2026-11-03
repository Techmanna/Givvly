"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/shared/ErrorState";
import { reportError } from "@/lib/analytics";

export default function AuthError({
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
      route: "(auth)",
    });
  }, [error]);

  return (
    <ErrorState
      errorId={error.requestId ?? error.digest}
      onRetry={reset}
    />
  );
}


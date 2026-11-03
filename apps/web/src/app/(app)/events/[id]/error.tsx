"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/shared/ErrorState";
import { reportError } from "@/lib/analytics";

export default function EventDetailError({
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
      route: "/events/[id]",
    });
  }, [error]);

  return (
    <main className="mx-auto w-full max-w-5xl p-4 sm:p-6">
      <ErrorState errorId={error.requestId ?? error.digest} onRetry={reset} />
    </main>
  );
}


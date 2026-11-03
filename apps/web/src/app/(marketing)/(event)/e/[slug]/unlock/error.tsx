"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/shared/ErrorState";
import { reportError } from "@/lib/analytics";

export default function EventUnlockError({
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
      route: "/e/[slug]/unlock",
    });
  }, [error]);

  return (
    <main className="flex min-h-screen flex-1 items-center justify-center p-4">
      <ErrorState errorId={error.requestId ?? error.digest} onRetry={reset} />
    </main>
  );
}


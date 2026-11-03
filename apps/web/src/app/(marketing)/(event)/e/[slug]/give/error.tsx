"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/shared/ErrorState";
import { reportError } from "@/lib/analytics";

export default function PublicGiveError({
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
      route: "/e/[slug]/give",
    });
  }, [error]);

  return (
    <main className="mx-auto w-full max-w-lg px-4 py-8">
      <ErrorState errorId={error.requestId ?? error.digest} onRetry={reset} />
    </main>
  );
}


"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/shared/ErrorState";
import { reportError } from "@/lib/analytics";

export default function PublicGiveSuccessError({
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
      route: "/e/[slug]/give/success",
    });
  }, [error]);

  return (
    <main className="mx-auto max-w-lg px-4 py-12">
      <ErrorState errorId={error.requestId ?? error.digest} onRetry={reset} />
    </main>
  );
}


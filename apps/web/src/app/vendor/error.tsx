"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/shared/ErrorState";
import { reportError } from "@/lib/analytics";

export default function VendorError({
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
      route: "vendor",
    });
  }, [error]);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 items-center justify-center p-6">
      <ErrorState errorId={error.requestId ?? error.digest} onRetry={reset} />
    </div>
  );
}


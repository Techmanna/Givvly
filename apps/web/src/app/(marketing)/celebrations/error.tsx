"use client";

import { ErrorState } from "@/components/shared/ErrorState";

export default function CelebrationsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <ErrorState
        title="Unable to load live celebrations"
        description={
          error.message ||
          "We couldn't load the live celebrations directory right now."
        }
        onRetry={reset}
      />
    </div>
  );
}

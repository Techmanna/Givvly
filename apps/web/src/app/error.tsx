"use client";

import { Button } from "@/components/ui/button";

export default function RootError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main
      role="alert"
      className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center px-4 text-center"
    >
      <h1 className="font-display text-2xl font-semibold text-ink">
        Something went wrong
      </h1>
      <p className="mt-2 text-sm text-ink-muted">
        An unexpected error occurred while loading this page.
      </p>
      <Button onClick={reset} className="mt-6">
        Try again
      </Button>
    </main>
  );
}

"use client";

import { Button } from "@/components/ui/button";

export default function GiftsCatalogError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div
      role="alert"
      className="rounded-2xl border border-border bg-surface p-8 text-center"
    >
      <p className="font-display text-lg font-medium text-ink">
        Could not load gift catalog
      </p>
      <Button onClick={reset} variant="outline" size="sm" className="mt-4">
        Try again
      </Button>
    </div>
  );
}


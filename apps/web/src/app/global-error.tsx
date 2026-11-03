"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col items-center justify-center bg-background p-6 text-center text-foreground">
        <h1 className="text-2xl font-semibold">
          Givvly encountered a critical error
        </h1>
        <p className="mt-2 text-sm opacity-80">
          Please refresh the page to continue.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Reload application
        </button>
      </body>
    </html>
  );
}

import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function RootNotFound() {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center px-4 text-center">
      <p className="font-mono text-xs uppercase tracking-widest text-primary">
        404 • Page Not Found
      </p>
      <h1 className="mt-2 font-display text-3xl font-semibold text-ink">
        We couldn&apos;t find that celebration
      </h1>
      <p className="mt-2 text-sm text-ink-muted">
        The link may have expired or the event slug may have changed.
      </p>
      <div className="mt-6 flex gap-3">
        <Button asChild>
          <Link href="/">Go Home</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/gifts">Browse Gifts</Link>
        </Button>
      </div>
    </main>
  );
}

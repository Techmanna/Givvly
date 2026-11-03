import { Skeleton } from "@/components/ui/skeleton";

export default function EventUnlockLoading() {
  return (
    <main className="flex min-h-screen flex-1 items-center justify-center p-4">
      <Skeleton className="h-64 w-full max-w-md rounded-card" />
    </main>
  );
}


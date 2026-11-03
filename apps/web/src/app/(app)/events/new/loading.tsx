import { Skeleton } from "@/components/ui/skeleton";

export default function NewEventLoading() {
  return (
    <main className="mx-auto w-full max-w-3xl space-y-6 p-4 sm:p-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-80 w-full rounded-card" />
    </main>
  );
}


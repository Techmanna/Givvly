import { Skeleton } from "@/components/ui/skeleton";

export default function RootLoading() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 p-6">
      <Skeleton className="h-10 w-48" />
      <Skeleton className="h-64 w-full rounded-card" />
    </main>
  );
}


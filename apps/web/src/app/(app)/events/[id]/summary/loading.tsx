import { Skeleton } from "@/components/ui/skeleton";

export default function EventSummaryLoading() {
  return (
    <div className="space-y-4" aria-busy="true">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-28 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}


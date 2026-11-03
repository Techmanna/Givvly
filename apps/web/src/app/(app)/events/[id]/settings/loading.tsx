import { Skeleton } from "@/components/ui/skeleton";

export default function EventSettingsLoading() {
  return (
    <div className="space-y-4" aria-busy="true">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-72 w-full" />
    </div>
  );
}


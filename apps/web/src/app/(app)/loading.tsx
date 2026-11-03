import { Skeleton } from "@/components/ui/skeleton";

export default function AppAreaLoading() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 p-6">
      <Skeleton className="h-9 w-48" />
      <Skeleton className="h-48 w-full rounded-card" />
    </div>
  );
}


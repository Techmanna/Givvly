import { Skeleton } from "@/components/ui/skeleton";

export default function CelebrationsLoading() {
  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-12 sm:px-6 sm:py-16">
      <Skeleton className="h-64 w-full rounded-[2rem]" />
      <div className="grid grid-cols-1 gap-7 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-[430px] rounded-[1.75rem]" />
        ))}
      </div>
    </div>
  );
}

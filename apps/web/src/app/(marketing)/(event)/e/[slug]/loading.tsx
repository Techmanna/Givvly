import { Skeleton } from "@/components/ui/skeleton";

export default function PublicEventLoading() {
  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6">
      <Skeleton className="aspect-[2/1] w-full rounded-card" />
      <Skeleton className="h-10 w-72" />
      <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
        <Skeleton className="h-64 w-full rounded-card md:col-span-7" />
        <Skeleton className="h-64 w-full rounded-card md:col-span-5" />
      </div>
    </main>
  );
}


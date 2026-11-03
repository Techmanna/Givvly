import { Skeleton } from "@/components/ui/skeleton";

export default function PayoutSetupLoading() {
  return (
    <main className="mx-auto w-full max-w-2xl space-y-6 p-4 sm:p-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-72 w-full rounded-card" />
    </main>
  );
}


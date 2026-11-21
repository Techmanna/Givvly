import { Skeleton } from "@/components/ui/skeleton";

export default function AccountNotificationsLoading() {
  return (
    <main
      className="mx-auto w-full max-w-3xl space-y-4 "
      aria-busy="true"
    >
      <Skeleton className="h-10 w-48" />
      <Skeleton className="h-48 w-full" />
      <Skeleton className="h-32 w-full" />
    </main>
  );
}


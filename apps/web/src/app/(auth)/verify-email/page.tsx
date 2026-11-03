import { Suspense } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { VerifyEmailView } from "@/features/auth";

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; next?: string }>;
}) {
  const { token, next } = await searchParams;

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle>Email verification</CardTitle>
        <CardDescription>
          Confirming your email address for Givvly
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Suspense fallback={<Skeleton className="h-32 w-full" />}>
          <VerifyEmailView token={token} nextPath={next} />
        </Suspense>
      </CardContent>
    </Card>
  );
}


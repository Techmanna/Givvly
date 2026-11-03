import Link from "next/link";
import { Suspense } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ResetPasswordForm } from "@/features/auth";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle>Choose a new password</CardTitle>
        <CardDescription>
          Enter a new password for your Givvly account
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Suspense fallback={<Skeleton className="h-48 w-full" />}>
          <ResetPasswordForm token={token ?? ""} />
        </Suspense>
      </CardContent>
      <CardFooter className="justify-center border-t border-border pt-4">
        <Link
          href="/login"
          className="text-sm font-medium text-primary hover:underline"
        >
          Back to sign in
        </Link>
      </CardFooter>
    </Card>
  );
}


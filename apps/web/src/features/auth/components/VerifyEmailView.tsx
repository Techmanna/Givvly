"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { sanitizeNextPath } from "@/lib/format";
import { ApiClientError } from "@/lib/api-client";
import { useVerifyEmailMutation } from "../hooks/useAuth";

export type VerifyEmailViewProps = {
  token?: string | null;
  nextPath?: string | null;
};

export function VerifyEmailView({ token, nextPath }: VerifyEmailViewProps) {
  const router = useRouter();
  const safeNext = sanitizeNextPath(nextPath, "/dashboard");
  const verifyMutation = useVerifyEmailMutation();
  const hasTriggeredRef = React.useRef(false);

  React.useEffect(() => {
    if (!token || hasTriggeredRef.current) return;
    hasTriggeredRef.current = true;

    verifyMutation
      .mutateAsync({ token })
      .then(() => {
        window.setTimeout(() => {
          router.push(safeNext);
        }, 1200);
      })
      .catch(() => {
        // Error displayed in UI below
      });
  }, [token, safeNext, router, verifyMutation]);

  if (!token) {
    return (
      <div role="alert" className="space-y-4 text-center">
        <AlertCircle className="mx-auto h-10 w-10 text-destructive" aria-hidden="true" />
        <h2 className="font-heading text-xl font-semibold text-foreground">
          Invalid verification link
        </h2>
        <p className="text-sm text-muted-foreground">
          The verification link is missing a token. Please check the link in your email.
        </p>
        <Button asChild variant="outline" className="w-full">
          <Link href="/login">Go to sign in</Link>
        </Button>
      </div>
    );
  }

  if (verifyMutation.isPending) {
    return (
      <div className="space-y-3 py-6 text-center" aria-live="polite">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" aria-hidden="true" />
        <p className="text-sm font-medium text-foreground">
          Verifying your email address...
        </p>
      </div>
    );
  }

  if (verifyMutation.isError) {
    const errMessage =
      verifyMutation.error instanceof ApiClientError
        ? verifyMutation.error.message
        : "This verification link has expired or is invalid.";

    return (
      <div role="alert" className="space-y-4 text-center">
        <AlertCircle className="mx-auto h-10 w-10 text-destructive" aria-hidden="true" />
        <h2 className="font-heading text-xl font-semibold text-foreground">
          Verification failed
        </h2>
        <p className="text-sm text-muted-foreground">{errMessage}</p>
        <div className="flex flex-col gap-2">
          <Button
            type="button"
            onClick={() => verifyMutation.mutate({ token })}
            className="w-full"
          >
            Try again
          </Button>
          <Button asChild variant="outline" className="w-full">
            <Link href="/login">Back to sign in</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 text-center" aria-live="polite">
      <CheckCircle2 className="mx-auto h-10 w-10 text-success" aria-hidden="true" />
      <h2 className="font-heading text-xl font-semibold text-foreground">
        Email verified
      </h2>
      <p className="text-sm text-muted-foreground">
        Your email has been verified. Redirecting you now...
      </p>
      <Button asChild className="w-full">
        <Link href={safeNext}>Continue</Link>
      </Button>
    </div>
  );
}


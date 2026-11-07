"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CopyButton } from "@/components/shared/CopyButton";
import { ErrorState } from "@/components/shared/ErrorState";
import { Money } from "@/components/shared/Money";
import { formatDate } from "@/lib/format";
import { useAuthStore } from "@/stores/auth-store";
import { useGiveDraftStore } from "@/stores/give-draft-store";
import { usePaymentStatusQuery } from "../hooks/useGifts";
import { giftKeys } from "../keys";

export type GiveReceiptViewProps = {
  slug: string;
  eventName: string;
  ownerFirstName: string;
  reference: string | null;
};

export function GiveReceiptView({
  slug,
  eventName,
  ownerFirstName,
  reference,
}: GiveReceiptViewProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const authStatus = useAuthStore((s) => s.status);
  const clearGiveDraft = useGiveDraftStore((s) => s.clearGiveDraft);
  const rotateIdempotencyKey = useGiveDraftStore((s) => s.rotateIdempotencyKey);

  const [timedOut, setTimedOut] = useState(false);
  const handledSuccessRef = useRef(false);

  const paymentQuery = usePaymentStatusQuery(reference, !timedOut);
  const payment = paymentQuery.data;

  // Stop polling after 60 seconds if still pending (Section 6.1 & 9.F4)
  useEffect(() => {
    if (!reference) return;
    const timer = window.setTimeout(() => {
      setTimedOut(true);
    }, 60_000);
    return () => window.clearTimeout(timer);
  }, [reference]);

  // On SUCCESS: clear give draft and invalidate wall + owner feed (Section 9.F4)
  useEffect(() => {
    if (payment?.status === "SUCCESS" && !handledSuccessRef.current) {
      handledSuccessRef.current = true;
      clearGiveDraft(slug);
      queryClient.invalidateQueries({ queryKey: ["wall", "public", slug] });
      queryClient.invalidateQueries({ queryKey: giftKeys.all });
      queryClient.invalidateQueries({ queryKey: ["events"] });
    }
  }, [clearGiveDraft, payment?.status, queryClient, slug]);

  if (!reference) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12">
        <ErrorState
          title="Missing payment reference"
          description="We could not find a payment reference to verify."
          onRetry={() => router.push(`/e/${slug}/give`)}
        />
      </div>
    );
  }

  if (paymentQuery.isError) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12">
        <ErrorState
          title="Could not check payment status"
          description="Check your connection and try again."
          onRetry={() => paymentQuery.refetch()}
        />
      </div>
    );
  }

  // Still polling (<60s)
  if (
    !payment ||
    (!timedOut &&
      (payment.status === "PENDING" ||
        (payment.status as string) === "INITIATED"))
  ) {
    return (
      <div
        className="mx-auto max-w-lg px-4 py-12"
        role="status"
        aria-live="polite"
      >
        <Card>
          <CardContent className="flex flex-col items-center space-y-4 py-12 text-center">
            <Loader2
              className="h-10 w-10 animate-spin text-primary"
              aria-hidden="true"
            />
            <div className="space-y-1">
              <h1 className="font-heading text-xl font-semibold text-foreground">
                Confirming your payment
              </h1>
              <p className="text-sm text-muted-foreground">
                Hold on a moment while we verify reference{" "}
                <span className="font-mono font-medium text-foreground">
                  {reference}
                </span>
                .
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Pending beyond 60 seconds (Section 9.F4)
  if (
    payment.status === "PENDING" ||
    (payment.status as string) === "INITIATED"
  ) {
    return (
      <div
        className="mx-auto max-w-lg px-4 py-12"
        role="status"
        aria-live="polite"
      >
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-warning/15 text-warning">
              <Clock className="h-6 w-6" aria-hidden="true" />
            </div>
            <CardTitle>We will email you once it is confirmed</CardTitle>
            <CardDescription>
              Your bank is still processing this transaction. Keep your
              reference below for your records.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-control border border-border bg-muted/40 p-3 text-xs">
              <span className="text-muted-foreground">Reference</span>
              <div className="flex items-center gap-2">
                <span className="font-mono font-semibold text-foreground">
                  {payment.reference || reference}
                </span>
                <CopyButton
                  value={payment.reference || reference}
                  label="Copy"
                  size="sm"
                />
              </div>
            </div>
            <Button asChild className="w-full" variant="outline">
              <Link href={`/e/${slug}`}>
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                <span>Back to {eventName}</span>
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Payment FAILED (Section 9.F4 & 10.2)
  if (payment.status === "FAILED") {
    return (
      <div
        className="mx-auto max-w-lg px-4 py-12"
        role="alert"
        aria-live="assertive"
      >
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/15 text-destructive">
              <AlertTriangle className="h-6 w-6" aria-hidden="true" />
            </div>
            <CardTitle>Payment was not completed</CardTitle>
            <CardDescription>
              Your card or bank declined or cancelled the payment (Reference:{" "}
              {payment.reference}). No funds were settled.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row">
            <Button
              type="button"
              className="flex-1"
              onClick={() => {
                rotateIdempotencyKey();
                router.push(`/e/${slug}/give`);
              }}
            >
              Try again
            </Button>
            <Button asChild variant="outline" className="flex-1">
              <Link href={`/e/${slug}`}>Back to event</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Payment SUCCESS
  return (
    <div
      className="mx-auto max-w-lg space-y-6 px-4 py-10"
      role="status"
      aria-live="polite"
    >
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-success/15 text-success">
            <CheckCircle2 className="h-7 w-7" aria-hidden="true" />
          </div>
          <CardTitle className="text-2xl">
            Thank you for celebrating {ownerFirstName}!
          </CardTitle>
          <CardDescription>
            Your gift for {eventName} has been confirmed.
          </CardDescription>
        </CardHeader>

        {(() => {
          const serviceFeeKobo = payment.serviceFeeKobo ?? (payment as any).feeKobo ?? 0;
          const totalKobo =
            payment.totalKobo ?? payment.amountKobo ?? (payment as any).totalKobo ?? 0;
          const giftAmountKobo =
            payment.amountKobo && payment.totalKobo && payment.amountKobo !== payment.totalKobo
              ? payment.amountKobo
              : Math.max(0, totalKobo - serviceFeeKobo);
          const paymentDate =
            payment.createdAt || (payment as any).paidAt || new Date().toISOString();

          return (
            <CardContent className="space-y-6">
              <div className="space-y-2.5 rounded-card border border-border bg-muted/40 p-4 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Gift amount</span>
                  <Money
                    amountKobo={giftAmountKobo}
                    className="font-semibold text-foreground"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Service fee</span>
                  <Money
                    amountKobo={serviceFeeKobo}
                    className="text-foreground"
                  />
                </div>
                <div className="flex items-center justify-between border-t border-border pt-2 font-semibold">
                  <span className="text-foreground">Total paid</span>
                  <Money amountKobo={totalKobo} className="text-primary" />
                </div>
                <div className="flex items-center justify-between pt-1 text-xs">
                  <span className="text-muted-foreground">From</span>
                  <span className="font-medium text-foreground">
                    {payment.anonymous
                      ? "Anonymous"
                      : (payment.giverName ?? "Guest")}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Date</span>
                  <span className="text-foreground">
                    {formatDate(paymentDate, "d MMM yyyy, h:mm a")}
                  </span>
                </div>
                <div className="flex items-center justify-between border-t border-border pt-2 text-xs">
                  <span className="text-muted-foreground">Payment reference</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-semibold text-foreground">
                      {payment.reference}
                    </span>
                    <CopyButton
                      value={payment.reference}
                      label="Copy"
                      size="sm"
                    />
                  </div>
                </div>
              </div>

              {payment.message ? (
                <div className="rounded-control border border-border bg-card p-3 text-xs">
                  <p className="font-medium text-muted-foreground">Your wish:</p>
                  <p className="mt-1 italic text-foreground">
                    &ldquo;{payment.message}&rdquo;
                  </p>
                </div>
              ) : null}

              <Button asChild className="w-full">
                <Link href={`/e/${slug}`}>
                  <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                  <span>Return to {eventName}</span>
                </Link>
              </Button>
            </CardContent>
          );
        })()}
      </Card>

      {authStatus !== "authed" ? (
        <Card className="border-accent/50 bg-accent/10">
          <CardContent className="flex flex-col items-start justify-between gap-4 p-5 sm:flex-row sm:items-center">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 font-heading text-base font-semibold text-foreground">
                <span>Hosting your own celebration soon?</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Create a free Givvly account to track gifts you send and create
                event pages in minutes.
              </p>
            </div>
            <Button asChild size="sm" variant="secondary">
              <Link href="/signup">Create account</Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}


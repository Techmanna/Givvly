"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertTriangle,
  ExternalLink,
  Gift,
  Lock,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Money } from "@/components/shared/Money";
import { ApiClientError } from "@/lib/api-client";
import { formatNaira, nairaToKobo } from "@/lib/format";
import { useGiveDraftStore } from "@/stores/give-draft-store";
import { useInitiateMoneyGiftMutation } from "../hooks/useGifts";
import { loadPaystackScript, openPaystackCheckout } from "../paystack";
import { giveMoneySchema, hasProfanityWarning } from "../schemas";
import type { GiveMoneyInput, PaymentInitResponse } from "../types";

const PRESET_AMOUNTS_NAIRA = [5_000, 10_000, 25_000, 50_000, 100_000] as const;

type DisplayCurrency = "NGN" | "USD" | "GBP" | "EUR";

// Reference display rates in kobo per 1 unit of foreign currency (informational only; settlement is always in kobo)
const KOBO_PER_UNIT: Record<Exclude<DisplayCurrency, "NGN">, { symbol: string; kobo: number }> = {
  USD: { symbol: "$", kobo: 160_000 }, // ~₦1,600 / $1
  GBP: { symbol: "£", kobo: 205_000 }, // ~₦2,050 / £1
  EUR: { symbol: "€", kobo: 175_000 }, // ~₦1,750 / €1
};

function formatDiasporaEstimate(amountKobo: number, currency: DisplayCurrency): string | null {
  if (currency === "NGN") return null;
  const rate = KOBO_PER_UNIT[currency];
  const wholeUnits = Math.max(1, Math.round(amountKobo / rate.kobo));
  return `≈ ${rate.symbol}${wholeUnits.toLocaleString("en-US")} ${currency}`;
}

export type GiveMoneyFormProps = {
  slug: string;
  eventName: string;
  ownerFirstName: string;
  moneyGiftsEnabled: boolean;
  onSuccessNavigate?: (reference: string) => void;
};

export function GiveMoneyForm({
  slug,
  eventName,
  ownerFirstName,
  moneyGiftsEnabled,
  onSuccessNavigate,
}: GiveMoneyFormProps) {
  const router = useRouter();
  const draft = useGiveDraftStore((s) => s.draft);
  const hydrateForSlug = useGiveDraftStore((s) => s.hydrateForSlug);
  const updateDraft = useGiveDraftStore((s) => s.updateDraft);
  const rotateIdempotencyKey = useGiveDraftStore((s) => s.rotateIdempotencyKey);

  const [pendingPayment, setPendingPayment] =
    useState<PaymentInitResponse | null>(null);
  const [scriptFailed, setScriptFailed] = useState(false);
  const [formAlert, setFormAlert] = useState<string | null>(null);
  const [displayCurrency, setDisplayCurrency] =
    useState<DisplayCurrency>("NGN");

  const initMutation = useInitiateMoneyGiftMutation(slug);

  const form = useForm<
    {
      amountNaira: number;
      name?: string;
      email: string;
      message?: string;
      anonymous?: boolean;
    },
    unknown,
    GiveMoneyInput
  >({
    resolver: zodResolver(giveMoneySchema),
    mode: "onBlur",
    defaultValues: {
      amountNaira: Math.max(500, Math.round(draft.amountKobo / 100)),
      name: draft.name,
      email: draft.email,
      message: draft.message,
      anonymous: draft.anonymous,
    },
  });

  useEffect(() => {
    hydrateForSlug(slug);
    void loadPaystackScript();
  }, [hydrateForSlug, slug]);

  const watchedAmountNaira = useWatch({
    control: form.control,
    name: "amountNaira",
  });
  const watchedAnonymous = useWatch({
    control: form.control,
    name: "anonymous",
  });
  const watchedMessage = useWatch({
    control: form.control,
    name: "message",
  });

  const safeAmountNaira =
    typeof watchedAmountNaira === "number" &&
    Number.isFinite(watchedAmountNaira) &&
    watchedAmountNaira >= 500
      ? Math.round(watchedAmountNaira)
      : 0;
  const amountKobo = pendingPayment?.amountKobo ?? nairaToKobo(safeAmountNaira);
  const serviceFeeKobo =
    pendingPayment?.serviceFeeKobo ?? Math.round(amountKobo * 0.015);
  const totalKobo = pendingPayment?.totalKobo ?? amountKobo + serviceFeeKobo;

  const showProfanityWarning = hasProfanityWarning(watchedMessage);

  const goToReceipt = (reference: string) => {
    if (onSuccessNavigate) {
      onSuccessNavigate(reference);
    } else {
      router.push(`/e/${slug}/give/success?ref=${encodeURIComponent(reference)}`);
    }
  };

  if (!moneyGiftsEnabled) {
    return (
      <div
        role="alert"
        className="flex items-start gap-3 rounded-card border border-warning/40 bg-warning/10 p-4 text-sm text-foreground"
      >
        <AlertTriangle
          className="mt-0.5 h-5 w-5 shrink-0 text-warning"
          aria-hidden="true"
        />
        <div className="space-y-1">
          <p className="font-semibold">
            Money gifts are not enabled for this event yet
          </p>
          <p className="text-xs text-muted-foreground">
            {ownerFirstName} is still setting up their verified payout account.
            Please check back soon or explore the gift registry on the event
            page.
          </p>
        </div>
      </div>
    );
  }

  const onSubmit = form.handleSubmit(async (values) => {
    setFormAlert(null);
    setScriptFailed(false);

    const computedAmountKobo = nairaToKobo(values.amountNaira);
    updateDraft({
      eventSlug: slug,
      amountKobo: computedAmountKobo,
      name: values.name ?? "",
      email: values.email,
      message: values.message ?? "",
      anonymous: values.anonymous,
    });

    try {
      const payment = await initMutation.mutateAsync({
        payload: {
          amountKobo: computedAmountKobo,
          name: values.anonymous ? undefined : values.name?.trim(),
          email: values.email.trim().toLowerCase(),
          message: values.message?.trim() || undefined,
          anonymous: values.anonymous,
        },
        idempotencyKey: draft.idempotencyKey,
      });

      setPendingPayment(payment);

      const popupResult = await openPaystackCheckout({
        email: values.email.trim().toLowerCase(),
        amountKobo: payment.totalKobo,
        reference: payment.reference,
        accessCode: payment.accessCode,
        onComplete: (ref) => {
          goToReceipt(ref);
        },
        onDismiss: () => {
          toast.info(
            "Payment window closed. Your gift details are saved so you can continue anytime."
          );
        },
      });

      if (!popupResult.opened) {
        setScriptFailed(true);
      }
    } catch (err) {
      if (err instanceof ApiClientError) {
        if (err.code === "VALIDATION_FAILED" && err.details) {
          for (const [field, messages] of Object.entries(err.details)) {
            if (messages[0]) {
              form.setError(field as keyof GiveMoneyInput, {
                message: messages[0],
              });
            }
          }
          return;
        }
        if (err.code === "PAYMENT_FAILED") {
          rotateIdempotencyKey();
          setFormAlert(
            `${err.message || "Payment could not be initialized."} Please try again.`
          );
          return;
        }
        if (err.code === "PAYOUT_NOT_READY") {
          setFormAlert("Money gifts are not enabled for this event yet.");
          return;
        }
        setFormAlert(err.message);
        return;
      }

      setFormAlert("Check your connection and try again.");
    }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-6" noValidate>
      {formAlert ? (
        <div
          role="alert"
          className="rounded-control border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
        >
          {formAlert}
        </div>
      ) : null}

      {/* Step 1: Amount */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Label htmlFor="give-amount-naira" className="text-sm font-semibold">
            1. Choose gift amount (₦)
          </Label>
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-muted-foreground">Diaspora guide:</span>
            {(["NGN", "USD", "GBP", "EUR"] as const).map((curr) => (
              <button
                key={curr}
                type="button"
                onClick={() => setDisplayCurrency(curr)}
                className={`rounded-sm px-1.5 py-0.5 font-medium ${
                  displayCurrency === curr
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                {curr}
              </button>
            ))}
          </div>
        </div>

        <div
          className="grid grid-cols-3 gap-2 sm:grid-cols-5"
          role="group"
          aria-label="Preset gift amounts"
        >
          {PRESET_AMOUNTS_NAIRA.map((preset) => {
            const isSelected = safeAmountNaira === preset;
            return (
              <Button
                key={preset}
                type="button"
                variant={isSelected ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setPendingPayment(null);
                  form.setValue("amountNaira", preset, {
                    shouldValidate: true,
                  });
                  updateDraft({ amountKobo: nairaToKobo(preset) });
                }}
              >
                {formatNaira(nairaToKobo(preset))}
              </Button>
            );
          })}
        </div>

        <div className="space-y-1.5">
          <Input
            id="give-amount-naira"
            type="number"
            inputMode="numeric"
            min={500}
            max={1_000_000}
            step={100}
            {...form.register("amountNaira", {
              onChange: (e) => {
                setPendingPayment(null);
                const val = Number(e.target.value);
                if (Number.isFinite(val) && val >= 500) {
                  updateDraft({ amountKobo: nairaToKobo(Math.round(val)) });
                }
              },
            })}
            aria-describedby={
              form.formState.errors.amountNaira
                ? "give-amount-error"
                : undefined
            }
          />
          {form.formState.errors.amountNaira ? (
            <p
              id="give-amount-error"
              className="text-xs text-destructive"
              role="alert"
            >
              {form.formState.errors.amountNaira.message}
            </p>
          ) : null}
        </div>
      </div>

      {/* Step 2: Details */}
      <div className="space-y-4 border-t border-border pt-4">
        <p className="text-sm font-semibold text-foreground">
          2. Your details and wish
        </p>

        <div className="flex items-start gap-2.5 rounded-control border border-border bg-muted/30 p-3">
          <Checkbox
            id="give-anonymous"
            checked={watchedAnonymous}
            onCheckedChange={(checked) => {
              const isAnon = Boolean(checked);
              form.setValue("anonymous", isAnon, { shouldValidate: true });
              updateDraft({ anonymous: isAnon });
            }}
          />
          <div className="space-y-0.5 text-xs">
            <Label htmlFor="give-anonymous" className="cursor-pointer font-medium">
              Give anonymously
            </Label>
            <p className="text-muted-foreground">
              Your name will be hidden on the public Wall of Love.{" "}
              {ownerFirstName} will still see your gift amount in their private
              event summary.
            </p>
          </div>
        </div>

        {!watchedAnonymous ? (
          <div className="space-y-1.5">
            <Label htmlFor="give-name">Your name</Label>
            <Input
              id="give-name"
              maxLength={60}
              {...form.register("name", {
                onChange: (e) => updateDraft({ name: e.target.value }),
              })}
              aria-describedby={
                form.formState.errors.name ? "give-name-error" : undefined
              }
            />
            {form.formState.errors.name ? (
              <p
                id="give-name-error"
                className="text-xs text-destructive"
                role="alert"
              >
                {form.formState.errors.name.message}
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="space-y-1.5">
          <Label htmlFor="give-email">Email address (for your receipt)</Label>
          <Input
            id="give-email"
            type="email"
            autoComplete="email"
            maxLength={254}
            {...form.register("email", {
              onChange: (e) => updateDraft({ email: e.target.value }),
            })}
            aria-describedby={
              form.formState.errors.email ? "give-email-error" : undefined
            }
          />
          {form.formState.errors.email ? (
            <p
              id="give-email-error"
              className="text-xs text-destructive"
              role="alert"
            >
              {form.formState.errors.email.message}
            </p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="give-message">
              Message for {ownerFirstName} (optional)
            </Label>
            <span className="text-xs text-muted-foreground">
              {(watchedMessage ?? "").length}/500
            </span>
          </div>
          <Textarea
            id="give-message"
            rows={3}
            maxLength={500}
            {...form.register("message", {
              onChange: (e) => updateDraft({ message: e.target.value }),
            })}
            aria-describedby={
              form.formState.errors.message
                ? "give-message-error"
                : showProfanityWarning
                  ? "give-profanity-warning"
                  : undefined
            }
          />
          {form.formState.errors.message ? (
            <p
              id="give-message-error"
              className="text-xs text-destructive"
              role="alert"
            >
              {form.formState.errors.message.message}
            </p>
          ) : null}
          {showProfanityWarning ? (
            <div
              id="give-profanity-warning"
              role="status"
              className="flex items-start gap-2 rounded-control border border-warning/40 bg-warning/10 p-2.5 text-xs text-foreground"
            >
              <AlertTriangle
                className="mt-0.5 h-4 w-4 shrink-0 text-warning"
                aria-hidden="true"
              />
              <span>
                Please keep messages celebratory. Messages flagged by our filter
                will be held for review before appearing on the Wall of Love.
              </span>
            </div>
          ) : null}
        </div>
      </div>

      {/* Step 3: Summary & Pay */}
      <div className="space-y-4 border-t border-border pt-4">
        <p className="text-sm font-semibold text-foreground">
          3. Summary and payment
        </p>

        <div className="space-y-2 rounded-card border border-border bg-muted/40 p-4 text-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span>Recipient</span>
            <span className="font-medium text-foreground">
              {ownerFirstName} ({eventName})
            </span>
          </div>
          <div className="flex items-center justify-between text-muted-foreground">
            <span>Gift amount</span>
            <Money amountKobo={amountKobo} className="text-foreground" />
          </div>
          <div className="flex items-center justify-between text-muted-foreground">
            <span>Processing & platform fee</span>
            <Money amountKobo={serviceFeeKobo} className="text-foreground" />
          </div>
          <div className="flex items-center justify-between border-t border-border pt-2 font-semibold text-foreground">
            <span>Total to pay</span>
            <div className="text-right">
              <Money amountKobo={totalKobo} className="text-primary" />
              {displayCurrency !== "NGN" ? (
                <p className="text-[11px] font-normal text-muted-foreground">
                  {formatDiasporaEstimate(totalKobo, displayCurrency)}{" "}
                  (international cards accepted, charged in NGN)
                </p>
              ) : null}
            </div>
          </div>
        </div>

        {scriptFailed && pendingPayment ? (
          <div
            role="alert"
            className="space-y-3 rounded-card border border-warning/40 bg-warning/10 p-4 text-xs text-foreground"
          >
            <p className="font-medium">
              The payment popup could not be opened in your browser.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button asChild size="sm">
                <a
                  href={pendingPayment.authorizationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Pay with link</span>
                </a>
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => goToReceipt(pendingPayment.reference)}
              >
                I have completed payment
              </Button>
            </div>
          </div>
        ) : null}

        <Button
          type="submit"
          className="w-full"
          disabled={initMutation.isPending || amountKobo < 50_000}
        >
          <Gift className="h-4 w-4" aria-hidden="true" />
          <span>
            {initMutation.isPending
              ? "Preparing secure payment..."
              : `Send gift (${formatNaira(totalKobo)})`}
          </span>
        </Button>

        <div className="flex items-center justify-center gap-2 text-center text-xs text-muted-foreground">
          <Lock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>
            Secured by Paystack. By continuing you agree to our{" "}
            <Link href="/terms" className="underline hover:text-foreground">
              Terms
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="underline hover:text-foreground">
              Privacy Policy
            </Link>
            .
          </span>
          <ShieldCheck className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        </div>
      </div>
    </form>
  );
}

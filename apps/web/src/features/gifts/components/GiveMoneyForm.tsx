"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertTriangle,
  ExternalLink,
  Gift,
  Lock,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Money } from "@/components/shared/Money";
import { ApiClientError } from "@/lib/api-client";
import { trackEvent } from "@/lib/analytics";
import { formatNaira, nairaToKobo } from "@/lib/format";
import { useGiveDraftStore } from "@/stores/give-draft-store";
import type { EventType } from "@givvly/contracts";
import { useInitiateMoneyGiftMutation } from "../hooks/useGifts";
import { loadPaystackScript, openPaystackCheckout } from "../paystack";
import { giveMoneySchema, hasProfanityWarning } from "../schemas";
import type { GiveMoneyInput, PaymentInitResponse } from "../types";

const PRESET_AMOUNTS_NAIRA = [5_000, 10_000, 25_000, 50_000, 100_000] as const;
const POPULAR_ANCHOR_NAIRA = 25_000;

export interface BlessingChipContext {
  eventType?: EventType;
  eventName: string;
  ownerFirstName: string;
  eventDate?: string;
  eventStory?: string;
}

/**
 * Generates context-aware celebratory blessing chips tailored to the event's
 * type, title, host name, seasonal date, and story.
 */
export function getDynamicBlessingChips({
  eventType,
  eventName,
  ownerFirstName,
  eventDate,
  eventStory,
}: BlessingChipContext): {
  contextLabel: string;
  chips: string[];
} {
  const host = ownerFirstName.trim() || "you";
  const combined = `${eventName} ${eventStory ?? ""}`.toLowerCase();

  // Detect seasonal cue from eventDate
  let dateMonth: number | null = null;
  if (eventDate) {
    const parsed = new Date(`${eventDate}T00:00:00+01:00`);
    if (!Number.isNaN(parsed.getTime())) {
      dateMonth = parsed.getMonth() + 1;
    }
  }
  const isDecember = dateMonth === 12;

  // Detect milestone age (e.g. "30th", "40th", "50th", "60th")
  const milestoneMatch = eventName.match(/\b(\d{1,2}(?:st|nd|rd|th))\b/i);
  const milestoneLabel = milestoneMatch?.[1];

  // Infer effective occasion from explicit eventType OR eventName/eventStory cues
  const isMemorialContext =
    eventType === "MEMORIAL" ||
    /\b(memorial|tribute|celebration of life|in loving memory|remembrance|funeral)\b/i.test(
      combined
    );
  const isBridalShowerContext =
    eventType === "BRIDAL_SHOWER" ||
    /\b(bridal shower|bachelorette|bride to be|hen night)\b/i.test(combined);
  const isAnniversaryContext =
    eventType === "ANNIVERSARY" ||
    /\b(anniversary|wedding anniversary|milestone anniversary)\b/i.test(
      combined
    );
  const isSendOffContext =
    eventType === "SEND_OFF" ||
    /\b(send-off|send-forth|sendforth|bon voyage|relocation|japa|farewell)\b/i.test(
      combined
    );
  const isBabyContext =
    eventType === "BABY_SHOWER" ||
    eventType === "NAMING_CEREMONY" ||
    /\b(baby|shower|naming|dedication|christening|newborn|nursery|bundle of joy)\b/i.test(
      combined
    );
  const isGradContext =
    eventType === "GRADUATION" ||
    /\b(graduation|convocation|induction|mbbs|call to bar|degree|masters|phd)\b/i.test(
      combined
    );
  const isHousewarmingContext =
    eventType === "HOUSEWARMING" ||
    /\b(housewarming|new home|new apartment|blessing of home|move-in)\b/i.test(
      combined
    );
  const isRetirementContext =
    eventType === "RETIREMENT" ||
    /\b(retirement|retire|meritorious)\b/i.test(combined);
  const isBirthdayContext =
    eventType === "BIRTHDAY" ||
    /\b(birthday|bday|jubilee|turns)\b/i.test(combined) ||
    Boolean(milestoneLabel);
  const isWeddingContext =
    eventType === "WEDDING" ||
    /\b(wedding|marriage|matrimony|union|trad|engagement|forever|mr\s*&\s*mrs)\b/i.test(
      combined
    ) ||
    (!isBabyContext &&
      !isGradContext &&
      !isBirthdayContext &&
      !isMemorialContext &&
      !isBridalShowerContext &&
      !isAnniversaryContext &&
      !isSendOffContext &&
      eventName.includes("&"));

  if (isMemorialContext) {
    return {
      contextLabel: "Memorial & Tribute",
      chips: [
        `Honouring a beautiful life well lived and a legacy that will never be forgotten. May God grant peace and comfort to your family. 🕊️🤍`,
        `In loving memory and celebration of a gracious soul who touched so many lives. May their gentle soul rest in perfect peace. 🙏🕯️`,
        `Holding your family in our thoughts and prayers during this season of remembrance and thanksgiving for a remarkable life. 🤍✨`,
      ],
    };
  }

  if (isBridalShowerContext) {
    return {
      contextLabel: "Bridal Shower",
      chips: [
        `Shower blessings on the beautiful bride-to-be! Here's to love, joy, and your magical journey to forever, ${host}! 💍🥂`,
        `May your wedding journey be stress-free, joyous, and overflowing with sweet memories! 👰✨`,
        `Wishing you all the happiness and peace in the world as you step into this next chapter! 🥂💖`,
      ],
    };
  }

  if (isAnniversaryContext) {
    return {
      contextLabel: "Anniversary",
      chips: [
        `Happy anniversary, ${host}! Celebrating your inspiring love and devotion. May your bond grow sweeter with every year! 🥂❤️`,
        `Congratulations on another beautiful chapter of love, partnership, and shared dreams! 💍✨`,
        `May God continue to bless your home with unending peace, joy, and abundance! 🙏💐`,
      ],
    };
  }

  if (isSendOffContext) {
    return {
      contextLabel: "Send-Off",
      chips: [
        `Bon voyage and best wishes on your exciting new adventure, ${host}! May favour and great doors open for you! ✈️🌍`,
        `So proud of your courage and vision! Wishing you grand success and joy in your new chapter! 🥂🌟`,
        `We will miss you dearly, but we are cheering for your unstoppable global exploits! 🎉✈️`,
      ],
    };
  }

  if (isBabyContext) {
    const isNamingOrDedication =
      eventType === "NAMING_CEREMONY" ||
      /\b(naming|dedication|christening)\b/i.test(combined);
    return {
      contextLabel: isNamingOrDedication
        ? "Naming & Dedication"
        : "Baby Shower",
      chips: [
        `Congratulations, ${host}! Welcome to the world, little bundle of joy—may you grow in wisdom and grace. 🍼✨`,
        `May God protect, bless, and surround your growing family with peace and abundant provision! 🙏💛`,
        isNamingOrDedication
          ? `Rejoicing with your family on this joyful naming and dedication! May this child bring endless pride. 🎉👶`
          : `So excited for your growing family, ${host}! Wishing you restful nights and the sweetest memories ahead. 🌸🧸`,
      ],
    };
  }

  if (isGradContext) {
    const isInduction = /\b(induction|mbbs|doctor|call to bar|barrister)\b/i.test(
      combined
    );
    return {
      contextLabel: isInduction ? "Induction" : "Graduation",
      chips: [
        `Congratulations on this huge milestone, ${host}! Hard work and grace paid off—so proud of you! 🎓✨`,
        `May this achievement open doors to global opportunities, favour, and greater heights ahead! 🙏🚀`,
        isInduction
          ? `Congratulations on your professional induction, ${host}! Wishing you a distinguished and impactful career ahead. 🌟🥂`
          : `Cheers to your next chapter, ${host}! The sky is only the starting point for you. 🥂🎉`,
      ],
    };
  }

  if (isHousewarmingContext && eventType !== "WEDDING") {
    return {
      contextLabel: "Housewarming",
      chips: [
        `Congratulations on your beautiful new home, ${host}! May it always be filled with peace, laughter, and abundance. 🏡✨`,
        `May God bless your new abode and make it a haven of joy, warmth, and hospitality! 🙏🥂`,
        `Here's to making unforgettable memories with family and friends in your new space! 🎉🪴`,
      ],
    };
  }

  if (isRetirementContext) {
    return {
      contextLabel: "Retirement",
      chips: [
        `Happy retirement, ${host}! Thank you for your inspiring legacy—wishing you a restful, joyful new chapter. 🌟🥂`,
        `May God reward your years of dedication with sound health, peace, and long life to enjoy the fruits of your labour! 🙏✨`,
        `Cheers to a well-earned new season of family, travel, and relaxation! 🎉🌴`,
      ],
    };
  }

  if (isBirthdayContext) {
    const hasThanksgivingCue = /\b(thanksgiving|grace|grateful)\b/i.test(
      combined
    );
    return {
      contextLabel: milestoneLabel
        ? `${milestoneLabel} Birthday`
        : "Birthday",
      chips: [
        milestoneLabel
          ? `Happy ${milestoneLabel} birthday, ${host}! Wishing you long life, sound health, and greater heights. 🎂🥂`
          : `Happy birthday, ${host}! Wishing you long life, sound health, and unending prosperity. 🎂✨`,
        `May this new year of your life bring open doors, divine favour, and abundant joy! 🙏🎉`,
        hasThanksgivingCue
          ? `Joining you to give thanks for another year of grace, growth, and overflowing blessings, ${host}! 🙌✨`
          : `Cheers to more life, more wins, and unforgettable memories ahead, ${host}! 🥂🔥`,
      ],
    };
  }

  if (isWeddingContext) {
    const hasHoneymoonOrHomeCue =
      /\b(honeymoon|getaway|travel|new home|kitchen)\b/i.test(combined);
    return {
      contextLabel: "Wedding",
      chips: [
        `Happy married life, ${host}! Wishing your union a lifetime of love, laughter, and abundance. 💍✨`,
        `May God bless your new home with peace, fruitfulness, and unending joy! 🙏❤️`,
        hasHoneymoonOrHomeCue
          ? `Here's to building a warm new home and making unforgettable honeymoon memories together! 🥂🌴`
          : isDecember
            ? `May your December wedding usher your family into a new year of endless marital bliss! 🎄🥂`
            : `Cheers to forever! May your love grow stronger and sweeter with every passing year. 🥂🎉`,
      ],
    };
  }

  return {
    contextLabel: "Celebration",
    chips: [
      `Celebrating with you, ${host}! Wishing you a lifetime of love, joy, and abundance. 🎉`,
      `May God bless this special milestone richly and fill your home with peace and favour! 🙏✨`,
      `Cheers to long life, good health, and unending prosperity for you and yours! 🥂`,
    ],
  };
}

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
  eventType?: EventType;
  eventDate?: string;
  eventStory?: string;
  onSuccessNavigate?: (reference: string) => void;
};

export function GiveMoneyForm({
  slug,
  eventName,
  ownerFirstName,
  moneyGiftsEnabled,
  eventType,
  eventDate,
  eventStory,
  onSuccessNavigate,
}: GiveMoneyFormProps) {
  const router = useRouter();
  const draft = useGiveDraftStore((s) => s.draft);
  const hydrateForSlug = useGiveDraftStore((s) => s.hydrateForSlug);
  const updateDraft = useGiveDraftStore((s) => s.updateDraft);
  const rotateIdempotencyKey = useGiveDraftStore((s) => s.rotateIdempotencyKey);

  const { contextLabel: blessingContextLabel, chips: dynamicBlessingChips } =
    useMemo(
      () =>
        getDynamicBlessingChips({
          eventType,
          eventName,
          ownerFirstName,
          eventDate,
          eventStory,
        }),
      [eventType, eventName, ownerFirstName, eventDate, eventStory]
    );

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

    trackEvent("give_initiated", {
      slug,
      amountNaira: values.amountNaira,
      anonymous: Boolean(values.anonymous),
      hasMessage: Boolean(values.message?.trim()),
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
          trackEvent("give_completed", {
            slug,
            reference: ref,
            amountNaira: values.amountNaira,
          });
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
  }, (errors) => {
    const firstErrorMessage =
      errors.amountNaira?.message ||
      errors.name?.message ||
      errors.email?.message ||
      errors.message?.message;
    if (firstErrorMessage) {
      setFormAlert(firstErrorMessage);
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
                disabled={curr !== "NGN"}
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
            const isPopularAnchor = preset === POPULAR_ANCHOR_NAIRA;
            return (
              <Button
                key={preset}
                type="button"
                variant={isSelected ? "default" : "outline"}
                size="sm"
                className={`relative ${
                  isPopularAnchor && !isSelected
                    ? "border-primary/50 bg-primary/5 font-semibold"
                    : ""
                }`}
                onClick={() => {
                  setPendingPayment(null);
                  form.setValue("amountNaira", preset, {
                    shouldValidate: true,
                  });
                  updateDraft({ amountKobo: nairaToKobo(preset) });
                  trackEvent("give_preset_selected", {
                    slug,
                    presetNaira: preset,
                  });
                }}
              >
                <span className="flex flex-col items-center leading-tight">
                  <span>{formatNaira(nairaToKobo(preset))}</span>
                  {isPopularAnchor ? (
                    <span
                      className={`text-[9px] font-bold uppercase tracking-wider ${
                        isSelected ? "text-primary-foreground/90" : "text-primary"
                      }`}
                    >
                      Popular
                    </span>
                  ) : null}
                </span>
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
              if (isAnon) {
                form.clearErrors("name");
              }
              setFormAlert(null);
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
              autoComplete="name"
              enterKeyHint="next"
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
            spellCheck={false}
            autoCapitalize="none"
            enterKeyHint="next"
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

          {/* 1-Tap Context-Aware Celebratory Blessing Chips (Reciprocity + Friction Reduction) */}
          <div className="space-y-1">
            <p className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
              <Sparkles className="h-3 w-3 text-primary" aria-hidden="true" />
              <span>
                Tap a tailored {blessingContextLabel.toLowerCase()} wish for{" "}
                {ownerFirstName}:
              </span>
            </p>
            <div className="flex flex-wrap gap-1.5">
              {dynamicBlessingChips.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => {
                    form.setValue("message", chip, { shouldValidate: true });
                    updateDraft({ message: chip });
                    trackEvent("give_wish_chip_selected", {
                      slug,
                      contextLabel: blessingContextLabel,
                      chipLength: chip.length,
                    });
                  }}
                  className="rounded-full border border-primary/20 bg-primary/5 px-2.5 py-1 text-left text-[11px] text-foreground transition-colors hover:border-primary/40 hover:bg-primary/10"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>

          <Textarea
            id="give-message"
            rows={3}
            maxLength={500}
            placeholder={`Write a warm blessing or prayer for ${ownerFirstName}...`}
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

        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
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
        </div>
      </div>
    </form>
  );
}

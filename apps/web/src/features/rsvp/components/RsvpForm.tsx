"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Gift, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiClientError } from "@/lib/api-client";
import { useSubmitRsvpMutation } from "../hooks/useRsvp";
import { rsvpFormSchema } from "../schemas";
import type { RsvpFormInput, RsvpRecord, RsvpResponse } from "../types";

export type RsvpFormProps = {
  slug: string;
  ownerFirstName: string;
  allowPlusOne: boolean;
  moneyGiftsEnabled: boolean;
  onOpenGiveDialog?: () => void;
};

const RESPONSE_OPTIONS: { value: RsvpResponse; label: string }[] = [
  { value: "YES", label: "Yes, I will attend" },
  { value: "MAYBE", label: "Maybe" },
  { value: "NO", label: "Cannot make it" },
];

export function RsvpForm({
  slug,
  ownerFirstName,
  allowPlusOne,
  moneyGiftsEnabled,
  onOpenGiveDialog,
}: RsvpFormProps) {
  const [confirmedRsvp, setConfirmedRsvp] = useState<RsvpRecord | null>(null);
  const submitMutation = useSubmitRsvpMutation(slug);

  const form = useForm<RsvpFormInput>({
    resolver: zodResolver(rsvpFormSchema),
    mode: "onBlur",
    defaultValues: {
      name: "",
      response: "YES",
      plusOneName: "",
      email: "",
      phone: "",
    },
  });

  const selectedResponse = useWatch({
    control: form.control,
    name: "response",
  });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const saved = await submitMutation.mutateAsync({
        name: values.name.trim(),
        response: values.response,
        plusOneName:
          allowPlusOne && values.response === "YES" && values.plusOneName?.trim()
            ? values.plusOneName.trim()
            : undefined,
        email: values.email?.trim() || undefined,
        phone: values.phone?.trim() || undefined,
      });
      setConfirmedRsvp(saved);
      toast.success("Your RSVP has been saved.");
    } catch (err) {
      if (err instanceof ApiClientError && err.details) {
        for (const [field, messages] of Object.entries(err.details)) {
          if (messages[0]) {
            form.setError(field as keyof RsvpFormInput, {
              message: messages[0],
            });
          }
        }
        return;
      }
      toast.error("Could not submit your RSVP. Please try again.");
    }
  });

  if (confirmedRsvp) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="space-y-4 rounded-card border border-success/40 bg-success/10 p-4 text-sm"
      >
        <div className="flex items-start gap-2.5">
          <CheckCircle2
            className="mt-0.5 h-5 w-5 shrink-0 text-success"
            aria-hidden="true"
          />
          <div className="space-y-1">
            <p className="font-semibold text-foreground">
              RSVP confirmed, {confirmedRsvp.name}!
            </p>
            <p className="text-xs text-muted-foreground">
              {confirmedRsvp.response === "YES"
                ? `${ownerFirstName} looks forward to celebrating with you${
                    confirmedRsvp.plusOneName
                      ? ` and ${confirmedRsvp.plusOneName}`
                      : ""
                  }.`
                : `We have shared your update (${confirmedRsvp.response}) with ${ownerFirstName}.`}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {moneyGiftsEnabled && onOpenGiveDialog ? (
            <Button type="button" size="sm" onClick={onOpenGiveDialog}>
              <Gift className="h-4 w-4" aria-hidden="true" />
              <span>Send a gift</span>
            </Button>
          ) : (
            <Button asChild size="sm">
              <Link href={`/e/${slug}/give`}>
                <Gift className="h-4 w-4" aria-hidden="true" />
                <span>Send a gift</span>
              </Link>
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setConfirmedRsvp(null)}
          >
            Update RSVP
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <div className="space-y-1.5">
        <Label htmlFor="rsvp-guest-name">Your full name</Label>
        <Input
          id="rsvp-guest-name"
          maxLength={60}
          {...form.register("name")}
          aria-describedby={
            form.formState.errors.name ? "rsvp-name-error" : undefined
          }
        />
        {form.formState.errors.name ? (
          <p
            id="rsvp-name-error"
            className="text-xs text-destructive"
            role="alert"
          >
            {form.formState.errors.name.message}
          </p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <Label>Will you attend?</Label>
        <div
          className="grid grid-cols-1 gap-2 sm:grid-cols-3"
          role="radiogroup"
          aria-label="Attendance response"
        >
          {RESPONSE_OPTIONS.map((opt) => {
            const isSelected = selectedResponse === opt.value;
            return (
              <Button
                key={opt.value}
                type="button"
                size="sm"
                variant={isSelected ? "default" : "outline"}
                role="radio"
                aria-checked={isSelected}
                onClick={() =>
                  form.setValue("response", opt.value, {
                    shouldValidate: true,
                  })
                }
              >
                {opt.label}
              </Button>
            );
          })}
        </div>
      </div>

      {allowPlusOne && selectedResponse === "YES" ? (
        <div className="space-y-1.5">
          <Label htmlFor="rsvp-plus-one">Plus-one name (optional)</Label>
          <Input
            id="rsvp-plus-one"
            maxLength={60}
            {...form.register("plusOneName")}
            aria-describedby={
              form.formState.errors.plusOneName
                ? "rsvp-plusone-error"
                : undefined
            }
          />
          {form.formState.errors.plusOneName ? (
            <p
              id="rsvp-plusone-error"
              className="text-xs text-destructive"
              role="alert"
            >
              {form.formState.errors.plusOneName.message}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="rsvp-email">Email address</Label>
          <Input
            id="rsvp-email"
            type="email"
            autoComplete="email"
            maxLength={254}
            {...form.register("email")}
            aria-describedby={
              form.formState.errors.email ? "rsvp-email-error" : undefined
            }
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="rsvp-phone">Phone number</Label>
          <Input
            id="rsvp-phone"
            type="tel"
            autoComplete="tel"
            {...form.register("phone")}
            aria-describedby={
              form.formState.errors.phone ? "rsvp-phone-error" : undefined
            }
          />
        </div>
      </div>

      {form.formState.errors.email ? (
        <p
          id="rsvp-email-error"
          className="text-xs text-destructive"
          role="alert"
        >
          {form.formState.errors.email.message}
        </p>
      ) : null}
      {form.formState.errors.phone ? (
        <p
          id="rsvp-phone-error"
          className="text-xs text-destructive"
          role="alert"
        >
          {form.formState.errors.phone.message}
        </p>
      ) : null}

      <Button
        type="submit"
        className="w-full"
        disabled={submitMutation.isPending}
      >
        <Users className="h-4 w-4" aria-hidden="true" />
        <span>{submitMutation.isPending ? "Saving RSVP..." : "Send RSVP"}</span>
      </Button>
    </form>
  );
}


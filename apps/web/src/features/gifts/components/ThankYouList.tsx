"use client";

import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Send, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { Money } from "@/components/shared/Money";
import { trackEvent } from "@/lib/analytics";
import { formatDate } from "@/lib/format";
import {
  useBulkThankYouMutation,
  useThankYouList,
  useToggleGiftThankedMutation,
} from "../hooks/useGifts";
import { bulkThankYouSchema } from "../schemas";
import type { BulkThankYouInput } from "../types";

const THANK_YOU_TEMPLATES = [
  {
    label: "Warm & Grateful",
    text: "Thank you so much for celebrating with us and for your generous gift! May joy and abundance never depart from your home.",
  },
  {
    label: "Traditional Prayer",
    text: "We are deeply grateful for your love, presence, and generous blessing. May God replenish your pocket a hundredfold!",
  },
  {
    label: "Short & Sweet",
    text: "Thank you for making our celebration unforgettable with your thoughtful gift and warm wishes!",
  },
] as const;

export type ThankYouListProps = {
  eventId: string;
};

export function ThankYouList({ eventId }: ThankYouListProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const thankYouQuery = useThankYouList(eventId);
  const bulkMutation = useBulkThankYouMutation(eventId);
  const toggleThanked = useToggleGiftThankedMutation(eventId);

  const form = useForm<BulkThankYouInput>({
    resolver: zodResolver(bulkThankYouSchema),
    defaultValues: {
      giftIds: [],
      message:
        "Thank you so much for celebrating with us and for your generous gift!",
    },
  });

  const watchedMessage = useWatch({ control: form.control, name: "message" });

  if (thankYouQuery.isLoading) {
    return (
      <div className="space-y-3" aria-busy="true">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  if (thankYouQuery.isError) {
    return (
      <ErrorState
        title="Could not load thank-you list"
        description="Check your connection and try again."
        onRetry={() => thankYouQuery.refetch()}
      />
    );
  }

  const gifts = thankYouQuery.data ?? [];
  const unthankedIds = gifts.filter((g) => !g.thanked).map((g) => g.id);
  const thankedCount = gifts.length - unthankedIds.length;
  const thankedPercent =
    gifts.length > 0 ? Math.round((thankedCount / gifts.length) * 100) : 0;

  const syncSelectedIds = (nextIds: string[]) => {
    setSelectedIds(nextIds);
    form.setValue("giftIds", nextIds, { shouldValidate: true });
  };

  const toggleOne = (id: string, checked: boolean) => {
    if (checked) {
      syncSelectedIds(Array.from(new Set([...selectedIds, id])));
    } else {
      syncSelectedIds(selectedIds.filter((item) => item !== id));
    }
  };

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const res = await bulkMutation.mutateAsync(values);
      trackEvent("thank_you_marked", {
        eventId,
        count: res.updatedCount,
        mode: "bulk",
      });
      toast.success(
        `Sent thank-you note to ${res.updatedCount} ${res.updatedCount === 1 ? "giver" : "givers"}.`
      );
      syncSelectedIds([]);
    } catch {
      toast.error("Could not send bulk thank-you message. Please try again.");
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="font-heading text-xl font-semibold text-foreground">
            Thank-you tracker
          </h2>
          <p className="text-sm text-muted-foreground">
            Select givers below to send a personal thank-you note or mark gifts
            as thanked.
          </p>
        </div>

        {unthankedIds.length > 0 ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => syncSelectedIds(unthankedIds)}
          >
            Select all unthanked ({unthankedIds.length})
          </Button>
        ) : null}
      </div>

      {gifts.length === 0 ? (
        <EmptyState
          title="No gifts to thank yet"
          description="Once guests send gifts, you can send thank-you notes from here."
        />
      ) : (
        <>
          {/* Goal Gradient Gratitude Progress Bar */}
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="font-semibold text-foreground">
                Gratitude progress: {thankedCount} of {gifts.length} guests thanked
              </span>
              <span className="font-bold text-primary">
                {thankedPercent}% complete
              </span>
            </div>
            <div
              role="progressbar"
              aria-label={`Gratitude progress: ${thankedPercent}% complete`}
              aria-valuenow={thankedPercent}
              aria-valuemin={0}
              aria-valuemax={100}
              className="h-2 w-full overflow-hidden rounded-full bg-muted"
            >
              <div
                className="h-full rounded-full bg-primary transition-all duration-300"
                style={{ width: `${thankedPercent}%` }}
              />
            </div>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                Send bulk thank-you message ({selectedIds.length} selected)
              </CardTitle>
              <CardDescription>
                Every selected giver will receive your note and be marked as
                thanked.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={onSubmit} className="space-y-4" noValidate>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="bulk-thank-you-msg">Thank-you message</Label>
                    <span className="text-xs text-muted-foreground">
                      {(watchedMessage ?? "").length}/500
                    </span>
                  </div>

                  <div className="space-y-1">
                    <p className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                      <Sparkles className="h-3 w-3 text-primary" aria-hidden="true" />
                      <span>Tap a gratitude template:</span>
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {THANK_YOU_TEMPLATES.map((tpl) => (
                        <button
                          key={tpl.label}
                          type="button"
                          onClick={() => {
                            form.setValue("message", tpl.text, {
                              shouldValidate: true,
                            });
                            trackEvent("thank_you_template_copied", {
                              eventId,
                              template: tpl.label,
                            });
                          }}
                          className="rounded-full border border-primary/25 bg-primary/5 px-2.5 py-1 text-[11px] font-medium text-primary hover:bg-primary/15"
                        >
                          + {tpl.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <Textarea
                    id="bulk-thank-you-msg"
                    rows={3}
                    maxLength={500}
                    {...form.register("message")}
                  />
                  {form.formState.errors.message ? (
                    <p className="text-xs text-destructive" role="alert">
                      {form.formState.errors.message.message}
                    </p>
                  ) : null}
                  {form.formState.errors.giftIds ? (
                    <p className="text-xs text-destructive" role="alert">
                      {form.formState.errors.giftIds.message}
                    </p>
                  ) : null}
                </div>

                <Button
                  type="submit"
                  size="sm"
                  disabled={
                    bulkMutation.isPending || selectedIds.length === 0
                  }
                >
                  <Send className="h-4 w-4" aria-hidden="true" />
                  <span>
                    {bulkMutation.isPending
                      ? "Sending..."
                      : `Send thank-you (${selectedIds.length})`}
                  </span>
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="space-y-2.5">
            {gifts.map((gift) => {
              const isChecked = selectedIds.includes(gift.id);
              const giverLabel = gift.anonymous
                ? "Anonymous well-wisher"
                : (gift.giverName ?? "Guest");

              return (
                <Card key={gift.id}>
                  <CardContent className="flex items-center justify-between gap-4 p-4">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        id={`thank-gift-${gift.id}`}
                        checked={isChecked}
                        onCheckedChange={(checked) =>
                          toggleOne(gift.id, Boolean(checked))
                        }
                        aria-label={`Select ${giverLabel}`}
                      />
                      <div className="space-y-0.5">
                        <Label
                          htmlFor={`thank-gift-${gift.id}`}
                          className="cursor-pointer font-semibold text-foreground"
                        >
                          {giverLabel}
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          <Money amountKobo={gift.amountKobo} /> ·{" "}
                          {formatDate(gift.createdAt, "d MMM yyyy")}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {gift.thanked ? (
                        <Badge variant="success">
                          <Check className="mr-1 h-3 w-3" aria-hidden="true" />
                          Thanked
                        </Badge>
                      ) : (
                        <Badge variant="warning">Unthanked</Badge>
                      )}
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          toggleThanked.mutate({
                            giftId: gift.id,
                            thanked: !gift.thanked,
                          })
                        }
                      >
                        {gift.thanked ? "Undo" : "Mark thanked"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}


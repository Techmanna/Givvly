"use client";

import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Send } from "lucide-react";
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
import { formatDate } from "@/lib/format";
import {
  useBulkThankYouMutation,
  useThankYouList,
  useToggleGiftThankedMutation,
} from "../hooks/useGifts";
import { bulkThankYouSchema } from "../schemas";
import type { BulkThankYouInput } from "../types";

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


"use client";

import { useState } from "react";
import { Check, HeartHandshake } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { Money } from "@/components/shared/Money";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatDate } from "@/lib/format";
import {
  useEventGifts,
  useToggleGiftThankedMutation,
} from "../hooks/useGifts";
import type { GiftFilters, GiftType } from "../types";

export type OwnerFeedProps = {
  eventId: string;
};

export function OwnerFeed({ eventId }: OwnerFeedProps) {
  const [filters, setFilters] = useState<GiftFilters>({
    type: "ALL",
    thanked: "ALL",
  });

  const giftsQuery = useEventGifts(eventId, filters);
  const toggleThanked = useToggleGiftThankedMutation(eventId);

  if (giftsQuery.isLoading) {
    return (
      <div className="space-y-3" aria-busy="true">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (giftsQuery.isError) {
    return (
      <ErrorState
        title="Could not load gifts"
        description="Check your connection and try again."
        onRetry={() => giftsQuery.refetch()}
      />
    );
  }

  const gifts = giftsQuery.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="font-heading text-xl font-semibold text-foreground">
            Live gift feed
          </h2>
          <p className="text-sm text-muted-foreground">
            Updates automatically every 15 seconds.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={filters.type ?? "ALL"}
            onValueChange={(val) =>
              setFilters((prev) => ({
                ...prev,
                type: val as GiftType | "ALL",
              }))
            }
          >
            <SelectTrigger className="w-36" aria-label="Filter by gift type">
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All types</SelectItem>
              <SelectItem value="MONEY">Money gifts</SelectItem>
              <SelectItem value="POOL">Group gifts</SelectItem>
              <SelectItem value="PRODUCT">Registry items</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filters.thanked ?? "ALL"}
            onValueChange={(val) =>
              setFilters((prev) => ({
                ...prev,
                thanked: val as "ALL" | "THANKED" | "UNTHANKED",
              }))
            }
          >
            <SelectTrigger
              className="w-40"
              aria-label="Filter by thank-you status"
            >
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All thank-you states</SelectItem>
              <SelectItem value="UNTHANKED">Needs thank-you</SelectItem>
              <SelectItem value="THANKED">Thanked</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {gifts.length === 0 ? (
        <EmptyState
          title="No gifts yet. Share your link to get started."
          description="When guests send cash or registry gifts, they will appear here in real time."
        />
      ) : (
        <div className="space-y-3">
          {gifts.map((gift) => (
            <Card key={gift.id}>
              <CardContent className="flex flex-col justify-between gap-4 p-4 sm:flex-row sm:items-center">
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-foreground">
                      {gift.anonymous
                        ? "Anonymous well-wisher"
                        : (gift.giverName ?? "Guest")}
                    </span>
                    <Badge variant="outline">{gift.type}</Badge>
                    <StatusBadge status={gift.status} />
                  </div>

                  {gift.message ? (
                    <p className="text-sm text-foreground">{gift.message}</p>
                  ) : null}

                  <p className="text-xs text-muted-foreground">
                    {formatDate(gift.createdAt, "d MMM yyyy, h:mm a")}
                  </p>
                </div>

                <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end">
                  <Money
                    amountKobo={gift.amountKobo}
                    className="font-heading text-lg font-bold text-primary"
                  />

                  <Button
                    type="button"
                    size="sm"
                    variant={gift.thanked ? "secondary" : "outline"}
                    onClick={() => {
                      toggleThanked.mutate(
                        {
                          giftId: gift.id,
                          thanked: !gift.thanked,
                        },
                        {
                          onError: () => {
                            toast.error(
                              "Could not update thank-you status. Please try again."
                            );
                          },
                        }
                      );
                    }}
                  >
                    {gift.thanked ? (
                      <>
                        <Check className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Thanked</span>
                      </>
                    ) : (
                      <>
                        <HeartHandshake
                          className="h-3.5 w-3.5"
                          aria-hidden="true"
                        />
                        <span>Mark thanked</span>
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}


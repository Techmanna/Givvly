"use client";

import Link from "next/link";
import { BookHeart, Globe, Heart, Lock } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { EventCover } from "@/components/shared/EventCover";
import { Money } from "@/components/shared/Money";
import { formatDate } from "@/lib/format";
import {
  useEventSummaryQuery,
  useToggleKeepsakeMutation,
} from "../hooks/useEvents";

export type KeepsakeSummaryViewProps = {
  eventId: string;
};

export function KeepsakeSummaryView({ eventId }: KeepsakeSummaryViewProps) {
  const summaryQuery = useEventSummaryQuery(eventId);
  const toggleMutation = useToggleKeepsakeMutation(eventId);

  if (summaryQuery.isLoading) {
    return (
      <div className="space-y-4" aria-busy="true">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (summaryQuery.isError || !summaryQuery.data) {
    return (
      <ErrorState
        title="Could not load keepsake summary"
        description="Check your connection and try again."
        onRetry={() => summaryQuery.refetch()}
      />
    );
  }

  const summary = summaryQuery.data;
  const { event } = summary;

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="font-heading text-xl font-semibold text-foreground">
            Keepsake summary page
          </h2>
          <p className="text-sm text-muted-foreground">
            Preview your celebration memory book and choose whether to share it
            publicly.
          </p>
        </div>

        <Badge variant={summary.keepsakePublished ? "success" : "secondary"}>
          {summary.keepsakePublished ? (
            <>
              <Globe className="mr-1 h-3 w-3" aria-hidden="true" />
              Public keepsake on
            </>
          ) : (
            <>
              <Lock className="mr-1 h-3 w-3" aria-hidden="true" />
              Private preview
            </>
          )}
        </Badge>
      </div>

      <Card>
        <CardContent className="flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center">
          <div className="space-y-1">
            <Label
              htmlFor="keepsake-publish-switch"
              className="text-sm font-semibold text-foreground"
            >
              Publish keepsake page
            </Label>
            <p className="text-xs text-muted-foreground">
              When enabled, guests visiting your event link after the event see
              your keepsake gallery and thank-you message. Gift amounts remain
              private to you.
            </p>
          </div>
          <Switch
            id="keepsake-publish-switch"
            checked={summary.keepsakePublished}
            disabled={toggleMutation.isPending}
            onCheckedChange={(checked) => {
              const nextState = Boolean(checked);
              toggleMutation.mutate(nextState, {
                onSuccess: () => {
                  toast.success(
                    nextState
                      ? "Keepsake page is now public."
                      : "Keepsake page is now private."
                  );
                },
                onError: () => {
                  toast.error("Could not update keepsake visibility.");
                },
              });
            }}
          />
        </CardContent>
      </Card>

      {/* Keepsake Preview Card */}
      <Card className="border-accent/40">
        <CardHeader>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-accent">
            <BookHeart className="h-4 w-4" aria-hidden="true" />
            <span>Celebration Keepsake Preview</span>
          </div>
          <CardTitle className="text-2xl">{event.name}</CardTitle>
          <CardDescription>
            Celebrated on {formatDate(event.date)}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <EventCover
            name={event.name}
            type={event.type}
            coverUrl={event.coverUrl}
          />

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-control border border-border bg-muted/40 p-3">
              <p className="text-xs text-muted-foreground">
                Total received (private)
              </p>
              <p className="mt-1 font-heading text-lg font-bold text-primary">
                <Money amountKobo={summary.totalReceivedKobo} />
              </p>
            </div>
            <div className="rounded-control border border-border bg-muted/40 p-3">
              <p className="text-xs text-muted-foreground">Total gifts</p>
              <p className="mt-1 font-heading text-lg font-bold text-foreground">
                {summary.giftCount}
              </p>
            </div>
            <div className="rounded-control border border-border bg-muted/40 p-3">
              <p className="text-xs text-muted-foreground">Thank-yous sent</p>
              <p className="mt-1 font-heading text-lg font-bold text-foreground">
                {summary.thankedCount} / {summary.giftCount}
              </p>
            </div>
            <div className="rounded-control border border-border bg-muted/40 p-3">
              <p className="text-xs text-muted-foreground">Guests attended</p>
              <p className="mt-1 font-heading text-lg font-bold text-foreground">
                {summary.rsvpYesCount}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Heart className="h-4 w-4 text-primary" aria-hidden="true" />
                <h3 className="font-heading text-base font-semibold text-foreground">
                  Wall of Love highlights ({summary.highlights.length})
                </h3>
              </div>
              <Button asChild size="sm" variant="ghost">
                <Link href={`/events/${event.id}/thank-you`}>
                  Manage thank-yous
                </Link>
              </Button>
            </div>

            {summary.highlights.length === 0 ? (
              <EmptyState
                title="No public wishes yet"
                description="Approved messages and photos from your Wall of Love will appear in this keepsake."
              />
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {summary.highlights.map((post) => (
                  <div
                    key={post.id}
                    className="rounded-control border border-border bg-card p-4"
                  >
                    <p className="text-sm font-semibold text-foreground">
                      {post.authorName}
                    </p>
                    {post.text ? (
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                        &ldquo;{post.text}&rdquo;
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


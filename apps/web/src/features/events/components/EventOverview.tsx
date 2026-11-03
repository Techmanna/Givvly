"use client";

import Link from "next/link";
import { AlertTriangle, ExternalLink, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EventCover } from "@/components/shared/EventCover";
import { ShareMenu } from "@/components/shared/ShareMenu";
import { QrCard } from "@/components/shared/QrCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { CopyButton } from "@/components/shared/CopyButton";
import { env } from "@/lib/env";
import { formatDate } from "@/lib/format";
import { useEventDetail, useEventStats } from "../hooks/useEvents";
import type { EventDetail } from "../types";
import { StatsCards } from "./StatsCards";

export type EventOverviewProps = {
  initialEvent: EventDetail;
};

export function EventOverview({ initialEvent }: EventOverviewProps) {
  const { data: event = initialEvent } = useEventDetail(
    initialEvent.id,
    initialEvent
  );
  const statsQuery = useEventStats(initialEvent.id);

  const publicUrl = `${env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")}/e/${event.slug}`;
  const totalReceivedKobo =
    statsQuery.data?.totalReceivedKobo ?? event?.totalReceivedKobo ?? 0;
  const giftCount = statsQuery.data?.giftCount ?? event?.giftCount ?? 0;
  const rsvpYesCount =
    statsQuery.data?.rsvpYesCount ?? event?.rsvpYesCount ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="font-heading text-2xl font-bold text-foreground">
              {event.name}
            </h1>
            <StatusBadge status={event.status} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatDate(event.date)}
          </p>
        </div>

        <Button asChild variant="outline">
          <Link href={`/e/${event.slug}`}>
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
            <span>Open public page</span>
          </Link>
        </Button>
      </div>

      {!event.moneyGiftsEnabled ? (
        <div className="flex flex-col justify-between gap-3 rounded-card border border-warning/40 bg-warning/10 p-4 sm:flex-row sm:items-center">
          <div className="flex items-start gap-2.5 text-sm">
            <AlertTriangle
              className="mt-0.5 h-5 w-5 shrink-0 text-warning"
              aria-hidden="true"
            />
            <div>
              <p className="font-medium text-foreground">
                Money gifts are disabled on this event
              </p>
              <p className="text-xs text-muted-foreground">
                Verify your payout bank account to enable cash gifts.
              </p>
            </div>
          </div>
          <Button asChild size="sm" variant="secondary">
            <Link href="/account/payout">Save payout details</Link>
          </Button>
        </div>
      ) : null}

      <StatsCards
        totalReceivedKobo={totalReceivedKobo}
        giftCount={giftCount}
        rsvpYesCount={rsvpYesCount}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Share your event</CardTitle>
              <CardDescription>
                Send your link on WhatsApp or social media.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-control border border-border bg-muted/40 p-3 font-mono text-xs break-all text-foreground">
                {publicUrl}
              </div>
              <ShareMenu url={publicUrl} title={event.name} />

              {event.visibility === "PRIVATE" && event.accessCode ? (
                <div className="flex items-center justify-between rounded-control border border-border bg-card p-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Lock
                      className="h-4 w-4 text-muted-foreground"
                      aria-hidden="true"
                    />
                    <span className="text-muted-foreground">Access code:</span>
                    <span className="font-mono font-semibold text-foreground">
                      {event.accessCode}
                    </span>
                  </div>
                  <CopyButton
                    value={event.accessCode}
                    label="Copy code"
                    size="sm"
                  />
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Cover and story</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <EventCover
                name={event.name}
                type={event.type}
                coverUrl={event.coverUrl}
              />
              {event.story ? (
                <p className="whitespace-pre-line text-sm text-foreground">
                  {event.story}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No story added yet.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          <QrCard url={publicUrl} />
        </div>
      </div>
    </div>
  );
}


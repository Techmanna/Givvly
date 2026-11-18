"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Clock,
  Gift,
  Heart,
  MapPin,
  ShoppingBag,
  Smartphone,
  Share2,
  Copy,
  Check,
  CheckCircle2,
  Settings,
  Users,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GiveDialog } from "@/features/gifts";
import { WallOfLove } from "@/features/moderation";
import { PoolCard, RegistryGrid } from "@/features/registry";
import { RsvpForm } from "@/features/rsvp";
import { useAuthStore } from "@/stores/auth-store";
import type { PublicEvent } from "../types";
import { EventHero } from "./EventHero";
import { GiveButtonBar } from "./GiveButtonBar";

export type PublicEventViewProps = {
  event: PublicEvent;
};

export function PublicEventView({ event }: PublicEventViewProps) {
  const [giveDialogOpen, setGiveDialogOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const currentUser = useAuthStore((s) => s.user);
  const isOwner = Boolean(
    currentUser &&
      (currentUser.id === event.ownerId ||
        (event.ownerId && currentUser.id === event.ownerId))
  );
  const isArchived = event.status === "ARCHIVED";

  const [archiveRemainingHours, setArchiveRemainingHours] = useState<number | null>(null);
  useEffect(() => {
    if (isArchived || !event.autoArchiveEnabled || !event.archiveAt) {
      setArchiveRemainingHours(null);
      return;
    }
    const updateRemaining = () => {
      const nowMs = Date.now();
      const eventMs = new Date(event.date).getTime();
      const archiveMs = new Date(event.archiveAt!).getTime();
      if (nowMs > eventMs && archiveMs > nowMs) {
        setArchiveRemainingHours(
          Math.max(1, Math.ceil((archiveMs - nowMs) / (60 * 60 * 1000)))
        );
      } else {
        setArchiveRemainingHours(null);
      }
    };
    updateRemaining();
    const timer = setInterval(updateRemaining, 60_000);
    return () => clearInterval(timer);
  }, [isArchived, event.autoArchiveEnabled, event.archiveAt, event.date]);

  const inviteFields = event.template?.fields;
  const scheduleItems = event.template?.scheduleItems ?? [];
  const directionsHref =
    inviteFields?.mapUrl?.trim() ||
    (inviteFields?.venue?.trim()
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          inviteFields.venue.trim()
        )}`
      : "");
  const hasInviteDetails = Boolean(
    inviteFields?.venue ||
      inviteFields?.mapUrl ||
      inviteFields?.time ||
      inviteFields?.dressCode ||
      inviteFields?.hostLine ||
      scheduleItems.length > 0
  );

  return (
    <div className="mx-auto w-full max-w-5xl space-y-10 px-4 pb-28 pt-6 sm:px-6 md:pb-16">
      {isArchived ? (
        <div
          role="status"
          className="rounded-[20px] border border-border bg-muted/60 p-4 sm:p-5 shadow-xs"
        >
          <div className="flex items-start gap-3">
            <Clock className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
            <div>
              <p className="font-heading text-sm font-bold text-foreground sm:text-base">
                Archived Celebration
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                This celebration has ended and been archived. Gifting, RSVPs, group pools, and Wall of Love posting are now closed, while memories remain viewable.
              </p>
            </div>
          </div>
        </div>
      ) : archiveRemainingHours !== null ? (
        <div
          role="status"
          className="rounded-[20px] border border-warning/40 bg-warning/10 p-4 sm:p-5 shadow-xs"
        >
          <div className="flex items-start gap-3">
            <Clock className="mt-0.5 h-5 w-5 shrink-0 text-warning" aria-hidden="true" />
            <div>
              <p className="font-heading text-sm font-bold text-foreground sm:text-base">
                Archiving in{" "}
                {archiveRemainingHours === 1
                  ? "less than 1 hr"
                  : `${archiveRemainingHours} hrs`}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                This celebration has ended and will automatically archive in{" "}
                {archiveRemainingHours === 1
                  ? "under 1 hour"
                  : `${archiveRemainingHours} hours`}
                . Late gifts, RSVPs, and Wall of Love notes are still open until then.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {/* Host Preview Notification Bar */}
      {isOwner && (
        <div className="rounded-[20px] border border-primary/25 bg-gradient-to-r from-primary/10 via-primary/5 to-accent/10 p-4 sm:p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/15 flex items-center justify-center text-primary shrink-0 ring-1 ring-primary/20">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-heading font-bold text-foreground text-sm sm:text-base">
                    Host Preview Mode
                  </p>
                  <Badge
                    variant="outline"
                    className="text-[10px] bg-primary/10 text-primary border-primary/30"
                  >
                    You are the Host
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  You are previewing this public celebration page. Guest actions (gifting yourself, RSVPing to your own event) are disabled for you.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <Button asChild size="sm" variant="default" className="text-xs rounded-full">
                <Link href={`/events/${event.id}`}>
                  <Settings className="mr-1.5 h-3.5 w-3.5" />
                  Manage Celebration
                </Link>
              </Button>
              <Button asChild size="sm" variant="outline" className="text-xs rounded-full">
                <Link href={`/events/${event.id}/rsvps`}>
                  <Users className="mr-1.5 h-3.5 w-3.5" />
                  Guestlist ({event.rsvpYesCount})
                </Link>
              </Button>
            </div>
          </div>
        </div>
      )}

      <EventHero event={event} />

      <div className="grid grid-cols-1 gap-10 md:grid-cols-12">
        {/* Left Narrative, Registry, Group Pools & Wall of Love */}
        <div className="editorial-enter stagger-1 space-y-10 md:col-span-7">
          {hasInviteDetails ? (
            <section className="paper-surface stationery-frame scroll-reveal rounded-[24px] border border-accent/45 p-6 sm:p-8">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
                {inviteFields?.hostLine || "Event Invitation Details"}
              </p>
              <h2 className="mt-1 font-heading text-2xl font-semibold text-foreground">
                Celebration Details
              </h2>

              <div className="mt-5 grid gap-3.5 border-t border-border/70 pt-4 text-sm text-foreground">
                {inviteFields?.time ? (
                  <div className="flex items-start gap-3">
                    <Clock
                      className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                      aria-hidden="true"
                    />
                    <span>{inviteFields.time}</span>
                  </div>
                ) : null}
                {inviteFields?.venue || directionsHref ? (
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex items-start gap-3">
                      <MapPin
                        className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                        aria-hidden="true"
                      />
                      <span>{inviteFields?.venue || "Event location"}</span>
                    </div>
                    {directionsHref ? (
                      <a
                        href={directionsHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-primary transition-colors hover:bg-muted"
                      >
                        <span>Get directions</span>
                        <ExternalLink className="h-3 w-3" aria-hidden="true" />
                      </a>
                    ) : null}
                  </div>
                ) : null}
                {inviteFields?.dressCode ? (
                  <div className="flex items-start gap-3">
                    <span>Dress code: {inviteFields.dressCode}</span>
                  </div>
                ) : null}
              </div>

              {scheduleItems.length > 0 ? (
                <div className="mt-6 border-t border-border/70 pt-5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    Celebration Schedule
                  </p>
                  <div className="mt-3 space-y-3">
                    {scheduleItems.map((item, idx) => {
                      const itemMapHref =
                        item.mapUrl?.trim() ||
                        (item.venue?.trim()
                          ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                              item.venue.trim()
                            )}`
                          : "");
                      return (
                        <div
                          key={`${item.title}-${idx}`}
                          className="flex flex-wrap items-start justify-between gap-2 rounded-xl border border-border/60 bg-background/60 px-4 py-3 text-sm"
                        >
                          <div className="space-y-0.5">
                            <p className="font-medium text-foreground">
                              {item.title}
                            </p>
                            {item.venue ? (
                              <p className="text-xs text-muted-foreground">
                                {item.venue}
                              </p>
                            ) : null}
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-medium text-primary">
                              {item.time}
                            </span>
                            {itemMapHref ? (
                              <a
                                href={itemMapHref}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                              >
                                <span>Map</span>
                                <ExternalLink
                                  className="h-3 w-3"
                                  aria-hidden="true"
                                />
                              </a>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </section>
          ) : null}

          {/* Our Story Editorial Card */}
          <section className="paper-surface scroll-reveal rounded-[24px] border border-border p-6 sm:p-8">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
              Chapter One
            </p>
            <h2 className="mt-1 font-heading text-2xl font-semibold text-foreground">
              Our Story
            </h2>
            <div className="mt-4 border-l-2 border-accent/60 pl-4">
              {event.story ? (
                <p className="whitespace-pre-line text-sm leading-relaxed text-foreground sm:text-base">
                  {event.story}
                </p>
              ) : (
                <p className="text-sm italic text-muted-foreground">
                  Join {event.ownerFirstName} in celebrating {event.name}.
                </p>
              )}
            </div>
          </section>

          {/* Group Gift Pools */}
          {event.pools.length > 0 ? (
            <section className="space-y-4 scroll-reveal">
              <div className="flex items-end justify-between border-b border-border/70 pb-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
                    Shared Experiences
                  </p>
                  <h2 className="font-heading text-2xl font-semibold text-foreground">
                    Group Gifts &amp; Funds
                  </h2>
                </div>
                <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                  {event.pools.length}{" "}
                  {event.pools.length === 1 ? "pool" : "pools"}
                </span>
              </div>
              <div className="space-y-4">
                {event.pools.map((pool) => (
                  <PoolCard
                    key={pool.id}
                    slug={event.slug}
                    pool={pool}
                    isOwner={isOwner}
                    isArchived={isArchived}
                  />
                ))}
              </div>
            </section>
          ) : null}

          {/* Curated Registry Items */}
          <section className="space-y-4 scroll-reveal">
            <div className="flex items-end justify-between border-b border-border/70 pb-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
                  {isOwner ? "Your Gift Registry" : "Host's Wishlist & Open Gifting"}
                </p>
                <h2 className="font-heading text-2xl font-semibold text-foreground">
                  Gift Registry
                </h2>
              </div>
              <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                {event.registry.length > 0
                  ? `${event.registry.length} ${event.registry.length === 1 ? "wish" : "wishes"}`
                  : "Open gifting"}
              </span>
            </div>

            <RegistryGrid
              slug={event.slug}
              items={event.registry}
              moneyGiftsEnabled={event.moneyGiftsEnabled}
              isOwner={isOwner}
              isArchived={isArchived}
            />
          </section>

          <WallOfLove
            slug={event.slug}
            ownerFirstName={event.ownerFirstName}
            isOwner={isOwner}
            isArchived={isArchived}
          />
        </div>

        {/* Right Sticky Concierge & RSVP Column */}
        <aside className="editorial-enter stagger-2 space-y-6 md:col-span-5">
          <div className="md:sticky md:top-24 space-y-6">
            {/* Gifting Card: Archived, Host Invite & Share, or Guest Send Blessing */}
            {isArchived ? (
              <div className="paper-surface rounded-[24px] border border-border bg-card p-6 sm:p-7 space-y-3">
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Gifting Closed</span>
                </div>
                <h3 className="font-heading text-xl font-semibold text-foreground">
                  Celebration Archived
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  This celebration has ended and is no longer accepting cash blessings, pool contributions, or registry gifts.
                </p>
              </div>
            ) : isOwner ? (
              <div className="paper-surface stationery-frame rounded-[24px] border border-primary/20 bg-card p-6 sm:p-7 space-y-4">
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
                  <Share2 className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                  <span>Host Gifting &amp; Registry</span>
                </div>
                <h3 className="font-heading text-xl font-semibold text-foreground">
                  Invite Guests &amp; Receive Gifts
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Your celebration registry is live. Share your link with friends, family, and diaspora guests so they can send cash gifts, airtime, and gifts from your registry.
                </p>

                <div className="space-y-2 pt-1">
                  <Button
                    type="button"
                    size="lg"
                    className="w-full rounded-full shadow-xs gap-2"
                    onClick={() => {
                      const shareUrl =
                        typeof window !== "undefined"
                          ? window.location.href
                          : `/e/${event.slug}`;
                      const text = `Join me in celebrating ${event.name}! You can view the event details, RSVP, and see my gift registry here: ${shareUrl}`;
                      window.open(
                        `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`,
                        "_blank"
                      );
                    }}
                  >
                    <Share2 className="h-4 w-4" />
                    <span>Share on WhatsApp</span>
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full rounded-full text-xs gap-2"
                    onClick={() => {
                      if (typeof window !== "undefined") {
                        navigator.clipboard.writeText(window.location.href);
                        setCopiedLink(true);
                        toast.success("Celebration link copied to clipboard!");
                        setTimeout(() => setCopiedLink(false), 2000);
                      }
                    }}
                  >
                    {copiedLink ? (
                      <Check className="h-3.5 w-3.5 text-success" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                    <span>{copiedLink ? "Link Copied!" : "Copy Celebration Link"}</span>
                  </Button>

                  <Button
                    asChild
                    variant="ghost"
                    size="sm"
                    className="w-full rounded-full text-xs text-muted-foreground hover:text-primary"
                  >
                    <Link href={`/events/${event.id}`}>
                      Add more gifts or manage payout account →
                    </Link>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="paper-surface stationery-frame rounded-[24px] border border-border p-6 sm:p-7">
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
                  <Heart className="h-3.5 w-3.5 fill-primary" aria-hidden="true" />
                  <span>Send a Blessing</span>
                </div>
                <h3 className="mt-1.5 font-heading text-2xl font-semibold text-foreground">
                  Celebrate with {event.ownerFirstName}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  Send a cash blessing in Naira (with USD, GBP &amp; EUR previews
                  for diaspora guests), gift Airtime &amp; Data, or pick any gift
                  from the catalog—whether or not it&apos;s on the registry.
                </p>

                <div className="mt-5 space-y-2.5">
                  {!event.moneyGiftsEnabled ? (
                    <div className="flex items-start gap-2 rounded-2xl border border-border bg-muted/50 p-3.5 text-xs text-muted-foreground">
                      <AlertTriangle
                        className="mt-0.5 h-4 w-4 shrink-0 text-warning"
                        aria-hidden="true"
                      />
                      <span>
                        Money gifts are not enabled for this event yet, but you
                        can still gift Airtime, Data, or a Catalog keepsake below.
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <Button
                        type="button"
                        size="lg"
                        className="w-full rounded-full shadow-xs editorial-lift"
                        onClick={() => setGiveDialogOpen(true)}
                      >
                        <Gift className="h-4 w-4" aria-hidden="true" />
                        <span>Send a Cash Gift</span>
                      </Button>
                      <Button
                        asChild
                        variant="ghost"
                        size="sm"
                        className="w-full rounded-full text-xs text-muted-foreground hover:text-primary"
                      >
                        <Link href={`/e/${event.slug}/give`}>
                          Open dedicated gift &amp; diaspora page →
                        </Link>
                      </Button>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="w-full rounded-full text-xs"
                    >
                      <Link
                        href={`/digital?event=${encodeURIComponent(event.slug)}`}
                      >
                        <Smartphone className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Airtime &amp; Data</span>
                      </Link>
                    </Button>
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="w-full rounded-full text-xs"
                    >
                      <Link
                        href={`/gifts?event=${encodeURIComponent(event.slug)}`}
                      >
                        <ShoppingBag className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Gift Catalog</span>
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* RSVP Section: Archived, Host Attendance Card, or Guest RsvpForm */}
            {isArchived ? (
              <div
                id="rsvp-section"
                className="paper-surface rounded-[24px] border border-border p-6 sm:p-7 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                    RSVPs Closed
                  </p>
                  <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
                    {event.rsvpYesCount} attended
                  </span>
                </div>
                <h3 className="font-heading text-xl font-semibold text-foreground">
                  Guestlist Archived
                </h3>
                <p className="text-sm text-muted-foreground">
                  RSVPs are closed because this celebration has been archived.
                </p>
              </div>
            ) : isOwner ? (
              <div
                id="rsvp-section"
                className="paper-surface rounded-[24px] border border-border p-6 sm:p-7 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
                      Host Attendance
                    </p>
                    <h3 className="mt-1 font-heading text-xl font-semibold text-foreground">
                      Guestlist &amp; Attendance
                    </h3>
                  </div>
                  <span className="rounded-full border border-accent/40 bg-accent/15 px-3 py-1 text-xs font-semibold text-foreground">
                    {event.rsvpYesCount} attending
                  </span>
                </div>

                <div className="rounded-2xl border border-border/80 bg-muted/20 p-4 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    <span>You are confirmed as Host</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    As the event host, you are already confirmed. You do not need to RSVP. Track confirmed attendees, plus-ones, and guest dietary notes directly in your dashboard.
                  </p>
                </div>

                <Button asChild size="sm" className="w-full rounded-full text-xs">
                  <Link href={`/events/${event.id}/rsvps`}>
                    <Users className="mr-1.5 h-3.5 w-3.5" />
                    <span>Manage Guestlist &amp; View All RSVPs</span>
                  </Link>
                </Button>
              </div>
            ) : (
              <div
                id="rsvp-section"
                className="paper-surface rounded-[24px] border border-border p-6 sm:p-7"
              >
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
                      Répondez S&apos;il Vous Plaît
                    </p>
                    <h3 className="mt-1 font-heading text-xl font-semibold text-foreground">
                      RSVP to Attend
                    </h3>
                  </div>
                  <span className="rounded-full border border-accent/40 bg-accent/15 px-3 py-1 text-xs font-semibold text-foreground">
                    {event.rsvpYesCount} attending
                  </span>
                </div>

                <RsvpForm
                  slug={event.slug}
                  ownerFirstName={event.ownerFirstName}
                  allowPlusOne={event.allowPlusOne}
                  moneyGiftsEnabled={event.moneyGiftsEnabled}
                  onOpenGiveDialog={() => setGiveDialogOpen(true)}
                />
              </div>
            )}
          </div>
        </aside>
      </div>

      {!isArchived ? (
        <GiveButtonBar
          slug={event.slug}
          moneyGiftsEnabled={event.moneyGiftsEnabled}
          onOpenGiveDialog={() => setGiveDialogOpen(true)}
          isOwner={isOwner}
          eventId={event.id}
          eventName={event.name}
        />
      ) : null}

      <GiveDialog
        open={giveDialogOpen}
        onOpenChange={setGiveDialogOpen}
        slug={event.slug}
        eventName={event.name}
        ownerFirstName={event.ownerFirstName}
        moneyGiftsEnabled={event.moneyGiftsEnabled}
        eventType={event.type}
        eventDate={event.date}
        eventStory={event.story}
      />
    </div>
  );
}

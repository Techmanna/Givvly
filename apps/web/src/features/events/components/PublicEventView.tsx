"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Clock,
  Gift,
  Heart,
  MapPin,
  ShoppingBag,
  Smartphone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { GiveDialog } from "@/features/gifts";
import { WallOfLove } from "@/features/moderation";
import { PoolCard, RegistryGrid } from "@/features/registry";
import { RsvpForm } from "@/features/rsvp";
import type { PublicEvent } from "../types";
import { EventHero } from "./EventHero";
import { GiveButtonBar } from "./GiveButtonBar";

export type PublicEventViewProps = {
  event: PublicEvent;
};

export function PublicEventView({ event }: PublicEventViewProps) {
  const [giveDialogOpen, setGiveDialogOpen] = useState(false);

  const inviteFields = event.template?.fields;
  const hasInviteDetails = Boolean(
    inviteFields?.venue ||
      inviteFields?.time ||
      inviteFields?.dressCode ||
      inviteFields?.hostLine
  );

  return (
    <div className="mx-auto w-full max-w-5xl space-y-12 px-4 pb-28 pt-8 sm:px-6 md:pb-16">
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
                {inviteFields?.venue ? (
                  <div className="flex items-start gap-3">
                    <MapPin
                      className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                      aria-hidden="true"
                    />
                    <span>{inviteFields.venue}</span>
                  </div>
                ) : null}
                {inviteFields?.dressCode ? (
                  <div className="flex items-start gap-3">
                    <span>Dress code: {inviteFields.dressCode}</span>
                  </div>
                ) : null}
              </div>
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
                  <PoolCard key={pool.id} slug={event.slug} pool={pool} />
                ))}
              </div>
            </section>
          ) : null}

          {/* Curated Registry Items */}
          <section className="space-y-4 scroll-reveal">
            <div className="flex items-end justify-between border-b border-border/70 pb-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
                  Host&apos;s Wishlist &amp; Open Gifting
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
            />
          </section>

          <WallOfLove
            slug={event.slug}
            ownerFirstName={event.ownerFirstName}
          />
        </div>

        {/* Right Sticky Concierge & RSVP Column */}
        <aside className="editorial-enter stagger-2 space-y-6 md:col-span-5">
          <div className="md:sticky md:top-24 space-y-6">
            {/* Send Your Blessing Card */}
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
                      href={`/catalog?event=${encodeURIComponent(event.slug)}`}
                    >
                      <ShoppingBag className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Gift Catalog</span>
                    </Link>
                  </Button>
                </div>
              </div>
            </div>

            {/* RSVP Stationery Card */}
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
          </div>
        </aside>
      </div>

      <GiveButtonBar
        slug={event.slug}
        moneyGiftsEnabled={event.moneyGiftsEnabled}
        onOpenGiveDialog={() => setGiveDialogOpen(true)}
      />

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

"use client";

import Link from "next/link";
import { Gift, Users, Share2, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";

export type GiveButtonBarProps = {
  slug: string;
  moneyGiftsEnabled: boolean;
  onOpenGiveDialog?: () => void;
  isOwner?: boolean;
  eventId?: string;
  eventName?: string;
};

export function GiveButtonBar({
  slug,
  moneyGiftsEnabled,
  onOpenGiveDialog,
  isOwner = false,
  eventId,
  eventName = "Celebration",
}: GiveButtonBarProps) {
  if (isOwner) {
    return (
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border/80 bg-background/90 p-3.5 backdrop-blur-md md:hidden">
        <div className="mx-auto flex max-w-5xl items-center gap-3">
          <Button
            type="button"
            className="flex-1 rounded-full shadow-xs"
            onClick={() => {
              const url = typeof window !== "undefined" ? window.location.href : `/e/${slug}`;
              const text = `Join me in celebrating ${eventName}! You can RSVP, view the registry, and send gifts here: ${url}`;
              window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, "_blank");
            }}
          >
            <Share2 className="h-4 w-4" aria-hidden="true" />
            <span>Share Link</span>
          </Button>

          {eventId && (
            <Button asChild variant="outline" className="flex-1 rounded-full bg-card">
              <Link href={`/events/${eventId}`}>
                <Settings className="h-4 w-4" aria-hidden="true" />
                <span>Manage Event</span>
              </Link>
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border/80 bg-background/90 p-3.5 backdrop-blur-md md:hidden">
      <div className="mx-auto flex max-w-5xl items-center gap-3">
        {moneyGiftsEnabled && onOpenGiveDialog ? (
          <Button
            type="button"
            className="flex-1 rounded-full shadow-xs"
            onClick={onOpenGiveDialog}
          >
            <Gift className="h-4 w-4" aria-hidden="true" />
            <span>Send gift</span>
          </Button>
        ) : (
          <Button asChild className="flex-1 rounded-full shadow-xs">
            <Link href={`/e/${slug}/give`}>
              <Gift className="h-4 w-4" aria-hidden="true" />
              <span>{moneyGiftsEnabled ? "Send gift" : "View gift options"}</span>
            </Link>
          </Button>
        )}
        <Button asChild variant="outline" className="flex-1 rounded-full bg-card">
          <a href="#rsvp-section">
            <Users className="h-4 w-4" aria-hidden="true" />
            <span>RSVP</span>
          </a>
        </Button>
      </div>
    </div>
  );
}

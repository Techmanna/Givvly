"use client";

import * as React from "react";
import {
  Award,
  Baby,
  CalendarHeart,
  Expand,
  Gift,
  GraduationCap,
  Heart,
  HeartHandshake,
  Home,
  Maximize2,
  Minimize2,
  PartyPopper,
  Plane,
  Sparkles,
  Sun,
} from "lucide-react";
import type { EventType } from "@givvly/contracts";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { isVideoMediaUrl } from "@/features/events/api";
import { cn } from "@/lib/cn";

export type EventCoverProps = {
  name: string;
  type: EventType;
  coverUrl?: string;
  /**
   * "hero" is used on the main PublicEventView header (responsive 4:3 -> 16:9 stage with Fit/Fill & Lightbox controls).
   * "card" is used on directory/grid cards (consistent 16:10 frame with ambient backdrop so portraits & flyers never clip).
   */
  variant?: "hero" | "card";
  className?: string;
};

function getEventIcon(type: EventType) {
  switch (type) {
    case "WEDDING":
      return <Heart className="h-10 w-10 text-primary" aria-hidden="true" />;
    case "BIRTHDAY":
      return (
        <PartyPopper className="h-10 w-10 text-primary" aria-hidden="true" />
      );
    case "HOUSEWARMING":
      return <Home className="h-10 w-10 text-primary" aria-hidden="true" />;
    case "ANNIVERSARY":
      return (
        <HeartHandshake className="h-10 w-10 text-primary" aria-hidden="true" />
      );
    case "BRIDAL_SHOWER":
      return <Sparkles className="h-10 w-10 text-primary" aria-hidden="true" />;
    case "BABY_SHOWER":
      return <Gift className="h-10 w-10 text-primary" aria-hidden="true" />;
    case "NAMING_CEREMONY":
      return <Baby className="h-10 w-10 text-primary" aria-hidden="true" />;
    case "GRADUATION":
      return (
        <GraduationCap className="h-10 w-10 text-primary" aria-hidden="true" />
      );
    case "SEND_OFF":
      return <Plane className="h-10 w-10 text-primary" aria-hidden="true" />;
    case "RETIREMENT":
      return <Award className="h-10 w-10 text-primary" aria-hidden="true" />;
    case "MEMORIAL":
      return <Sun className="h-10 w-10 text-primary" aria-hidden="true" />;
    default:
      return (
        <CalendarHeart className="h-10 w-10 text-primary" aria-hidden="true" />
      );
  }
}

export function EventCover({
  name,
  type,
  coverUrl,
  variant = "hero",
  className,
}: EventCoverProps) {
  const [fitMode, setFitMode] = React.useState<"contain" | "cover">("contain");
  const [lightboxOpen, setLightboxOpen] = React.useState(false);

  const aspectClasses =
    variant === "card"
      ? "aspect-[16/10]"
      : "aspect-[4/3] sm:aspect-[16/9] max-h-[540px]";

  if (coverUrl) {
    const isVideo = isVideoMediaUrl(coverUrl);
    return (
      <>
        <div
          className={cn(
            "group/cover relative w-full overflow-hidden rounded-card border border-border bg-[#1E1617]",
            aspectClasses,
            className
          )}
        >
          {/* Ambient color-matched blurred studio backdrop so any image aspect ratio fills the frame without harsh bars */}
          {!isVideo ? (
            <div
              aria-hidden="true"
              style={{ backgroundImage: `url("${coverUrl}")` }}
              className="pointer-events-none absolute inset-0 scale-110 bg-cover bg-center opacity-55 blur-2xl saturate-125 transition-opacity duration-300"
            />
          ) : null}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-black/10"
          />

          {isVideo ? (
            <video
              src={coverUrl}
              controls
              preload="metadata"
              playsInline
              className="relative z-10 h-full w-full object-contain"
            />
          ) : (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={coverUrl}
              alt={name}
              onClick={
                variant === "hero" ? () => setLightboxOpen(true) : undefined
              }
              className={cn(
                "relative z-10 h-full w-full transition-all duration-300",
                fitMode === "contain"
                  ? "object-contain drop-shadow-md"
                  : "object-cover object-[center_20%]",
                variant === "hero" && "cursor-zoom-in"
              )}
            />
          )}

          {/* Hero controls: Switch between Fit (uncropped) and Fill (upper-third focal crop) + Fullscreen Lightbox */}
          {!isVideo && variant === "hero" ? (
            <div className=" absolute right-3 bottom-3 z-20 flex items-center gap-1.5 opacity-90 transition-opacity sm:opacity-0 sm:group-hover/cover:opacity-100 focus-within:opacity-100">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setFitMode((prev) =>
                    prev === "contain" ? "cover" : "contain"
                  );
                }}
                aria-label={
                  fitMode === "contain"
                    ? "Fill frame with image"
                    : "Fit full image without cropping"
                }
                className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-black/65 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-md transition-colors hover:bg-black/80"
              >
                {fitMode === "contain" ? (
                  <>
                    <Maximize2 className="h-3 w-3" aria-hidden="true" />
                    <span>Fill frame</span>
                  </>
                ) : (
                  <>
                    <Minimize2 className="h-3 w-3" aria-hidden="true" />
                    <span>Fit full photo</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxOpen(true);
                }}
                aria-label="View full cover photo"
                className="inline-flex items-center gap-1 rounded-full border border-white/25 bg-black/65 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-md transition-colors hover:bg-black/80"
              >
                <Expand className="h-3 w-3" aria-hidden="true" />
                <span className="hidden sm:inline">Full view</span>
              </button>
            </div>
          ) : null}
        </div>

        {!isVideo && variant === "hero" ? (
          <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
            <DialogContent className="max-w-4xl border-white/15 bg-black/95 p-2 sm:p-4">
              <DialogTitle className="sr-only">{name}</DialogTitle>
              <div className="flex max-h-[85vh] items-center justify-center overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={coverUrl}
                  alt={name}
                  className="max-h-[82vh] w-auto max-w-full rounded-lg object-contain"
                />
              </div>
            </DialogContent>
          </Dialog>
        ) : null}
      </>
    );
  }

  return (
    <div
      className={cn(
        "flex w-full flex-col items-center justify-center gap-2 rounded-card border border-border bg-gradient-to-br from-primary/15 via-background to-accent/20 p-6 text-center",
        aspectClasses,
        className
      )}
    >
      {getEventIcon(type)}
      <span className="font-heading text-lg font-semibold text-foreground">
        {name}
      </span>
    </div>
  );
}

 

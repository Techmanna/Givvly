"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { isVideoMediaUrl } from "@/features/events/api";

export type LightboxMediaItem = {
  url: string;
  type?: string | null;
  alt?: string;
  caption?: string;
};

export type MediaLightboxModalProps = {
  items: LightboxMediaItem[];
  activeIndex: number | null;
  onClose: () => void;
  onIndexChange?: (index: number) => void;
  title?: string;
  subtitle?: string;
};

/**
 * Reusable lightbox modal for previewing images and videos in a larger view,
 * with previous/next controls and keyboard arrow navigation.
 */
export function MediaLightboxModal({
  items,
  activeIndex,
  onClose,
  onIndexChange,
  title = "Media preview",
  subtitle,
}: MediaLightboxModalProps) {
  const [internalIndex, setInternalIndex] = useState(0);

  const isOpen = activeIndex !== null && items.length > 0;
  const resolvedIndex =
    activeIndex !== null
      ? Math.min(Math.max(activeIndex, 0), Math.max(0, items.length - 1))
      : internalIndex;

  const goTo = (nextIndex: number) => {
    if (items.length === 0) return;
    const wrapped = (nextIndex + items.length) % items.length;
    if (onIndexChange) {
      onIndexChange(wrapped);
    } else {
      setInternalIndex(wrapped);
    }
  };

  useEffect(() => {
    if (!isOpen || items.length <= 1) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        goTo(resolvedIndex - 1);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        goTo(resolvedIndex + 1);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  if (!isOpen) {
    return null;
  }

  const currentItem = items[resolvedIndex];
  if (!currentItem) {
    return null;
  }

  const isVideo = isVideoMediaUrl(currentItem.url, currentItem.type);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl gap-3 p-4 sm:p-6">
        <DialogHeader className="pr-8 text-left">
          <DialogTitle className="text-base">{title}</DialogTitle>
          {subtitle || items.length > 1 ? (
            <DialogDescription className="flex items-center gap-2 text-xs">
              {subtitle ? <span>{subtitle}</span> : null}
              {subtitle && items.length > 1 ? <span>•</span> : null}
              {items.length > 1 ? (
                <span>
                  {resolvedIndex + 1} of {items.length}
                </span>
              ) : null}
            </DialogDescription>
          ) : null}
        </DialogHeader>

        <div className="relative flex items-center justify-center overflow-hidden rounded-control border border-border bg-black/90">
          {isVideo ? (
            <video
              key={currentItem.url}
              src={currentItem.url}
              controls
              autoPlay
              playsInline
              className="max-h-[75vh] w-full object-contain"
            />
          ) : (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              key={currentItem.url}
              src={currentItem.url}
              alt={currentItem.alt ?? `${title} (${resolvedIndex + 1})`}
              className="max-h-[75vh] w-full object-contain"
            />
          )}

          {items.length > 1 ? (
            <>
              <Button
                type="button"
                size="icon"
                variant="secondary"
                aria-label="Previous media"
                onClick={() => goTo(resolvedIndex - 1)}
                className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-background/85 border border-primary backdrop-blu-xs hover:bg-background"
              >
                <ChevronLeft className="h-4 w-4 text-primary " aria-hidden="true" />
              </Button>
              <Button
                type="button"
                size="icon"
                variant="secondary"
                aria-label="Next media"
                onClick={() => goTo(resolvedIndex + 1)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-background/85 border border-primary backdrop-blur-xs hover:bg-background"
              >
                <ChevronRight className="h-4 w-4 text-primary" aria-hidden="true" />
              </Button>
            </>
          ) : null}
        </div>

        {currentItem.caption ? (
          <p className="text-xs text-muted-foreground">{currentItem.caption}</p>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

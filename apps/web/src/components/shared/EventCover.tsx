import { CalendarHeart, Gift, GraduationCap, Heart, PartyPopper } from "lucide-react";
import type { EventType } from "@givvly/contracts";
import { isVideoMediaUrl } from "@/features/events/api";
import { cn } from "@/lib/cn";

export type EventCoverProps = {
  name: string;
  type: EventType;
  coverUrl?: string;
  className?: string;
};

function getEventIcon(type: EventType) {
  switch (type) {
    case "WEDDING":
      return <Heart className="h-10 w-10 text-primary" aria-hidden="true" />;
    case "BIRTHDAY":
      return <PartyPopper className="h-10 w-10 text-primary" aria-hidden="true" />;
    case "GRADUATION":
      return <GraduationCap className="h-10 w-10 text-primary" aria-hidden="true" />;
    case "BABY_SHOWER":
      return <Gift className="h-10 w-10 text-primary" aria-hidden="true" />;
    default:
      return <CalendarHeart className="h-10 w-10 text-primary" aria-hidden="true" />;
  }
}

export function EventCover({
  name,
  type,
  coverUrl,
  className,
}: EventCoverProps) {
  if (coverUrl) {
    const isVideo = isVideoMediaUrl(coverUrl);
    return (
      <div
        className={cn(
          "relative aspect-[2/1] w-full overflow-hidden rounded-card border border-border bg-muted",
          className
        )}
      >
        {isVideo ? (
          <video
            src={coverUrl}
            controls
            preload="metadata"
            playsInline
            className="h-full w-full object-cover"
          />
        ) : (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={coverUrl}
            alt={name}
            className="h-full w-full object-cover"
          />
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex aspect-[2/1] w-full flex-col items-center justify-center gap-2 rounded-card border border-border bg-gradient-to-br from-primary/15 via-background to-accent/20 p-6 text-center",
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

 

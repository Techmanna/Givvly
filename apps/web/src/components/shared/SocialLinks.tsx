import { Mail } from "lucide-react";
import {
  SITE_CONTACT,
  SITE_SOCIALS,
  type SocialPlatform,
} from "@/lib/constants";
import { cn } from "@/lib/cn";

function SocialPlatformIcon({
  platform,
  className = "h-4 w-4",
}: {
  platform: SocialPlatform;
  className?: string;
}) {
  switch (platform) {
    case "facebook":
      return (
        <svg
          viewBox="0 0 24 24"
          fill="currentColor"
          className={className}
          aria-hidden="true"
        >
          <path d="M13.5 21v-7.5h2.5l.375-3H13.5V8.625c0-.87.242-1.462 1.49-1.462h1.592V4.477A21.2 21.2 0 0 0 14.26 4.35c-2.297 0-3.87 1.402-3.87 3.977V10.5H7.8v3h2.59V21h3.11Z" />
        </svg>
      );
    case "instagram":
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={className}
          aria-hidden="true"
        >
          <rect width="18" height="18" x="3" y="3" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
        </svg>
      );
    case "x":
      return (
        <svg
          viewBox="0 0 24 24"
          fill="currentColor"
          className={className}
          aria-hidden="true"
        >
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.451-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z" />
        </svg>
      );
    case "tiktok":
      return (
        <svg
          viewBox="0 0 24 24"
          fill="currentColor"
          className={className}
          aria-hidden="true"
        >
          <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.7a8.18 8.18 0 0 0 4.76 1.52v-3.4a4.85 4.85 0 0 1-1-.13Z" />
        </svg>
      );
  }
}

export interface SocialLinksProps {
  className?: string;
  includeEmail?: boolean;
}

/**
 * Renders Givvly's official social media icon links (and optional email link)
 * sourced from the static `SITE_SOCIALS` and `SITE_CONTACT` constants.
 */
export function SocialLinks({
  className,
  includeEmail = true,
}: SocialLinksProps) {
  return (
    <div
      className={cn("flex flex-wrap items-center gap-2.5", className)}
      aria-label="Givvly social media links"
    >
      {SITE_SOCIALS.map((item) => (
        <a
          key={item.platform}
          href={item.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Follow Givvly on ${item.label} (${item.handle})`}
          title={`${item.label} • ${item.handle}`}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border/80 bg-background/80 text-muted-foreground transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
        >
          <SocialPlatformIcon platform={item.platform} className="h-4 w-4" />
        </a>
      ))}

      {includeEmail && (
        <a
          href={SITE_CONTACT.mailto}
          aria-label={`Email Givvly at ${SITE_CONTACT.email}`}
          title={`Email ${SITE_CONTACT.email}`}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border/80 bg-background/80 text-muted-foreground transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
        >
          <Mail className="h-4 w-4" aria-hidden="true" />
        </a>
      )}
    </div>
  );
}

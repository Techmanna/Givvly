"use client";

import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/shared/CopyButton";
import { WhatsAppIcon } from "@/components/shared/WhatsAppOrderSection";
import { cn } from "@/lib/cn";

function XSocialIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function FacebookSocialIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

export type ShareMenuProps = {
  url: string;
  title: string;
  className?: string;
};

export function ShareMenu({ url, title, className }: ShareMenuProps) {
  const shareText = `Celebrate ${title} on Givvly: ${url}`;
  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
  const xHref = `https://x.com/intent/tweet?text=${encodeURIComponent(
    `Celebrate ${title} on Givvly`
  )}&url=${encodeURIComponent(url)}`;
  const facebookHref = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
    url
  )}`;

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <CopyButton value={url} label="Copy link" size="sm" />

      <Button
        asChild
        variant="outline"
        size="icon"
        className="h-9 w-9 rounded-full border-[#20BA5A]/30 bg-[#20BA5A]/10 text-[#20BA5A] hover:border-[#20BA5A]/50 hover:bg-[#20BA5A]/20 hover:text-[#199948]"
      >
        <a
          href={whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Share on WhatsApp"
          title="Share on WhatsApp"
        >
          <WhatsAppIcon className="h-4 w-4" />
        </a>
      </Button>

      <Button
        asChild
        variant="outline"
        size="icon"
        className="h-9 w-9 rounded-full text-foreground hover:border-foreground/30 hover:bg-muted"
      >
        <a
          href={xHref}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Post on X"
          title="Post on X"
        >
          <XSocialIcon className="h-3.5 w-3.5" />
        </a>
      </Button>

      <Button
        asChild
        variant="outline"
        size="icon"
        className="h-9 w-9 rounded-full border-[#1877F2]/25 bg-[#1877F2]/10 text-[#1877F2] hover:border-[#1877F2]/45 hover:bg-[#1877F2]/20"
      >
        <a
          href={facebookHref}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Share on Facebook"
          title="Share on Facebook"
        >
          <FacebookSocialIcon className="h-4 w-4" />
        </a>
      </Button>
    </div>
  );
}


"use client";

import { Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/shared/CopyButton";
import { cn } from "@/lib/cn";

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
      <CopyButton value={url} label="Copy link" />
      <Button asChild variant="secondary">
        <a href={whatsappHref} target="_blank" rel="noopener noreferrer">
          <Share2 className="h-4 w-4" aria-hidden="true" />
          <span>Share on WhatsApp</span>
        </a>
      </Button>
      <Button asChild variant="outline">
        <a href={xHref} target="_blank" rel="noopener noreferrer">
          <span>Post on X</span>
        </a>
      </Button>
      <Button asChild variant="outline">
        <a href={facebookHref} target="_blank" rel="noopener noreferrer">
          <span>Share on Facebook</span>
        </a>
      </Button>
    </div>
  );
}


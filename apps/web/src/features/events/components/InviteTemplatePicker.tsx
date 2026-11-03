"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/cn";
import type { InviteTemplateId } from "../types";

export type InviteTemplateOption = {
  id: InviteTemplateId;
  name: string;
  subtitle: string;
  cardClassName: string;
};

export const INVITE_TEMPLATE_OPTIONS: InviteTemplateOption[] = [
  {
    id: "blush-minimal",
    name: "Blush Minimal",
    subtitle: "Warm ivory card with rose typography and subtle border",
    cardClassName: "border-primary/40 bg-card",
  },
  {
    id: "royal-gold",
    name: "Royal Gold",
    subtitle: "Champagne gold accents framed for milestone celebrations",
    cardClassName: "border-accent bg-accent/10",
  },
  {
    id: "lagos-botanical",
    name: "Lagos Botanical",
    subtitle: "Earthy garden tones with classic serif headings",
    cardClassName: "border-success/40 bg-success/5",
  },
  {
    id: "modern-editorial",
    name: "Modern Editorial",
    subtitle: "High-contrast magazine layout with clean lines",
    cardClassName: "border-foreground/30 bg-muted/40",
  },
];

export type InviteTemplatePickerProps = {
  selectedId: InviteTemplateId;
  onSelect: (id: InviteTemplateId) => void;
};

export function InviteTemplatePicker({
  selectedId,
  onSelect,
}: InviteTemplatePickerProps) {
  return (
    <div
      className="grid grid-cols-1 gap-3 sm:grid-cols-2"
      role="radiogroup"
      aria-label="Invite templates"
    >
      {INVITE_TEMPLATE_OPTIONS.map((tpl) => {
        const isSelected = selectedId === tpl.id;
        return (
          <button
            key={tpl.id}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() => onSelect(tpl.id)}
            className={cn(
              "flex flex-col justify-between rounded-card border-2 p-4 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
              tpl.cardClassName,
              isSelected
                ? "ring-2 ring-primary"
                : "opacity-85 hover:opacity-100"
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-1.5 font-heading text-base font-semibold text-foreground">
                <span>{tpl.name}</span>
              </div>
              {isSelected ? (
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Check className="h-3 w-3" aria-hidden="true" />
                </span>
              ) : null}
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">
              {tpl.subtitle}
            </p>
          </button>
        );
      })}
    </div>
  );
}


"use client";

import { ShieldCheck, MapPin, MessageCircle } from "lucide-react";

export function WhatsAppIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

export type WhatsAppOrderSectionProps = {
  href: string;
  buttonLabel?: string;
  showTrustBadges?: boolean;
  className?: string;
};

export function WhatsAppOrderSection({
  href,
  buttonLabel = "Chat on WhatsApp to order",
  showTrustBadges = true,
  className = "",
}: WhatsAppOrderSectionProps) {
  return (
    <div className={`space-y-4 ${className}`}>
      {/* 4 Trust Indicators styled in Givvly Blush & Gold identity */}
      {/* {showTrustBadges && (
        <div className="rounded-2xl border border-blush/25 bg-[#FAF3EF]/60 p-4 backdrop-blur-xs">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <ShieldCheck className="h-4 w-4" />
              </span>
              <div>
                <p className="text-xs font-semibold text-foreground">
                  Secure Pay
                </p>
                <p className="text-[10px] text-muted-foreground">
                  Bank-grade escrow
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/20 text-accent-foreground">
                <MapPin className="h-4 w-4 text-[#D4A959]" />
              </span>
              <div>
                <p className="text-xs font-semibold text-foreground">
                  All 36 States
                </p>
                <p className="text-[10px] text-muted-foreground">
                  Doorstep tracked
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
                <MessageCircle className="h-4 w-4" />
              </span>
              <div>
                <p className="text-xs font-semibold text-foreground">
                  Concierge
                </p>
                <p className="text-[10px] text-muted-foreground">
                  Direct WhatsApp
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-amber-600">
              </span>
              <div>
                <p className="text-xs font-semibold text-foreground">
                  Curated
                </p>
                <p className="text-[10px] text-muted-foreground">
                  Custom wrapping
                </p>
              </div>
            </div>
          </div>
        </div>
      )} */}

      {/* Prominent WhatsApp Green Button styled as a modern luxury pill */}
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="group relative flex w-full items-center justify-center gap-2.5 rounded-full bg-[#20BA5A] px-6 py-3.5 text-center  text-sm font-semibold text-white shadow-soft transition-all duration-300 hover:shadow-card hover:-translate-y-0.5 active:translate-y-0"
      >
        <WhatsAppIcon className="h-5 w-5 fill-white transition-transform duration-300 group-hover:scale-110" />
        <span className="tracking-wide">{buttonLabel}</span>
      </a>
    </div>
  );
}

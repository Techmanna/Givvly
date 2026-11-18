"use client";

import { usePathname } from "next/navigation";
import { SITE_CONTACT } from "@/lib/constants";

const HIDDEN_PREFIXES = ["/admin", "/vendor"];

/**
 * Floating WhatsApp concierge button anchored to the bottom-right corner
 * on customer, marketing, and public event pages.
 */
export function FloatingWhatsAppButton() {
  const pathname = usePathname();

  if (pathname && HIDDEN_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return null;
  }

  return (
    <a
      href={SITE_CONTACT.whatsappGreetingUrl}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Chat with Givvly on WhatsApp (${SITE_CONTACT.whatsappDisplay})`}
      title={`Chat with Givvly on WhatsApp (${SITE_CONTACT.whatsappDisplay})`}
      className="fixed bottom-5 right-5 z-40 inline-flex h-13 w-13 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg shadow-[#25D366]/30 ring-4 ring-background/90 transition-all duration-200 hover:scale-105 hover:bg-[#20BD5A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25D366] focus-visible:ring-offset-2 sm:bottom-6 sm:right-6 sm:h-14 sm:w-14"
    >
      <svg
        viewBox="0 0 24 24"
        fill="currentColor"
        className="h-7 w-7"
        aria-hidden="true"
      >
        <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.86 9.86 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm5.77 14.07c-.24.68-1.42 1.3-1.97 1.38-.51.08-1.15.11-1.85-.11-.43-.14-.98-.32-1.69-.63-2.97-1.28-4.91-4.27-5.06-4.47-.15-.2-1.21-1.61-1.21-3.07 0-1.46.76-2.18 1.03-2.48.27-.3.59-.38.79-.38h.57c.18 0 .43-.07.67.51.24.59.84 2.04.91 2.19.08.15.13.33.03.53-.1.2-.15.33-.3.5-.15.18-.32.4-.45.54-.15.15-.31.32-.13.62.18.3.79 1.3 1.7 2.11 1.17 1.04 2.15 1.37 2.45 1.52.3.15.48.13.66-.08.18-.2.76-.89.96-1.19.2-.3.4-.25.67-.15.27.1 1.74.82 2.04.97.3.15.5.22.57.34.08.13.08.73-.16 1.41Z" />
      </svg>
    </a>
  );
}

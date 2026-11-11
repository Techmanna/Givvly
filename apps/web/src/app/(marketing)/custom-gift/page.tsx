import type { Metadata } from "next";
import { BespokeWishBuilder } from "@/features/orders";

export const metadata: Metadata = {
  title: "Bespoke Concierge Gift Package — Givvly",
  description:
    "Request custom luxury gift packages without creating an event. Add store links, reference photos, custom specs, and signature keepsake packaging. Our concierge sources and quotes verified pricing for doorstep delivery.",
  openGraph: {
    title: "Bespoke Concierge Gift Package — Givvly",
    description:
      "Design your custom luxury gift package. We source authentic items, package them in Givvly signature velvet boxes, and deliver them to your loved ones across Nigeria.",
    images: [
      {
        url: "/images/og-preview.jpg",
        width: 1024,
        height: 614,
        alt: "Givvly Bespoke Concierge Gift Package",
      },
    ],
  },
};

export default function CustomGiftPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <BespokeWishBuilder />
    </div>
  );
}

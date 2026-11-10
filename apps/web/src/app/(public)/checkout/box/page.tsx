import type { Metadata } from "next";
import { BoxCheckoutForm } from "@/features/orders/components/BoxCheckoutForm";

export const metadata: Metadata = {
  title: "Gift Box Checkout | Givvly",
  description:
    "Review and complete payment for your curated Gift Box of celebration items on Givvly.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function BoxCheckoutPage() {
  return (
    <main className="min-h-screen bg-background">
      <BoxCheckoutForm />
    </main>
  );
}

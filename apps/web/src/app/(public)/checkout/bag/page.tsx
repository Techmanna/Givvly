import type { Metadata } from "next";
import { BagCheckoutForm } from "@/features/orders/components/BagCheckoutForm";

export const metadata: Metadata = {
  title: "Shopping Bag Checkout | Givvly",
  description:
    "Review and complete payment for your celebration items in your shopping bag on Givvly.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function BagCheckoutPage() {
  return (
    <main className="min-h-screen bg-background">
      <BagCheckoutForm />
    </main>
  );
}

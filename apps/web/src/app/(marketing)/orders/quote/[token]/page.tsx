import type { Metadata } from "next";
import { BespokeQuoteView } from "@/features/orders";

export const metadata: Metadata = {
  title: "Bespoke Gift Package Quote — Givvly",
  description: "Review and approve your concierge gift package quotation.",
};

export default async function BespokeQuoteDetailPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <BespokeQuoteView token={token} />
    </main>
  );
}

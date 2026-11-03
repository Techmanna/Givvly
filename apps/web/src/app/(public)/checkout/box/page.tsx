import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/PageHeader";
import { BoxCheckoutForm } from "@/features/orders";

export const metadata = {
  title: "Gift Box Checkout — Givvly",
  description: "Complete and deliver your bespoke gift box across Nigeria.",
};

export default function BoxCheckoutPage() {
  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2 gap-1.5">
        <Link href="/gifts">
          <ArrowLeft className="h-4 w-4" />
          Back to Gift Atelier
        </Link>
      </Button>

      <PageHeader
        title="Send Curated Gift Box"
        description="Review your curated keepsakes, packaging choice, and enter recipient delivery details in Nigeria."
      />

      <BoxCheckoutForm />
    </main>
  );
}


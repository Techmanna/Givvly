import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/PageHeader";
import { CheckoutForm } from "@/features/orders";

export default async function DirectCheckoutPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2 gap-1.5">
        <Link href={`/gifts/${encodeURIComponent(slug)}`}>
          <ArrowLeft className="h-4 w-4" />
          Back to product
        </Link>
      </Button>

      <PageHeader
        title="Send Gift Directly"
        description="Enter recipient details in Nigeria. We will send an SMS tracking link once dispatched."
      />

      <CheckoutForm productSlug={slug} />
    </main>
  );
}


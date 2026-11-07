import Link from "next/link";
import { redirect } from "next/navigation";
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
  const lower = slug.toLowerCase();

  if (lower === "billspot-vtu-data-bundle-gift") {
    redirect("/checkout/data");
  }
  if (lower === "billspot-vtu-airtime-gift") {
    redirect("/checkout/airtime");
  }

  const isVtuRoute = lower === "airtime" || lower === "data";

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2 gap-1.5">
        <Link href={isVtuRoute ? "/gifts" : `/gifts/${encodeURIComponent(slug)}`}>
          <ArrowLeft className="h-4 w-4" />
          {isVtuRoute ? "Back to gift catalog" : "Back to product"}
        </Link>
      </Button>

      <PageHeader
        title={
          lower === "data"
            ? "Gift Mobile Data Bundle"
            : lower === "airtime"
              ? "Send Instant Airtime Gift"
              : "Send Gift Directly"
        }
        description={
          isVtuRoute
            ? "Choose a Nigerian network provider and send instant airtime or data to one or up to 50 phone numbers."
            : "Enter recipient details in Nigeria. We will send an SMS tracking link once dispatched."
        }
      />

      <CheckoutForm productSlug={slug} />
    </main>
  );
}


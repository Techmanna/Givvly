import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/PageHeader";
import { CheckoutForm } from "@/features/orders";

export default async function DirectCheckoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ event?: string }>;
}) {
  const { slug } = await params;
  const { event } = (await searchParams) ?? {};
  const lower = slug.toLowerCase();
  const eventQuery = event ? `?event=${encodeURIComponent(event)}` : "";

  if (lower === "billspot-vtu-data-bundle-gift") {
    redirect(`/checkout/data${eventQuery}`);
  }
  if (lower === "billspot-vtu-airtime-gift") {
    redirect(`/checkout/airtime${eventQuery}`);
  }

  const isVtuRoute = lower === "airtime" || lower === "data";
  const backHref = event
    ? `/e/${encodeURIComponent(event)}`
    : isVtuRoute
      ? `/digital${eventQuery}`
      : `/gifts/${encodeURIComponent(slug)}`;
  const backLabel = event
    ? "Back to celebration"
    : isVtuRoute
      ? "Back to digital gifts"
      : "Back to product";

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2 gap-1.5">
        <Link href={backHref}>
          <ArrowLeft className="h-4 w-4" />
          {backLabel}
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


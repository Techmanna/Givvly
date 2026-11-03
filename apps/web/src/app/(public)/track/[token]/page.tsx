import { PageHeader } from "@/components/shared/PageHeader";
import { OrderDetailView } from "@/features/orders";

export default async function PublicTrackingPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6">
      <PageHeader
        title="Gift Delivery Tracking"
        description="Real-time status updates for your Givvly gift delivery."
      />
      <OrderDetailView trackingToken={token} publicView />
    </main>
  );
}


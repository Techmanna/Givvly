import { OrderDetailView } from "@/features/orders";

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <OrderDetailView orderId={id} />
    </main>
  );
}


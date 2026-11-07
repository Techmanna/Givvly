import type { Metadata } from "next";
import { AdminOrderDetailView } from "@/features/admin";

export const metadata: Metadata = {
  title: "Order Details | Givvly Admin",
  description: "View and manage order fulfillment, shipping, and buyer details.",
};

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="space-y-6">
      <AdminOrderDetailView orderId={id} />
    </div>
  );
}


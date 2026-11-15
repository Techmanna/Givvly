import { PageHeader } from "@/components/shared/PageHeader";
import { ShippingZonesView } from "@/features/admin/components/ShippingZonesView";

export default function AdminShippingZonesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Shipping Zones & Delivery Rates"
        description="Manage Lagos and interstate delivery zones, VAT-inclusive shipping prices, and enable or disable zones at checkout."
      />
      <ShippingZonesView />
    </div>
  );
}

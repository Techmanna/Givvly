import { PageHeader } from "@/components/shared/PageHeader";
import { AdminConsoleView } from "@/features/admin";

export default function AdminProductsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Gift Products & Combos Management"
        description="Curate single gift items, assemble predefined combo boxes, and control catalog inventory."
      />
      <AdminConsoleView section="products" />
    </div>
  );
}


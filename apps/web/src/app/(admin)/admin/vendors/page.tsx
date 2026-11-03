import { PageHeader } from "@/components/shared/PageHeader";
import { AdminConsoleView } from "@/features/admin";

export default function AdminVendorsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Verified Gift Vendors"
        description="Manage merchant partners and catalog listings."
      />
      <AdminConsoleView section="vendors" />
    </div>
  );
}


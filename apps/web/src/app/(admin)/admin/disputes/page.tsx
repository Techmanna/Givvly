import { PageHeader } from "@/components/shared/PageHeader";
import { AdminConsoleView } from "@/features/admin";

export default function AdminDisputesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Customer Disputes"
        description="Investigate and resolve buyer delivery disputes with vendors."
      />
      <AdminConsoleView section="disputes" />
    </div>
  );
}


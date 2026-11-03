import { PageHeader } from "@/components/shared/PageHeader";
import { AdminConsoleView } from "@/features/admin";

export default function AdminOverviewPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Platform Operations Console"
        description="Monitor celebration payment flows, oversee gift order fulfillment, manage products, and resolve disputes."
      />
      <AdminConsoleView section="overview" />
    </div>
  );
}

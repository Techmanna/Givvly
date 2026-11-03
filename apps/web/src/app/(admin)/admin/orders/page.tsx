import { PageHeader } from "@/components/shared/PageHeader";
import { AdminConsoleView } from "@/features/admin";

export default function AdminOrdersPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Platform Gift Orders"
        description="Monitor catalog gift orders and vendor fulfillment milestones."
      />
      <AdminConsoleView section="orders" />
    </div>
  );
}


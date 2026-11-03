import { PageHeader } from "@/components/shared/PageHeader";
import { AdminConsoleView } from "@/features/admin";

export default function AdminEventsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="All Platform Events"
        description="Review published, draft, and closed celebrations across Givvly."
      />
      <AdminConsoleView section="events" />
    </div>
  );
}


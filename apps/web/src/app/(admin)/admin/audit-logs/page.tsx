import { PageHeader } from "@/components/shared/PageHeader";
import { AdminConsoleView } from "@/features/admin";

export default function AdminAuditLogsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Platform Audit Logs"
        description="Trace authenticated and guest activities, security events, and resource changes across Givvly."
      />
      <AdminConsoleView section="audit" />
    </div>
  );
}

import { PageHeader } from "@/components/shared/PageHeader";
import { AdminConsoleView } from "@/features/admin";

export default function AdminUsersPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Platform Users"
        description="Inspect registered hosts, vendors, and administrators."
      />
      <AdminConsoleView section="users" />
    </div>
  );
}


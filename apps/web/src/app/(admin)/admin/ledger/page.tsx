import { PageHeader } from "@/components/shared/PageHeader";
import { AdminConsoleView } from "@/features/admin";

export default function AdminLedgerPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Platform Ledger"
        description="Audit credits, service fees, and payouts in kobo precision."
      />
      <AdminConsoleView section="ledger" />
    </div>
  );
}


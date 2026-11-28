import { PageHeader } from "@/components/shared/PageHeader";
import { AdminConsoleView } from "@/features/admin";

export default function AdminFinancePnlPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="P&L & Margin Analytics"
        description="Financial flow, gross/net profit, and sales projections from successful orders only."
      />
      <AdminConsoleView section="pnl" />
    </div>
  );
}

import { PageHeader } from "@/components/shared/PageHeader";
import { AdminConsoleView } from "@/features/admin";

export default function AdminPaymentsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Payment Transactions"
        description="Inspect Paystack payment intents, references, and service fees."
      />
      <AdminConsoleView section="payments" />
    </div>
  );
}


import { PageHeader } from "@/components/shared/PageHeader";
import { AdminConsoleView } from "@/features/admin";

export default function AdminPayoutsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Payouts & Transfer Retries"
        description="Monitor daily 07:00 WAT Paystack settlement runs and retry failed transfers."
      />
      <AdminConsoleView section="payouts" />
    </div>
  );
}


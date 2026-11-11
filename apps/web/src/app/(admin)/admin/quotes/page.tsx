import { PageHeader } from "@/components/shared/PageHeader";
import { AdminConsoleView } from "@/features/admin";

export default function AdminBespokeQuotesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Bespoke Wish Packages & Quotes"
        description="Review customer custom gift requests, provide itemized procurement quotes, and track fulfillment."
      />
      <AdminConsoleView section="quotes" />
    </div>
  );
}

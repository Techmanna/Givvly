import { PageHeader } from "@/components/shared/PageHeader";
import { AdminConsoleView } from "@/features/admin";

export default function AdminModerationPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Moderation Queue"
        description="Review flagged Wall of Love messages and uploaded media before publication."
      />
      <AdminConsoleView section="moderation" />
    </div>
  );
}


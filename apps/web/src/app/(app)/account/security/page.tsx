import { PageHeader } from "@/components/shared/PageHeader";
import { AccountSecurityForm } from "@/features/auth";

export default function AccountSecurityPage() {
  return (
    <main className="space-y-6">
      <PageHeader
        title="Security & Access"
        description="Update your password or manage account closure."
      />
      <AccountSecurityForm />
    </main>
  );
}


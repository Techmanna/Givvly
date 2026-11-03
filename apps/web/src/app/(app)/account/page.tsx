import { PageHeader } from "@/components/shared/PageHeader";
import { AccountProfileForm } from "@/features/auth";

export default function AccountProfilePage() {
  return (
    <main className="space-y-6">
      <PageHeader
        title="Account Profile"
        description="Manage your contact details and verified identity."
      />
      <AccountProfileForm />
    </main>
  );
}


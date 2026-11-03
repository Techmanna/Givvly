import { NotificationPreferencesForm } from "@/features/notifications";

export default function AccountNotificationsPage() {
  return (
    <main className="mx-auto w-full max-w-3xl space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">
          Notifications
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your notification channels and view recent updates.
        </p>
      </div>
      <NotificationPreferencesForm />
    </main>
  );
}


import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  NotificationsInbox,
  NotificationPreferencesForm,
} from "@/features/notifications";

export default async function AccountNotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const activeTab = tab === "preferences" ? "preferences" : "inbox";

  return (
    <main className="mx-auto w-full max-w-4xl space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">
          Notifications & Activity
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Stay updated on your gifts, contributions, and guest RSVPs, and manage your alert channels.
        </p>
      </div>

      <Tabs defaultValue={activeTab} className="space-y-6">
        <TabsList className="grid w-full max-w-xs grid-cols-2">
          <TabsTrigger value="inbox">Activity Inbox</TabsTrigger>
          <TabsTrigger value="preferences">Channels & Prefs</TabsTrigger>
        </TabsList>

        <TabsContent value="inbox">
          <NotificationsInbox />
        </TabsContent>

        <TabsContent value="preferences">
          <NotificationPreferencesForm />
        </TabsContent>
      </Tabs>
    </main>
  );
}

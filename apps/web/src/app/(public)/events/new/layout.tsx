import { getSession } from "@/features/auth/server";
import { SessionBootstrap } from "@/features/auth";
import { UserAppHeader } from "@/components/shared/UserAppHeader";
import { MarketingHeader } from "@/components/shared/MarketingHeader";
import type { ReactNode } from "react";

export default async function NewEventLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await getSession();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SessionBootstrap />
      {user ? (
        <UserAppHeader user={user} />
      ) : (
        <MarketingHeader initialUser={null} />
      )}
      <div className="flex-1">{children}</div>
    </div>
  );
}

import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getSession } from "@/features/auth/server";
import { SessionBootstrap } from "@/features/auth";
import { UserAppHeader } from "@/components/shared/UserAppHeader";

export default async function ProtectedAppLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await getSession();

  if (!user) {
    redirect("/login?next=/dashboard");
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SessionBootstrap />
      <UserAppHeader user={user} />
      <div className="flex-1">{children}</div>
    </div>
  );
}

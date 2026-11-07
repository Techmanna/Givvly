import { redirect } from "next/navigation";

export default function NotificationsRedirectPage() {
  redirect("/account/notifications");
}


import { redirect } from "next/navigation";

export default function BoxCheckoutRedirectPage() {
  redirect("/checkout/bag");
}

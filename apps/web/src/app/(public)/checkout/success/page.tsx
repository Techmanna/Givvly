import Link from "next/link";
import { CheckCircle2, Package, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getSession } from "@/features/auth/server";

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ orderId?: string }>;
}) {
  const { orderId } = await searchParams;
   const user = await getSession();

  return (
    <main className="mx-auto flex max-w-lg flex-col items-center justify-center px-4 py-16">
      <Card className="w-full text-center">
        <CardContent className="space-y-5 p-8">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success/15 text-success">
            <CheckCircle2 className="h-7 w-7" />
          </div>

          <div className="space-y-1.5">
            <h1 className="font-display text-2xl font-semibold text-ink">
              Gift Order Confirmed!
            </h1>
            <p className="text-sm text-ink-muted">
              Your gift is being prepared by our verified vendor. We have sent a
              delivery tracking link to your email.
            </p>
          </div>

          <div className="flex flex-col gap-2.5 sm:flex-row sm:justify-center">
            {/* Public delivery tracking for both guests and authenticated buyers */}
            {orderId && (
              <Button asChild className="gap-1.5">
                <Link href={`/track/${encodeURIComponent(orderId)}`}>
                  <Package className="h-4 w-4" />
                  Track Delivery
                </Link>
              </Button>
            )}

            {/* Authenticated users can view full orders list */}
            {orderId && user && (
              <Button asChild variant="outline" className="gap-1.5">
                <Link href="/orders">
                  View My Orders
                </Link>
              </Button>
            )}

            <Button asChild variant="ghost" className="gap-1.5">
              <Link href="/gifts">
                <Gift className="h-4 w-4" />
                Browse Gifts
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}


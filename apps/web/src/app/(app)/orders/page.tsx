import Link from "next/link";
import { Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/PageHeader";
import { OrdersListView } from "@/features/orders";

export default function OrdersListPage() {
  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6">
      <PageHeader
        title="My Gift Orders"
        description="Track deliveries, leave reviews, or reach out for concierge support."
        actions={
          <Button asChild variant="outline" size="sm" className="gap-1.5">
            <Link href="/gifts">
              <Gift className="h-4 w-4" />
              Send Another Gift
            </Link>
          </Button>
        }
      />
      <OrdersListView />
    </main>
  );
}


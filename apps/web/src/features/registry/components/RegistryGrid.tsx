"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Clock, ShoppingBag, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/shared/EmptyState";
import { Money } from "@/components/shared/Money";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ApiClientError } from "@/lib/api-client";
import { formatDate } from "@/lib/format";
import { useGiveDraftStore } from "@/stores/give-draft-store";
import {
  usePurchaseRegistryItemMutation,
  useReserveRegistryItemMutation,
} from "../hooks/useRegistry";
import type { RegistryItem } from "../types";

export type RegistryGridProps = {
  slug: string;
  items: RegistryItem[];
  moneyGiftsEnabled: boolean;
};

export function RegistryGrid({
  slug,
  items,
  moneyGiftsEnabled,
}: RegistryGridProps) {
  const router = useRouter();
  const idempotencyKey = useGiveDraftStore((s) => s.draft.idempotencyKey);
  const rotateIdempotencyKey = useGiveDraftStore((s) => s.rotateIdempotencyKey);

  const [activeItem, setActiveItem] = useState<RegistryItem | null>(null);
  const [reservedUntil, setReservedUntil] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);

  const reserveMutation = useReserveRegistryItemMutation(slug);
  const purchaseMutation = usePurchaseRegistryItemMutation(slug);

  const handleReserveAndOpen = async (item: RegistryItem) => {
    setAlertMessage(null);
    try {
      const res = await reserveMutation.mutateAsync(item.id);
      setActiveItem(res.item);
      setReservedUntil(res.reservedUntil);
    } catch (err) {
      if (err instanceof ApiClientError && err.code === "ITEM_ALREADY_CLAIMED") {
        toast.error("Someone just claimed this item.");
        return;
      }
      toast.error("Could not reserve this item. Please try again.");
    }
  };

  const handleCompletePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeItem) return;
    if (!anonymous && name.trim().length < 2) {
      setAlertMessage("Enter your name or tick Give anonymously.");
      return;
    }
    if (!email.trim().includes("@")) {
      setAlertMessage("Enter a valid email address for your receipt.");
      return;
    }

    setAlertMessage(null);
    try {
      const payment = await purchaseMutation.mutateAsync({
        payload: {
          itemId: activeItem.id,
          name: anonymous ? undefined : name.trim(),
          email: email.trim().toLowerCase(),
          message: message.trim() || undefined,
          anonymous,
        },
        idempotencyKey,
      });

      toast.success("Item claimed! Redirecting to your receipt.");
      setActiveItem(null);
      router.push(
        `/e/${slug}/give/success?ref=${encodeURIComponent(payment.reference)}`
      );
    } catch (err) {
      if (err instanceof ApiClientError) {
        if (err.code === "RESERVATION_EXPIRED") {
          setAlertMessage(
            "Reservation expired. Click 'Reserve again' below to hold this item."
          );
          return;
        }
        if (err.code === "ITEM_ALREADY_CLAIMED") {
          toast.error("This item has been claimed by another guest.");
          setActiveItem(null);
          return;
        }
        if (err.code === "PAYMENT_FAILED") {
          rotateIdempotencyKey();
        }
        setAlertMessage(err.message);
        return;
      }
      setAlertMessage("Check your connection and try again.");
    }
  };

  if (items.length === 0) {
    return (
      <div className="space-y-3">
        <EmptyState
          title="No specific registry wishes listed"
          description={
            moneyGiftsEnabled
              ? "The host hasn't listed specific items, so you're free to surprise them with a cash gift, airtime & data, or any gift from the catalog."
              : "The host hasn't listed specific items yet, but you can still surprise them with airtime, data, or a catalog gift."
          }
        />
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button asChild size="sm" variant="outline">
            <Link href={`/digital?event=${encodeURIComponent(slug)}`}>
              <Smartphone className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Gift Airtime or Data</span>
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href={`/catalog?event=${encodeURIComponent(slug)}`}>
              <ShoppingBag className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Browse Gift Catalog</span>
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {items.map((item) => {
          const isClaimed = item.status === "CLAIMED";
          const isAirtimeOrData = /airtime|data/i.test(item.title);
          const isFlexibleWish = item.priceKobo === 0;
          return (
            <Card key={item.id} className="shadow-none">
              <CardContent className="flex flex-col justify-between gap-4 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="font-medium text-foreground">{item.title}</p>
                      {isAirtimeOrData ? (
                        <span className="rounded-full bg-accent/25 px-2 py-0.5 text-[10px] font-semibold text-foreground">
                          Airtime &amp; Data
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-0.5 text-sm font-semibold text-primary">
                      {isFlexibleWish ? (
                        <span className="text-xs font-medium text-muted-foreground">
                          Flexible • You choose amount or bundle
                        </span>
                      ) : (
                        <Money amountKobo={item.priceKobo} />
                      )}
                    </p>
                  </div>
                  {!isFlexibleWish && !isAirtimeOrData ? (
                    <StatusBadge status={item.status} />
                  ) : (
                    <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-semibold text-primary">
                      Open Wish
                    </span>
                  )}
                </div>

                {item.status === "RESERVED" && item.reservedUntil ? (
                  <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>
                      Reserved until{" "}
                      {formatDate(item.reservedUntil, "h:mm a")}
                    </span>
                  </p>
                ) : null}

                {isAirtimeOrData ? (
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/digital?event=${encodeURIComponent(slug)}`}>
                      <Smartphone className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Gift Airtime or Data</span>
                    </Link>
                  </Button>
                ) : isFlexibleWish ? (
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/catalog?event=${encodeURIComponent(slug)}`}>
                      <ShoppingBag className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Choose a Catalog Gift</span>
                    </Link>
                  </Button>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    variant={isClaimed ? "secondary" : "outline"}
                    disabled={isClaimed || reserveMutation.isPending}
                    onClick={() => {
                      void handleReserveAndOpen(item);
                    }}
                  >
                    <ShoppingBag className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>{isClaimed ? "Claimed" : "Reserve & buy"}</span>
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Reassurance footer: Registry items are a wishlist, not the only gifts allowed */}
      <div className="flex flex-col justify-between gap-3 rounded-2xl border border-border/70 bg-muted/30 p-4 text-xs sm:flex-row sm:items-center">
        <p className="text-muted-foreground">
          <strong className="font-semibold text-foreground">
            Want to gift something else?
          </strong>{" "}
          These items are the host&apos;s wishlist—you can also gift Airtime
          &amp; Data, any item from the Givvly Catalog, or a cash blessing.
        </p>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Button asChild size="sm" variant="outline" className="h-8 text-xs">
            <Link href={`/digital?event=${encodeURIComponent(slug)}`}>
              <Smartphone className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Airtime &amp; Data</span>
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline" className="h-8 text-xs">
            <Link href={`/catalog?event=${encodeURIComponent(slug)}`}>
              <ShoppingBag className="h-3.5 w-3.5" aria-hidden="true" />
              <span>All Gifts</span>
            </Link>
          </Button>
        </div>
      </div>

      <Dialog
        open={Boolean(activeItem)}
        onOpenChange={(open) => {
          if (!open) setActiveItem(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Buy {activeItem?.title}</DialogTitle>
            <DialogDescription>
              {reservedUntil ? (
                <span>
                  Held for you for 10 minutes (until{" "}
                  {formatDate(reservedUntil, "h:mm a")}). Price:{" "}
                  <Money
                    amountKobo={activeItem?.priceKobo ?? 0}
                    className="font-semibold text-foreground"
                  />
                </span>
              ) : null}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCompletePurchase} className="space-y-4">
            {alertMessage ? (
              <div
                role="alert"
                className="space-y-2 rounded-control border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive"
              >
                <p>{alertMessage}</p>
                {alertMessage.includes("Reservation expired") && activeItem ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => void handleReserveAndOpen(activeItem)}
                  >
                    Reserve again
                  </Button>
                ) : null}
              </div>
            ) : null}

            <div className="flex items-center gap-2">
              <Checkbox
                id="reg-buy-anon"
                checked={anonymous}
                onCheckedChange={(checked) => setAnonymous(Boolean(checked))}
              />
              <Label
                htmlFor="reg-buy-anon"
                className="cursor-pointer text-xs"
              >
                Give anonymously
              </Label>
            </div>

            {!anonymous ? (
              <div className="space-y-1.5">
                <Label htmlFor="reg-buy-name">Your name</Label>
                <Input
                  id="reg-buy-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={60}
                />
              </div>
            ) : null}

            <div className="space-y-1.5">
              <Label htmlFor="reg-buy-email">Email address (for receipt)</Label>
              <Input
                id="reg-buy-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                maxLength={254}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="reg-buy-msg">Message (optional)</Label>
              <Textarea
                id="reg-buy-msg"
                rows={2}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={500}
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setActiveItem(null)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={purchaseMutation.isPending}>
                {purchaseMutation.isPending
                  ? "Confirming..."
                  : "Pay and claim item"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}


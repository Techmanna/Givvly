"use client";

import { useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { GiveMoneyForm } from "./GiveMoneyForm";

function subscribeDesktopMedia(callback: () => void): () => void {
  if (typeof window === "undefined" || !window.matchMedia) {
    return () => {};
  }
  const mql = window.matchMedia("(min-width: 768px)");
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
}

function getDesktopSnapshot(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) {
    return true;
  }
  return window.matchMedia("(min-width: 768px)").matches;
}

function getServerSnapshot(): boolean {
  return true;
}

export type GiveDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slug: string;
  eventName: string;
  ownerFirstName: string;
  moneyGiftsEnabled: boolean;
};

export function GiveDialog({
  open,
  onOpenChange,
  slug,
  eventName,
  ownerFirstName,
  moneyGiftsEnabled,
}: GiveDialogProps) {
  const router = useRouter();
  const isDesktop = useSyncExternalStore(
    subscribeDesktopMedia,
    getDesktopSnapshot,
    getServerSnapshot
  );

  const handleSuccessNavigate = (reference: string) => {
    onOpenChange(false);
    router.push(
      `/e/${slug}/give/success?ref=${encodeURIComponent(reference)}`
    );
  };

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Send a gift to {ownerFirstName}</DialogTitle>
            <DialogDescription>
              Celebrate {eventName} with a cash gift.
            </DialogDescription>
          </DialogHeader>
          <GiveMoneyForm
            slug={slug}
            eventName={eventName}
            ownerFirstName={ownerFirstName}
            moneyGiftsEnabled={moneyGiftsEnabled}
            onSuccessNavigate={handleSuccessNavigate}
          />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[92vh]">
        <DrawerHeader>
          <DrawerTitle>Send a gift to {ownerFirstName}</DrawerTitle>
          <DrawerDescription>
            Celebrate {eventName} with a cash gift.
          </DrawerDescription>
        </DrawerHeader>
        <div className="overflow-y-auto px-4 pb-6">
          <GiveMoneyForm
            slug={slug}
            eventName={eventName}
            ownerFirstName={ownerFirstName}
            moneyGiftsEnabled={moneyGiftsEnabled}
            onSuccessNavigate={handleSuccessNavigate}
          />
        </div>
      </DrawerContent>
    </Drawer>
  );
}


"use client";

import * as React from "react";
import {
  CreditCard,
  ShieldCheck,
  Building2,
  CheckCircle2,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatNaira } from "@/lib/format";
import { openPaystackCheckout } from "@/features/gifts/paystack";
import { verifyOrderPayment } from "../api";
import type { Order } from "../types";

export type PaymentGatewayModalProps = {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
  paymentDetails: {
    reference: string;
    accessCode: string;
    authorizationUrl: string;
    amountKobo: number;
    email: string;
  } | null;
  onPaymentSuccess: (reference: string) => void;
};

export function PaymentGatewayModal({
  isOpen,
  onClose,
  order,
  paymentDetails,
  onPaymentSuccess,
}: PaymentGatewayModalProps) {
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [isConfirmed, setIsConfirmed] = React.useState(false);

  if (!order || !paymentDetails) {
    return null;
  }

  const handleLaunchPaystack = async () => {
    setIsProcessing(true);
    try {
      const res = await openPaystackCheckout({
        email: paymentDetails.email,
        amountKobo: paymentDetails.amountKobo,
        reference: paymentDetails.reference,
        accessCode: paymentDetails.accessCode,
        onComplete: async (ref) => {
          setIsConfirmed(true);
          try {
            await verifyOrderPayment(order.id);
          } catch {
            // Webhook or polling handles backend capture
          }
          toast.success("Payment successful! Confirming your order.");
          setTimeout(() => {
            onPaymentSuccess(ref);
          }, 1200);
        },
        onDismiss: () => {
          setIsProcessing(false);
          toast.info("Payment window dismissed. You can retry whenever you're ready.");
        },
      });

      if (!res.opened) {
        // If popup was blocked or failed to load inline script, redirect to authorizationUrl if available
        if (paymentDetails.authorizationUrl) {
          window.location.href = paymentDetails.authorizationUrl;
        } else {
          setIsProcessing(false);
          toast.error("Could not initialize Paystack popup. Please try again.");
        }
      }
    } catch {
      setIsProcessing(false);
      toast.error("An error occurred launching Paystack.");
    }
  };

  const handleSimulatePayment = async () => {
    setIsProcessing(true);
    try {
      await verifyOrderPayment(order.id);
      setIsConfirmed(true);
      toast.success("Payment authorized and confirmed successfully!");
      setTimeout(() => {
        onPaymentSuccess(paymentDetails.reference);
      }, 1000);
    } catch (err) {
      setIsProcessing(false);
      toast.error(
        err instanceof Error ? err.message : "Payment verification failed."
      );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md sm:max-w-lg p-6 sm:p-8">
        <DialogHeader className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <ShieldCheck className="h-3.5 w-3.5" />
              Paystack Secure Checkout
            </span>
            <span className="font-mono text-xs font-medium text-muted-foreground">
              {order.number}
            </span>
          </div>
          <DialogTitle className="font-heading text-xl font-bold">
            Complete Your Gift Payment
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Select your preferred payment channel to finalize delivery for{" "}
            <span className="font-semibold text-foreground">
              {order.recipientName}
            </span>
            .
          </DialogDescription>
        </DialogHeader>

        {isConfirmed ? (
          <div className="py-8 text-center space-y-3">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success/15 text-success">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h3 className="font-heading text-lg font-bold text-foreground">
              Payment Confirmed!
            </h3>
            <p className="text-sm text-muted-foreground">
              Directing you to your order confirmation and tracking details...
            </p>
          </div>
        ) : (
          <div className="space-y-6 pt-2">
            {/* Amount Summary */}
            <div className="rounded-xl border border-border bg-muted/40 p-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Order Subtotal &amp; Delivery</span>
                <span className="font-medium text-foreground">
                  {formatNaira(paymentDetails.amountKobo)}
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-border pt-2 text-base font-bold">
                <span>Total Due</span>
                <span className="text-xl font-heading text-primary">
                  {formatNaira(paymentDetails.amountKobo)}
                </span>
              </div>
            </div>

            {/* Channels & Action Buttons */}
            <div className="space-y-3">
              <Button
                onClick={handleLaunchPaystack}
                disabled={isProcessing}
                className="w-full gap-2 rounded-full py-6 text-base font-semibold shadow-md"
                size="lg"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Opening Paystack...
                  </>
                ) : (
                  <>
                    <CreditCard className="h-5 w-5" />
                    Pay with Card, USSD or Transfer ({formatNaira(paymentDetails.amountKobo)})
                  </>
                )}
              </Button>

              {/* Development / Sandbox Simulation */}
              <div className="rounded-lg border border-dashed border-primary/30 bg-primary/5 p-3 text-center space-y-2">
                <p className="text-xs font-medium text-primary">
                  Dev Mode / Sandbox Option
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSimulatePayment}
                  disabled={isProcessing}
                  className="w-full gap-2 rounded-full text-xs"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                  Simulate Successful Payment (Instant Confirm)
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground pt-1">
              <ShieldCheck className="h-4 w-4 text-success" />
              <span>256-bit bank-grade encryption via Paystack</span>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}


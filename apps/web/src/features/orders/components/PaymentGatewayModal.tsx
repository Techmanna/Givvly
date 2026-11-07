"use client";

import * as React from "react";
import Link from "next/link";
import {
  CreditCard,
  ShieldCheck,
  CheckCircle2,
  Loader2,
  Wallet,
  Lock,
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
import { Input } from "@/components/ui/input";
import { formatNaira } from "@/lib/format";
import { openPaystackCheckout } from "@/features/gifts/paystack";
import {
  usePayOrderWithWalletMutation,
  useSetWalletPinMutation,
  useWalletSummary,
} from "@/features/wallet";
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
  const [isPaystackActive, setIsPaystackActive] = React.useState(false);
  const [showWalletPanel, setShowWalletPanel] = React.useState(false);
  const [walletPin, setWalletPin] = React.useState("");
  const [newWalletPin, setNewWalletPin] = React.useState("");

  const { data: walletSummary, isLoading: isWalletLoading } = useWalletSummary(
    1,
    5,
    isOpen
  );
  const payWithWalletMutation = usePayOrderWithWalletMutation();
  const setWalletPinMutation = useSetWalletPinMutation();

  if (!order || !paymentDetails) {
    return null;
  }

  const availableBalanceKobo = walletSummary?.availableBalanceKobo ?? 0;
  const hasSufficientWalletBalance =
    availableBalanceKobo >= paymentDetails.amountKobo;
  const hasPinConfigured = Boolean(walletSummary?.security.hasPin);

  const handleLaunchPaystack = async () => {
    setIsProcessing(true);
    setIsPaystackActive(true);
    try {
      const res = await openPaystackCheckout({
        email: paymentDetails.email,
        amountKobo: paymentDetails.amountKobo,
        reference: paymentDetails.reference,
        accessCode: paymentDetails.accessCode,
        onComplete: async (ref) => {
          setIsPaystackActive(false);
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
          setIsPaystackActive(false);
          setIsProcessing(false);
          toast.info(
            "Payment window dismissed. You can retry whenever you're ready."
          );
        },
      });

      if (!res.opened) {
        setIsPaystackActive(false);
        if (paymentDetails.authorizationUrl) {
          window.location.href = paymentDetails.authorizationUrl;
        } else {
          setIsProcessing(false);
          toast.error("Could not initialize Paystack popup. Please try again.");
        }
      }
    } catch {
      setIsPaystackActive(false);
      setIsProcessing(false);
      toast.error("An error occurred launching Paystack.");
    }
  };

  const handlePayWithWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasSufficientWalletBalance) {
      toast.error("Insufficient Givvly Wallet balance for this order.");
      return;
    }
    if (!/^\d{4}$/.test(walletPin)) {
      toast.error("Please enter your 4-digit Wallet Transaction PIN.");
      return;
    }

    setIsProcessing(true);
    try {
      const res = await payWithWalletMutation.mutateAsync({
        orderId: order.id,
        pin: walletPin,
        transaction_id: `ord_wal_${order.id}`,
      });
      setIsConfirmed(true);
      toast.success("Paid with Givvly Wallet! Order confirmed.");
      setTimeout(() => {
        onPaymentSuccess(res.transaction_id);
      }, 900);
    } catch (err) {
      setIsProcessing(false);
      toast.error(
        err instanceof Error
          ? err.message
          : "Wallet payment failed. Please check your PIN and try again."
      );
    }
  };

  const handleQuickSetupPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{4}$/.test(newWalletPin)) {
      toast.error("PIN must be exactly 4 digits.");
      return;
    }
    try {
      await setWalletPinMutation.mutateAsync({ pin: newWalletPin });
      setWalletPin(newWalletPin);
      setNewWalletPin("");
      toast.success(
        "4-digit Wallet PIN set permanently! You can now complete payment."
      );
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not set Wallet PIN."
      );
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
    <Dialog
      open={isOpen && !isPaystackActive}
      onOpenChange={(open) => {
        if (!open && !isPaystackActive) {
          onClose();
        }
      }}
    >
      <DialogContent className="max-w-md sm:max-w-lg p-6 sm:p-8">
        <DialogHeader className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <ShieldCheck className="h-3.5 w-3.5" />
              Givvly Secure Checkout
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
          <div className="space-y-5 pt-2">
            {/* Amount Summary */}
            <div className="rounded-xl border border-border bg-muted/40 p-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Order Subtotal &amp; Delivery
                </span>
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
              {/* Option 1: Pay with Givvly Wallet */}
              <div className="rounded-2xl border border-primary/30 bg-primary/5 p-3.5 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-primary">
                      <Wallet className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        Pay with Givvly Wallet
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {isWalletLoading ? (
                          "Checking wallet balance..."
                        ) : walletSummary ? (
                          <>
                            Available Balance:{" "}
                            <strong
                              className={
                                hasSufficientWalletBalance
                                  ? "text-emerald-700 dark:text-emerald-400"
                                  : "text-destructive"
                              }
                            >
                              {formatNaira(availableBalanceKobo)}
                            </strong>
                          </>
                        ) : (
                          "Sign in to pay with your Givvly Wallet"
                        )}
                      </p>
                    </div>
                  </div>

                  {walletSummary && (
                    <Button
                      type="button"
                      size="sm"
                      variant={showWalletPanel ? "secondary" : "default"}
                      disabled={!hasSufficientWalletBalance || isProcessing}
                      onClick={() => setShowWalletPanel((prev) => !prev)}
                      className="rounded-full text-xs"
                    >
                      {showWalletPanel
                        ? "Hide PIN"
                        : `Use Wallet (${formatNaira(paymentDetails.amountKobo)})`}
                    </Button>
                  )}
                </div>

                {walletSummary && !hasSufficientWalletBalance && (
                  <div className="flex items-center justify-between rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-800 dark:text-amber-200">
                    <span>
                      Your wallet needs{" "}
                      <strong>
                        {formatNaira(
                          paymentDetails.amountKobo - availableBalanceKobo
                        )}
                      </strong>{" "}
                      more for this order.
                    </span>
                    <Link
                      href="/account/payout"
                      className="font-semibold underline shrink-0 ml-2"
                    >
                      Fund Wallet →
                    </Link>
                  </div>
                )}

                {showWalletPanel && walletSummary && hasSufficientWalletBalance && (
                  <div className="border-t border-primary/20 pt-3">
                    {hasPinConfigured ? (
                      <form
                        onSubmit={handlePayWithWallet}
                        className="flex items-end gap-2"
                      >
                        <div className="flex-1">
                          <label className="mb-1 flex items-center gap-1 text-[11px] font-medium text-foreground">
                            <Lock className="h-3 w-3 text-primary" />
                            Enter 4-Digit Wallet PIN *
                          </label>
                          <Input
                            type="password"
                            inputMode="numeric"
                            maxLength={4}
                            value={walletPin}
                            onChange={(e) =>
                              setWalletPin(
                                e.target.value.replace(/\D/g, "").slice(0, 4)
                              )
                            }
                            placeholder="••••"
                            className="h-9 font-mono text-center tracking-widest"
                            required
                          />
                        </div>
                        <Button
                          type="submit"
                          disabled={
                            isProcessing ||
                            payWithWalletMutation.isPending ||
                            walletPin.length !== 4
                          }
                          className="h-9 gap-1.5"
                        >
                          {payWithWalletMutation.isPending ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Paying...
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="h-4 w-4" />
                              Confirm ({formatNaira(paymentDetails.amountKobo)})
                            </>
                          )}
                        </Button>
                      </form>
                    ) : (
                      <form
                        onSubmit={handleQuickSetupPin}
                        className="space-y-2"
                      >
                        <p className="text-[11px] text-muted-foreground">
                          Create your permanent 4-digit Wallet Transaction PIN to
                          authorize wallet payments:
                        </p>
                        <div className="flex items-center gap-2">
                          <Input
                            type="password"
                            inputMode="numeric"
                            maxLength={4}
                            value={newWalletPin}
                            onChange={(e) =>
                              setNewWalletPin(
                                e.target.value.replace(/\D/g, "").slice(0, 4)
                              )
                            }
                            placeholder="New 4-digit PIN"
                            className="h-9 font-mono tracking-widest"
                            required
                          />
                          <Button
                            type="submit"
                            size="sm"
                            disabled={
                              setWalletPinMutation.isPending ||
                              newWalletPin.length !== 4
                            }
                          >
                            {setWalletPinMutation.isPending
                              ? "Saving..."
                              : "Set PIN"}
                          </Button>
                        </div>
                      </form>
                    )}
                  </div>
                )}
              </div>

              {/* Option 2: Paystack Card / USSD / Bank Transfer */}
              <Button
                onClick={handleLaunchPaystack}
                disabled={isProcessing}
                className="w-full gap-2 rounded-full py-6 text-base font-semibold shadow-md"
                size="lg"
              >
                {isProcessing && !payWithWalletMutation.isPending ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Opening Paystack...
                  </>
                ) : (
                  <>
                    <CreditCard className="h-5 w-5" />
                    Pay with Card, USSD or Transfer (
                    {formatNaira(paymentDetails.amountKobo)})
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
              <span>
                256-bit bank-grade encryption via Givvly Wallet &amp; Paystack
              </span>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}


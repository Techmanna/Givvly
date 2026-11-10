"use client";

import * as React from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  CreditCard,
  ExternalLink,
  FileText,
  History,
  Lock,
  Plus,
  RefreshCw,
  Send,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatNaira } from "@/lib/format";
import { openPaystackCheckout } from "@/features/gifts/paystack";
import { useAuthStore } from "@/stores/auth-store";
import { TransactionReceiptModal } from "@/components/shared/TransactionReceiptModal";
import type { WalletRecentRecipient, WalletTransactionItem } from "../api";
import {
  useInitializeWalletTopUpMutation,
  useSetWalletPinMutation,
  useTransferWalletBalanceMutation,
  useUpgradeWalletKycMutation,
  useVerifyWalletTopUpMutation,
  useWalletAuditReplay,
  useWalletSummary,
  useWithdrawWalletMutation,
} from "../hooks/useWallet";

type ActiveTab =
  | "overview"
  | "topup"
  | "withdraw"
  | "transfer"
  | "pin"
  | "kyc"
  | "audit";

export function WalletDashboardCard() {
  const { user } = useAuthStore();
  const [page, setPage] = React.useState(1);
  const [activeTab, setActiveTab] = React.useState<ActiveTab>("overview");
  const [feedback, setFeedback] = React.useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const { data: wallet, isLoading, refetch } = useWalletSummary(page, 8);
  const {
    data: auditReport,
    refetch: runAuditReplay,
    isFetching: isAuditing,
  } = useWalletAuditReplay(undefined, activeTab === "audit");

  // Top-up state
  const [topUpNaira, setTopUpNaira] = React.useState("5000");
  const [topUpGateway, setTopUpGateway] = React.useState<{
    open: boolean;
    reference: string;
    accessCode?: string;
    authorizationUrl?: string;
    amountKobo: number;
  } | null>(null);

  // Withdraw state
  const [withdrawNaira, setWithdrawNaira] = React.useState("");
  const [withdrawPin, setWithdrawPin] = React.useState("");

  // Transfer state
  const [recipientAccount, setRecipientAccount] = React.useState("");
  const [transferNaira, setTransferNaira] = React.useState("");
  const [transferNote, setTransferNote] = React.useState("");
  const [transferPin, setTransferPin] = React.useState("");

  // PIN state
  const [currentPin, setCurrentPin] = React.useState("");
  const [newPin, setNewPin] = React.useState("");

  // Tier 3 KYC Upgrade state
  const [bvn, setBvn] = React.useState("");
  const [nin, setNin] = React.useState("");
  const [residentialAddress, setResidentialAddress] = React.useState("");

  // Selected transaction for Receipt Modal
  const [selectedTx, setSelectedTx] =
    React.useState<WalletTransactionItem | null>(null);

  // LocalStorage recent P2P recipients
  const [localRecentRecipients, setLocalRecentRecipients] = React.useState<
    WalletRecentRecipient[]
  >([]);

  React.useEffect(() => {
    try {
      const raw = window.localStorage.getItem(
        "givvly_recent_wallet_recipients_v1"
      );
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setLocalRecentRecipients(parsed);
        }
      }
    } catch {
      // Ignore storage access errors
    }
  }, []);

  const combinedRecentRecipients = React.useMemo(() => {
    const map = new Map<string, WalletRecentRecipient>();
    for (const r of localRecentRecipients) {
      const key = (r.id || r.email || r.phone || "").toLowerCase();
      if (key && !map.has(key)) {
        map.set(key, r);
      }
    }
    for (const r of wallet?.recentRecipients ?? []) {
      const key = (r.id || r.email || r.phone || "").toLowerCase();
      if (key && !map.has(key)) {
        map.set(key, r);
      }
    }
    return Array.from(map.values()).slice(0, 6);
  }, [localRecentRecipients, wallet?.recentRecipients]);

  const rememberWalletRecipient = React.useCallback(
    (entry: WalletRecentRecipient) => {
      setLocalRecentRecipients((prev) => {
        const key = (entry.id || entry.email || entry.phone || "").toLowerCase();
        const next = [
          entry,
          ...prev.filter(
            (p) => (p.id || p.email || p.phone || "").toLowerCase() !== key
          ),
        ].slice(0, 8);
        try {
          window.localStorage.setItem(
            "givvly_recent_wallet_recipients_v1",
            JSON.stringify(next)
          );
        } catch {
          // Ignore storage write errors
        }
        return next;
      });
    },
    []
  );

  const initTopUpMutation = useInitializeWalletTopUpMutation();
  const verifyTopUpMutation = useVerifyWalletTopUpMutation();
  const withdrawMutation = useWithdrawWalletMutation();
  const transferMutation = useTransferWalletBalanceMutation();
  const setPinMutation = useSetWalletPinMutation();
  const upgradeKycMutation = useUpgradeWalletKycMutation();

  const clearFeedback = () => setFeedback(null);

  async function launchPaystackWindow(gatewayInfo: {
    reference: string;
    accessCode?: string;
    authorizationUrl?: string;
    amountKobo: number;
  }) {
    const res = await openPaystackCheckout({
      email: user?.email || "member@givvly.store",
      amountKobo: gatewayInfo.amountKobo,
      reference: gatewayInfo.reference,
      accessCode: gatewayInfo.accessCode || "",
      onComplete: async (completedRef) => {
        await handleConfirmTopUp(completedRef, gatewayInfo.amountKobo, false);
      },
      onDismiss: () => {
        // Keep the topUpGateway panel open so user can retry or simulate in dev
      },
    });

    if (!res.opened && gatewayInfo.authorizationUrl) {
      window.open(gatewayInfo.authorizationUrl, "_blank", "noopener,noreferrer");
    }
  }

  async function handleStartTopUp(e: React.FormEvent) {
    e.preventDefault();
    clearFeedback();
    const amountKobo = Math.round(Number(topUpNaira) * 100);
    if (!Number.isFinite(amountKobo) || amountKobo < 10_000) {
      setFeedback({
        type: "error",
        text: "Minimum wallet top-up is ₦100.",
      });
      return;
    }

    try {
      const res = await initTopUpMutation.mutateAsync({ amountKobo });
      const gatewayInfo = {
        open: true,
        reference: res.reference,
        accessCode: res.accessCode,
        authorizationUrl: res.authorizationUrl,
        amountKobo: res.amountKobo,
      };
      setTopUpGateway(gatewayInfo);
      await launchPaystackWindow(gatewayInfo);
    } catch (err: any) {
      setFeedback({
        type: "error",
        text: err?.message || "Could not initialize wallet top-up.",
      });
    }
  }

  async function handleConfirmTopUp(
    referenceOverride?: string,
    amountOverride?: number,
    simulateDev = false
  ) {
    const ref = referenceOverride || topUpGateway?.reference;
    const amt = amountOverride || topUpGateway?.amountKobo || 0;
    if (!ref) return;

    clearFeedback();
    try {
      await verifyTopUpMutation.mutateAsync({
        reference: ref,
        amountKobo: amt,
        simulateDev,
      });
      setTopUpGateway(null);
      setActiveTab("overview");
      setFeedback({
        type: "success",
        text: `Wallet credited with ${formatNaira(amt)}!`,
      });
    } catch (err: any) {
      setFeedback({
        type: "error",
        text: err?.message || "Payment verification failed.",
      });
    }
  }

  async function handleUpgradeTier3(e: React.FormEvent) {
    e.preventDefault();
    clearFeedback();
    if (!/^\d{11}$/.test(bvn)) {
      setFeedback({
        type: "error",
        text: "Please enter a valid 11-digit Bank Verification Number (BVN).",
      });
      return;
    }
    if (nin && !/^\d{11}$/.test(nin)) {
      setFeedback({
        type: "error",
        text: "NIN must be 11 digits if provided.",
      });
      return;
    }
    if (residentialAddress.trim().length < 6) {
      setFeedback({
        type: "error",
        text: "Please enter your Nigerian residential address.",
      });
      return;
    }

    try {
      const res = await upgradeKycMutation.mutateAsync({
        bvn,
        nin: nin || undefined,
        residentialAddress: residentialAddress.trim(),
      });
      setBvn("");
      setNin("");
      setResidentialAddress("");
      setActiveTab("overview");
      setFeedback({
        type: "success",
        text: res.message,
      });
    } catch (err: any) {
      setFeedback({
        type: "error",
        text: err?.message || "Could not complete CBN Tier 3 upgrade.",
      });
    }
  }

  async function handleWithdraw(e: React.FormEvent) {
    e.preventDefault();
    clearFeedback();
    const amountKobo = Math.round(Number(withdrawNaira) * 100);
    if (!Number.isFinite(amountKobo) || amountKobo < 50_000) {
      setFeedback({
        type: "error",
        text: "Minimum bank withdrawal is ₦500.",
      });
      return;
    }

    try {
      const res = await withdrawMutation.mutateAsync({
        amountKobo,
        pin: withdrawPin || undefined,
        transaction_id: `wd_${Date.now()}`,
      });
      setWithdrawNaira("");
      setWithdrawPin("");
      setActiveTab("overview");
      setFeedback({
        type: "success",
        text: `${formatNaira(res.amountKobo)} disbursed to ${res.destination.bankName} (••••${res.destination.accountLast4}).`,
      });
    } catch (err: any) {
      setFeedback({
        type: "error",
        text: err?.message || "Withdrawal failed.",
      });
    }
  }

  async function handleTransfer(e: React.FormEvent) {
    e.preventDefault();
    clearFeedback();
    const amountKobo = Math.round(Number(transferNaira) * 100);
    if (!Number.isFinite(amountKobo) || amountKobo < 10_000) {
      setFeedback({
        type: "error",
        text: "Minimum P2P wallet transfer is ₦100.",
      });
      return;
    }

    try {
      const res = await transferMutation.mutateAsync({
        to_account: recipientAccount.trim(),
        amount: String(amountKobo),
        currency: "NGN",
        transaction_id: `p2p_${Date.now()}`,
        pin: transferPin || undefined,
        note: transferNote.trim() || undefined,
      });
      const enteredDigits = recipientAccount.replace(/\D/g, "");
      rememberWalletRecipient({
        id: res.recipient.id,
        name: res.recipient.name,
        email: res.recipient.email,
        phone:
          (res.recipient as any).phone ||
          (enteredDigits.length >= 10 ? recipientAccount.trim() : null),
        lastSentAt: new Date().toISOString(),
      });
      setRecipientAccount("");
      setTransferNaira("");
      setTransferNote("");
      setTransferPin("");
      setActiveTab("overview");
      setFeedback({
        type: "success",
        text: `Transferred ${formatNaira(amountKobo)} to ${res.recipient.name} (${(res.recipient as any).phone || res.recipient.email}).`,
      });
    } catch (err: any) {
      setFeedback({
        type: "error",
        text: err?.message || "Wallet transfer failed.",
      });
    }
  }

  async function handleSavePin(e: React.FormEvent) {
    e.preventDefault();
    clearFeedback();
    if (!/^\d{4}$/.test(newPin)) {
      setFeedback({
        type: "error",
        text: "Transaction PIN must be exactly 4 digits.",
      });
      return;
    }

    try {
      const res = await setPinMutation.mutateAsync({
        pin: newPin,
        currentPin: wallet?.security.hasPin ? currentPin : undefined,
      });
      setCurrentPin("");
      setNewPin("");
      setActiveTab("overview");
      setFeedback({
        type: "success",
        text: res.message,
      });
    } catch (err: any) {
      setFeedback({
        type: "error",
        text: err?.message || "Failed to update Wallet PIN.",
      });
    }
  }

  if (isLoading && !wallet) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 shadow-card animate-pulse">
        <div className="h-6 w-48 rounded bg-muted mb-4" />
        <div className="h-10 w-64 rounded bg-muted mb-6" />
        <div className="grid grid-cols-3 gap-4">
          <div className="h-20 rounded-xl bg-muted" />
          <div className="h-20 rounded-xl bg-muted" />
          <div className="h-20 rounded-xl bg-muted" />
        </div>
      </div>
    );
  }

  const cbn = wallet?.cbnPolicy;
  const dailyPct = cbn
    ? Math.min(
      100,
      Math.round((cbn.dailyUsedKobo / cbn.dailyCumulativeLimitKobo) * 100)
    )
    : 0;
  const totalPages = wallet
    ? Math.max(1, Math.ceil(wallet.pagination.total / wallet.pagination.limit))
    : 1;

  return (
    <section
      aria-label="Givvly Digital Wallet"
      className="space-y-6 rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-card"
    >
      {/* Top Wallet Header & CBN KYC Tier Badge */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Wallet className="h-4 w-4" />
            </span>
            <h2 className="font-heading text-lg font-bold text-foreground">
              Givvly Digital Wallet
            </h2>
            {cbn && (
              <Badge variant={cbn.tier === "TIER_1" ? "warning" : "success"}>
                {cbn.label}
              </Badge>
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Double-entry event-sourced ledger with Try-Confirm/Cancel (TC/C)
            protection &amp; Nigerian CBN tiered limits.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant={activeTab === "topup" ? "default" : "secondary"}
            onClick={() => {
              clearFeedback();
              setActiveTab(activeTab === "topup" ? "overview" : "topup");
            }}
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Fund Wallet
          </Button>
          <Button
            size="sm"
            variant={activeTab === "withdraw" ? "default" : "secondary"}
            onClick={() => {
              clearFeedback();
              setActiveTab(activeTab === "withdraw" ? "overview" : "withdraw");
            }}
          >
            <ArrowUpRight className="mr-1.5 h-3.5 w-3.5" />
            Withdraw
          </Button>
          <Button
            size="sm"
            variant={activeTab === "transfer" ? "default" : "secondary"}
            onClick={() => {
              clearFeedback();
              setActiveTab(activeTab === "transfer" ? "overview" : "transfer");
            }}
          >
            <Send className="mr-1.5 h-3.5 w-3.5" />
            P2P Transfer
          </Button>
          <Button
            size="sm"
            variant={activeTab === "pin" ? "default" : "ghost"}
            onClick={() => {
              clearFeedback();
              setActiveTab(activeTab === "pin" ? "overview" : "pin");
            }}
          >
            <Lock className="mr-1.5 h-3.5 w-3.5" />
            {wallet?.security.hasPin ? "Manage PIN" : "Set 4-Digit PIN"}
          </Button>
          <Button
            size="sm"
            variant={activeTab === "kyc" ? "default" : "ghost"}
            onClick={() => {
              clearFeedback();
              setActiveTab(activeTab === "kyc" ? "overview" : "kyc");
            }}
          >
            {cbn?.tier === "TIER_3" ? "CBN Tier 3 Active" : "Upgrade Tier"}
          </Button>
          <Button
            size="sm"
            variant={activeTab === "audit" ? "default" : "ghost"}
            onClick={() => {
              clearFeedback();
              setActiveTab(activeTab === "audit" ? "overview" : "audit");
            }}
          >
            <History className="mr-1.5 h-3.5 w-3.5" />
            Audit Replay
          </Button>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          role="status"
          className={`rounded-xl border px-4 py-3 text-sm font-medium ${feedback.type === "success"
            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-700"
            : "border-destructive/30 bg-destructive/10 text-destructive"
            }`}
        >
          {feedback.text}
        </div>
      )}

      {/* Three Balance Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Available Wallet Balance
          </p>
          <p className="mt-1.5 font-mono text-2xl font-bold text-foreground">
            {formatNaira(wallet?.availableBalanceKobo ?? 0)}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Ready for instant VTU, gifts, P2P &amp; bank withdrawal
          </p>
        </div>

        <div className="rounded-xl border border-border bg-secondary/40 p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Reserved In-Flight (TC/C)
          </p>
          <p className="mt-1.5 font-mono text-xl font-bold text-foreground">
            {formatNaira(wallet?.reservedBalanceKobo ?? 0)}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Held during active Try-Confirm/Cancel settlement
          </p>
        </div>

        <div className="rounded-xl border border-border bg-secondary/40 p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Active Event Pool Escrow
          </p>
          <p className="mt-1.5 font-mono text-xl font-bold text-foreground">
            {formatNaira(wallet?.escrowBalanceKobo ?? 0)}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Ring-fenced until group pool target or conversion
          </p>
        </div>
      </div>

      {/* CBN Regulatory Policy Bar */}
      {cbn && (
        <div className="rounded-xl border border-border bg-background p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 font-medium text-foreground">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <span>
                Daily Outflow Used (WAT):{" "}
                <strong>{formatNaira(cbn.dailyUsedKobo)}</strong> of{" "}
                <strong>{formatNaira(cbn.dailyCumulativeLimitKobo)}</strong>
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-muted-foreground">
              <span>
                Single Tx Limit:{" "}
                <strong className="text-foreground">
                  {formatNaira(cbn.singleTransactionLimitKobo)}
                </strong>{" "}
                • Max Balance:{" "}
                <strong className="text-foreground">
                  {cbn.maxBalanceKobo
                    ? formatNaira(cbn.maxBalanceKobo)
                    : "Unlimited"}
                </strong>
              </span>
              {cbn.tier !== "TIER_3" && (
                <button
                  type="button"
                  onClick={() => {
                    clearFeedback();
                    setActiveTab("kyc");
                  }}
                  className="font-semibold text-primary underline hover:opacity-80"
                >
                  Upgrade to {cbn.tier === "TIER_1" ? "Tier 2" : "Tier 3 (Unlimited)"} →
                </button>
              )}
            </div>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/80">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${dailyPct}%` }}
            />
          </div>
        </div>
      )}

      {/* Action Panels */}
      {activeTab === "topup" && (
        <div className="space-y-4 rounded-xl border border-border bg-secondary/20 p-4">
          <form onSubmit={handleStartTopUp} className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-heading text-sm font-semibold text-foreground">
                Fund Wallet via Paystack (NGN)
              </h3>
              <span className="text-xs text-muted-foreground">
                Max Balance ({cbn?.tier}):{" "}
                <strong>
                  {cbn?.maxBalanceKobo
                    ? formatNaira(cbn.maxBalanceKobo)
                    : "Unlimited"}
                </strong>
              </span>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-medium text-foreground">
                  Amount in Naira (₦)
                </label>
                <input
                  type="number"
                  min={100}
                  step={100}
                  value={topUpNaira}
                  onChange={(e) => setTopUpNaira(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  placeholder="5000"
                  required
                />
              </div>
              <div className="flex items-end">
                <Button
                  type="submit"
                  className="w-full"
                  disabled={initTopUpMutation.isPending}
                >
                  <CreditCard className="mr-1.5 h-4 w-4" />
                  Launch Paystack Checkout
                </Button>
              </div>
            </div>
          </form>

          {topUpGateway?.open && (
            <div className="mt-3 rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div>
                  <span className="font-semibold text-foreground">
                    Paystack Top-Up Initialized ({topUpGateway.reference})
                  </span>
                  <p className="text-[11px] text-muted-foreground">
                    Complete payment in the Paystack popup window, or use Dev
                    Sandbox below for instant local testing.
                  </p>
                </div>
                <span className="font-mono text-base font-bold text-primary">
                  {formatNaira(topUpGateway.amountKobo)}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => launchPaystackWindow(topUpGateway)}
                >
                  <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                  Open Paystack Checkout Window
                </Button>

                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() =>
                    handleConfirmTopUp(
                      topUpGateway.reference,
                      topUpGateway.amountKobo,
                      false
                    )
                  }
                  disabled={verifyTopUpMutation.isPending}
                >
                  I&apos;ve Paid on Paystack — Verify
                </Button>

                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    handleConfirmTopUp(
                      topUpGateway.reference,
                      topUpGateway.amountKobo,
                      true
                    )
                  }
                  disabled={verifyTopUpMutation.isPending}
                >
                  <CheckCircle2 className="mr-1.5 h-3.5 w-3.5 text-emerald-600" />
                  Simulate Successful Payment (Dev Sandbox)
                </Button>

                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setTopUpGateway(null)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "kyc" && (
        <div className="space-y-4 rounded-xl border border-border bg-secondary/20 p-4">
          <div>
            <h3 className="font-heading text-sm font-semibold text-foreground">
              Nigerian CBN Three-Tiered KYC Wallet Limits &amp; Upgrade
            </h3>
            <p className="text-xs text-muted-foreground">
              Upgrade your verification tier to unlock higher single-transaction
              limits, daily cumulative limits, and unlimited wallet balance.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 text-xs">
            <div
              className={`rounded-xl border p-3.5 ${cbn?.tier === "TIER_1"
                ? "border-primary bg-primary/5"
                : "border-border bg-background"
                }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-foreground">CBN Tier 1</span>
                {cbn?.tier === "TIER_1" && (
                  <Badge variant="warning">Current</Badge>
                )}
              </div>
              <p className="mt-1 text-muted-foreground">Basic Account</p>
              <ul className="mt-2 space-y-1 text-[11px]">
                <li>• Single Tx: ₦50,000</li>
                <li>• Daily Limit: ₦300,000</li>
                <li>• Max Balance: ₦300,000</li>
              </ul>
            </div>

            <div
              className={`rounded-xl border p-3.5 ${cbn?.tier === "TIER_2"
                ? "border-primary bg-primary/5"
                : "border-border bg-background"
                }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-foreground">CBN Tier 2</span>
                {cbn?.tier === "TIER_2" && (
                  <Badge variant="success">Current</Badge>
                )}
              </div>
              <p className="mt-1 text-muted-foreground">
                Verified NUBAN Bank Account
              </p>
              <ul className="mt-2 space-y-1 text-[11px]">
                <li>• Single Tx: ₦200,000</li>
                <li>• Daily Limit: ₦500,000</li>
                <li>• Max Balance: ₦500,000</li>
              </ul>
            </div>

            <div
              className={`rounded-xl border p-3.5 ${cbn?.tier === "TIER_3"
                ? "border-primary bg-primary/5"
                : "border-border bg-background"
                }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-foreground">CBN Tier 3</span>
                {cbn?.tier === "TIER_3" && (
                  <Badge variant="success">Current</Badge>
                )}
              </div>
              <p className="mt-1 text-muted-foreground">
                Enhanced KYC (BVN + Address)
              </p>
              <ul className="mt-2 space-y-1 text-[11px]">
                <li>• Single Tx: ₦5,000,000</li>
                <li>• Daily Limit: ₦5,000,000</li>
                <li>• Max Balance: Unlimited</li>
              </ul>
            </div>
          </div>

          {cbn?.tier === "TIER_1" && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-800 dark:text-amber-200">
              <strong>How to upgrade to CBN Tier 2:</strong> Scroll down to the{" "}
              <strong>Verified Nigerian Bank Account</strong> section right below
              this card and connect your 10-digit Nigerian NUBAN account. Your
              wallet will automatically upgrade to Tier 2!
            </div>
          )}

          {cbn?.tier === "TIER_2" && (
            <form
              onSubmit={handleUpgradeTier3}
              className="space-y-3 rounded-xl border border-border bg-background p-4"
            >
              <div>
                <h4 className="font-heading text-xs font-bold uppercase tracking-wider text-primary">
                  Upgrade from Tier 2 → CBN Tier 3 (Unlimited Max Balance)
                </h4>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Your Nigerian bank account ({wallet?.security.bankName} ••••
                  {wallet?.security.accountLast4}) is already verified. Provide
                  your 11-digit BVN and Nigerian residential address to remove
                  the ₦500,000 max balance cap.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-foreground">
                    11-Digit BVN (Bank Verification Number) *
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={11}
                    value={bvn}
                    onChange={(e) =>
                      setBvn(e.target.value.replace(/\D/g, "").slice(0, 11))
                    }
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm"
                    placeholder="22234567890"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-foreground">
                    11-Digit NIN (Optional)
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={11}
                    value={nin}
                    onChange={(e) =>
                      setNin(e.target.value.replace(/\D/g, "").slice(0, 11))
                    }
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm"
                    placeholder="12345678901"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-medium text-foreground">
                    Nigerian Residential Address *
                  </label>
                  <input
                    type="text"
                    value={residentialAddress}
                    onChange={(e) => setResidentialAddress(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                    placeholder="14 Admiralty Way, Lekki Phase 1, Lagos"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button type="submit" disabled={upgradeKycMutation.isPending}>
                  Verify &amp; Upgrade to CBN Tier 3 (Unlimited)
                </Button>
              </div>
            </form>
          )}

          {cbn?.tier === "TIER_3" && (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs text-emerald-800 dark:text-emerald-200">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>
                Your wallet is at the highest regulatory tier (
                <strong>CBN Tier 3 Enhanced KYC</strong>) with{" "}
                <strong>Unlimited Maximum Balance</strong> and{" "}
                <strong>₦5,000,000</strong> single/daily transaction limits.
              </span>
            </div>
          )}
        </div>
      )}

      {activeTab === "withdraw" && (
        <form
          onSubmit={handleWithdraw}
          className="space-y-4 rounded-xl border border-border bg-secondary/20 p-4"
        >
          <div>
            <h3 className="font-heading text-sm font-semibold text-foreground">
              Closed-Loop Withdrawal to Verified Nigerian Bank
            </h3>
            <p className="text-xs text-muted-foreground">
              {wallet?.security.verifiedBankLinked
                ? `Funds will be sent to ${wallet.security.bankName} (••••${wallet.security.accountLast4} - ${wallet.security.accountName}).`
                : "Please link and verify your Nigerian bank account below before withdrawing."}
            </p>
          </div>
          {!wallet?.security.hasPin && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
              <span>
                Security Requirement: You must set a permanent 4-digit Wallet
                Transaction PIN before withdrawing.
              </span>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => setActiveTab("pin")}
              >
                Set 4-Digit PIN Now
              </Button>
            </div>
          )}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground">
                Amount in Naira (₦)
              </label>
              <input
                type="number"
                min={500}
                step={100}
                value={withdrawNaira}
                onChange={(e) => setWithdrawNaira(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                placeholder="5000"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground">
                4-Digit Wallet PIN *
              </label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={withdrawPin}
                onChange={(e) =>
                  setWithdrawPin(e.target.value.replace(/\D/g, "").slice(0, 4))
                }
                className="w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm tracking-widest"
                placeholder="••••"
                required
              />
            </div>
            <div className="flex items-end">
              <Button
                type="submit"
                className="w-full"
                disabled={
                  !wallet?.security.verifiedBankLinked ||
                  !wallet?.security.hasPin ||
                  withdrawMutation.isPending
                }
              >
                Disburse to Bank
              </Button>
            </div>
          </div>
        </form>
      )}

      {activeTab === "transfer" && (
        <form
          onSubmit={handleTransfer}
          className="space-y-4 rounded-xl border border-border bg-secondary/20 p-4"
        >
          <div>
            <h3 className="font-heading text-sm font-semibold text-foreground">
              Peer-to-Peer Wallet Balance Transfer
            </h3>
            <p className="text-xs text-muted-foreground">
              Instant, zero-fee atomic double-entry transfer to another Givvly
              user by email, phone number, or user ID.
            </p>
          </div>
          {!wallet?.security.hasPin && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
              <span>
                Security Requirement: You must set a permanent 4-digit Wallet
                Transaction PIN before transferring funds.
              </span>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => setActiveTab("pin")}
              >
                Set 4-Digit PIN Now
              </Button>
            </div>
          )}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground">
                Recipient Email, Phone Number, or User ID
              </label>
              <input
                type="text"
                value={recipientAccount}
                onChange={(e) => setRecipientAccount(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                placeholder="friend@givvly.store or 08031234567"
                required
              />

              {combinedRecentRecipients.length > 0 && (
                <div className="mt-2">
                  <p className="mb-1.5 flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                    <Clock className="h-3 w-3 text-primary" />
                    <span>Sent to in the past (click to select):</span>
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {combinedRecentRecipients.map((r) => {
                      const identifier = r.phone || r.email || r.id;
                      const isSelected = recipientAccount === identifier;
                      return (
                        <button
                          key={`${r.id}-${identifier}`}
                          type="button"
                          onClick={() => setRecipientAccount(identifier)}
                          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] transition ${isSelected
                            ? "border-primary bg-primary/10 font-semibold text-primary"
                            : "border-border bg-background text-foreground hover:border-primary/40"
                            }`}
                        >
                          <span className="font-medium">{r.name}</span>
                          <span className="font-mono text-muted-foreground">
                            • {r.phone || r.email}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground">
                Amount in Naira (₦)
              </label>
              <input
                type="number"
                min={100}
                step={50}
                value={transferNaira}
                onChange={(e) => setTransferNaira(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                placeholder="2500"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground">
                Note (Optional)
              </label>
              <input
                type="text"
                value={transferNote}
                onChange={(e) => setTransferNote(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                placeholder="Happy birthday gift!"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground">
                4-Digit Wallet PIN *
              </label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={transferPin}
                onChange={(e) =>
                  setTransferPin(e.target.value.replace(/\D/g, "").slice(0, 4))
                }
                className="w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm tracking-widest"
                placeholder="••••"
                required
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={!wallet?.security.hasPin || transferMutation.isPending}
            >
              Send Instant Transfer
            </Button>
          </div>
        </form>
      )}

      {activeTab === "pin" && (
        <form
          onSubmit={handleSavePin}
          className="space-y-4 rounded-xl border border-border bg-secondary/20 p-4"
        >
          <div>
            <h3 className="font-heading text-sm font-semibold text-foreground">
              {wallet?.security.hasPin
                ? "Change Your Permanent 4-Digit Wallet PIN"
                : "Set Permanent 4-Digit Wallet Transaction PIN"}
            </h3>
            <p className="text-xs text-muted-foreground">
              Stored permanently in PostgreSQL (Argon2id hashed) with a
              5-attempt 30-minute lockout. You can change it anytime using your
              current PIN.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {wallet?.security.hasPin && (
              <div>
                <label className="mb-1 block text-xs font-medium text-foreground">
                  Current 4-Digit PIN
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={currentPin}
                  onChange={(e) =>
                    setCurrentPin(e.target.value.replace(/\D/g, "").slice(0, 4))
                  }
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm tracking-widest"
                  placeholder="••••"
                  required
                />
              </div>
            )}
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground">
                New 4-Digit PIN
              </label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={newPin}
                onChange={(e) =>
                  setNewPin(e.target.value.replace(/\D/g, "").slice(0, 4))
                }
                className="w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm tracking-widest"
                placeholder="••••"
                required
              />
            </div>
            <div className="flex items-end">
              <Button type="submit" disabled={setPinMutation.isPending}>
                Save Transaction PIN
              </Button>
            </div>
          </div>
        </form>
      )}

      {activeTab === "audit" && (
        <div className="space-y-3 rounded-xl border border-border bg-secondary/20 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-heading text-sm font-semibold text-foreground">
                Event Sourcing Historical Balance Replay
              </h3>
              <p className="text-xs text-muted-foreground">
                Replays every immutable double-entry ledger event from inception
                to verify zero balance drift.
              </p>
            </div>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => runAuditReplay()}
              disabled={isAuditing}
            >
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
              Re-verify Stream
            </Button>
          </div>
          {auditReport && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-xs">
              <div className="rounded-lg border border-border bg-background p-3">
                <span className="text-muted-foreground">Ledger Account</span>
                <p className="mt-1 font-mono font-semibold text-foreground truncate">
                  {auditReport.accountCode}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-background p-3">
                <span className="text-muted-foreground">Replayed Events</span>
                <p className="mt-1 font-mono font-semibold text-foreground">
                  {auditReport.replayedEventCount} entries
                </p>
              </div>
              <div className="rounded-lg border border-border bg-background p-3">
                <span className="text-muted-foreground">Replayed Balance</span>
                <p className="mt-1 font-mono font-semibold text-foreground">
                  {formatNaira(auditReport.replayedBalanceKobo)}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-background p-3">
                <span className="text-muted-foreground">Audit Status</span>
                <p className="mt-1 flex items-center gap-1 font-semibold text-emerald-600">
                  <CheckCircle2 className="h-4 w-4" />
                  {auditReport.reconciled ? "100% Reconciled" : "Drift Detected"}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Double-Entry Ledger Statement */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-heading text-sm font-semibold text-foreground">
            Immutable Double-Entry Wallet Statement
          </h3>
          <button
            type="button"
            onClick={() => refetch()}
            className="text-xs font-medium text-primary hover:underline"
          >
            Refresh
          </button>
        </div>

        {!wallet?.transactions.length ? (
          <div className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
            No wallet ledger entries yet. Cash gifts, pool payouts, and wallet
            top-ups will appear here automatically.
          </div>
        ) : (
          <div className="divide-y divide-border rounded-xl border border-border bg-background">
            {wallet.transactions.map((tx) => {
              const isCredit = tx.direction === "CREDIT";
              return (
                <div
                  key={tx.id}
                  onClick={() => setSelectedTx(tx)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelectedTx(tx);
                    }
                  }}
                  className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3 text-sm transition hover:bg-secondary/40"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${isCredit
                        ? "bg-emerald-500/10 text-emerald-600"
                        : "bg-amber-500/10 text-amber-600"
                        }`}
                    >
                      {isCredit ? (
                        <ArrowDownLeft className="h-4 w-4" />
                      ) : (
                        <ArrowUpRight className="h-4 w-4" />
                      )}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">
                        {tx.description}
                      </p>
                      <p className="truncate font-mono text-[11px] text-muted-foreground">
                        {tx.kind} • {tx.reference} •{" "}
                        {new Date(tx.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span
                      className={`font-mono text-sm font-semibold ${isCredit ? "text-emerald-600" : "text-foreground"
                        }`}
                    >
                      {isCredit ? "+" : "-"}
                      {formatNaira(tx.amountKobo)}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-md border border-border bg-secondary/40 px-2 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground">
                      <FileText className="h-3 w-3" />
                      Receipt
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-2 text-xs text-muted-foreground">
            <span>
              Page {page} of {totalPages} ({wallet?.pagination.total ?? 0} total
              entries)
            </span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="secondary"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button
                size="sm"
                variant="secondary"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      <TransactionReceiptModal
        open={Boolean(selectedTx)}
        onClose={() => setSelectedTx(null)}
        walletTx={selectedTx}
      />
    </section>
  );
}

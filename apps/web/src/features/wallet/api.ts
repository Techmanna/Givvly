import { api } from "@/lib/api-client";

export interface WalletTransactionItem {
  id: string;
  reference: string;
  kind: string;
  direction: "CREDIT" | "DEBIT";
  amountKobo: number;
  description: string;
  createdAt: string;
  metadata?: Record<string, any> | null;
}

export interface WalletRecentRecipient {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  lastSentAt: string;
}

export interface WalletCbnPolicy {
  tier: "TIER_1" | "TIER_2" | "TIER_3";
  label: string;
  singleTransactionLimitKobo: number;
  dailyCumulativeLimitKobo: number;
  maxBalanceKobo: number | null;
  dailyUsedKobo: number;
  dailyRemainingKobo: number;
}

export interface WalletSummary {
  availableBalanceKobo: number;
  reservedBalanceKobo: number;
  escrowBalanceKobo: number;
  currency: string;
  cbnPolicy: WalletCbnPolicy;
  security: {
    hasPin: boolean;
    verifiedBankLinked: boolean;
    bankName?: string;
    accountLast4?: string;
    accountName?: string;
  };
  recentRecipients?: WalletRecentRecipient[];
  transactions: WalletTransactionItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}

export interface WalletAuditReplayReport {
  userId: string;
  accountCode: string;
  asOf: string;
  replayedEventCount: number;
  replayedDebitKobo: number;
  replayedCreditKobo: number;
  replayedBalanceKobo: number;
  currentBalanceKobo: number;
  reconciled: boolean;
}

export function fetchWalletSummary(
  page = 1,
  limit = 10
): Promise<WalletSummary> {
  return api<WalletSummary>(`/wallet?page=${page}&limit=${limit}`);
}

export function fetchWalletAuditReplay(
  asOf?: string
): Promise<WalletAuditReplayReport> {
  const qs = asOf ? `?asOf=${encodeURIComponent(asOf)}` : "";
  return api<WalletAuditReplayReport>(`/wallet/audit-replay${qs}`);
}

export function setWalletTransactionPin(payload: {
  pin: string;
  currentPin?: string;
}): Promise<{ ok: boolean; message: string }> {
  return api<{ ok: boolean; message: string }>("/wallet/pin", {
    method: "POST",
    body: payload,
  });
}

export function initializeWalletTopUp(payload: {
  amountKobo: number;
}): Promise<{
  reference: string;
  accessCode: string;
  authorizationUrl: string;
  amountKobo: number;
  currency: string;
}> {
  return api("/wallet/topup", {
    method: "POST",
    body: payload,
  });
}

export function verifyWalletTopUp(payload: {
  reference: string;
  amountKobo?: number;
  simulateDev?: boolean;
}): Promise<{
  status: string;
  reference: string;
  creditedKobo: number;
  availableBalanceKobo: number;
}> {
  return api("/wallet/topup/verify", {
    method: "POST",
    body: payload,
  });
}

export function upgradeWalletKycTier3(payload: {
  bvn: string;
  nin?: string;
  residentialAddress: string;
}): Promise<{
  ok: boolean;
  tier: "TIER_3";
  message: string;
}> {
  return api("/wallet/kyc/upgrade", {
    method: "POST",
    body: payload,
  });
}

export function transferWalletBalance(payload: {
  from_account?: string;
  to_account: string;
  amount: string;
  currency?: string;
  transaction_id: string;
  pin?: string;
  note?: string;
}): Promise<{
  status: string;
  transaction_id: string;
  amount: string;
  currency: string;
  recipient: { id: string; name: string; email: string };
}> {
  return api("/wallet/balance_transfer", {
    method: "POST",
    body: payload,
  });
}

export function payOrderWithWallet(payload: {
  orderId: string;
  pin?: string;
  transaction_id?: string;
}): Promise<{
  status: string;
  transaction_id: string;
  orderId: string;
  orderNumber: string;
  orderStatus: string;
}> {
  return api("/wallet/pay-order", {
    method: "POST",
    body: payload,
  });
}

export function withdrawWalletToBank(payload: {
  amountKobo: number;
  pin?: string;
  transaction_id?: string;
}): Promise<{
  status: string;
  transaction_id: string;
  payoutId: string;
  amountKobo: number;
  availableBalanceKobo: number;
  tier: string;
  destination: {
    bankName: string;
    accountLast4: string;
    accountName: string;
  };
}> {
  return api("/wallet/withdraw", {
    method: "POST",
    body: payload,
  });
}


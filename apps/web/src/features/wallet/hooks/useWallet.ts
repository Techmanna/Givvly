"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchWalletAuditReplay,
  fetchWalletSummary,
  initializeWalletTopUp,
  payOrderWithWallet,
  setWalletTransactionPin,
  transferWalletBalance,
  upgradeWalletKycTier3,
  verifyWalletTopUp,
  withdrawWalletToBank,
} from "../api";

export function useWalletSummary(page = 1, limit = 10, enabled = true) {
  return useQuery({
    queryKey: ["wallet", "summary", page, limit],
    queryFn: () => fetchWalletSummary(page, limit),
    enabled,
    staleTime: 15_000,
  });
}

export function useWalletAuditReplay(asOf?: string, enabled = false) {
  return useQuery({
    queryKey: ["wallet", "audit-replay", asOf ?? "now"],
    queryFn: () => fetchWalletAuditReplay(asOf),
    enabled,
  });
}

export function useSetWalletPinMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: setWalletTransactionPin,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["wallet"] });
    },
  });
}

export function useInitializeWalletTopUpMutation() {
  return useMutation({
    mutationFn: initializeWalletTopUp,
  });
}

export function useVerifyWalletTopUpMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: verifyWalletTopUp,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["wallet"] });
    },
  });
}

export function useTransferWalletBalanceMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: transferWalletBalance,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["wallet"] });
    },
  });
}

export function usePayOrderWithWalletMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: payOrderWithWallet,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["wallet"] });
      qc.invalidateQueries({ queryKey: ["orders"] });
    },
  });
}

export function useWithdrawWalletMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: withdrawWalletToBank,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["wallet"] });
    },
  });
}

export function useUpgradeWalletKycMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: upgradeWalletKycTier3,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["wallet"] });
    },
  });
}


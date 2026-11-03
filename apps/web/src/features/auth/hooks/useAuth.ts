"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useAuthStore } from "@/stores/auth-store";
import {
  confirmPasswordReset,
  fetchCurrentUser,
  fetchGoogleAuthUrl,
  loginUser,
  logoutUser,
  registerUser,
  requestPasswordReset,
  resendVerificationEmail,
  verifyEmailToken,
} from "../api";
import { authKeys } from "../keys";
import type {
  ForgotPasswordInput,
  LoginInput,
  ResetPasswordInput,
  SignupPayload,
  VerifyEmailInput,
} from "../types";

export function useSessionQuery(enabled = true) {
  const setUser = useAuthStore((s) => s.setUser);
  const clear = useAuthStore((s) => s.clear);

  const query = useQuery({
    queryKey: authKeys.me(),
    queryFn: fetchCurrentUser,
    enabled,
    retry: false,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (query.isSuccess && query.data) {
      setUser(query.data);
    } else if (query.isError) {
      clear();
    }
  }, [query.isSuccess, query.isError, query.data, setUser, clear]);

  return query;
}

export function useSignupMutation() {
  const queryClient = useQueryClient();
  const setUser = useAuthStore((s) => s.setUser);

  return useMutation({
    mutationFn: (payload: SignupPayload) => registerUser(payload),
    onSuccess: (res) => {
      if (res.user && res.user.emailVerified) {
        setUser(res.user);
        queryClient.setQueryData(authKeys.me(), res.user);
      }
    },
  });
}

export function useLoginMutation() {
  const queryClient = useQueryClient();
  const setUser = useAuthStore((s) => s.setUser);

  return useMutation({
    mutationFn: (payload: LoginInput) => loginUser(payload),
    onSuccess: (res) => {
      setUser(res.user);
      queryClient.setQueryData(authKeys.me(), res.user);
    },
  });
}

export function useGoogleAuthMutation() {
  return useMutation({
    mutationFn: (next?: string) => fetchGoogleAuthUrl(next),
  });
}

export function useVerifyEmailMutation() {
  const queryClient = useQueryClient();
  const setUser = useAuthStore((s) => s.setUser);

  return useMutation({
    mutationFn: (payload: VerifyEmailInput) => verifyEmailToken(payload),
    onSuccess: (res) => {
      if (res.user) {
        setUser(res.user);
        queryClient.setQueryData(authKeys.me(), res.user);
      } else {
        queryClient.invalidateQueries({ queryKey: authKeys.me() });
      }
    },
  });
}

export function useResendVerificationMutation() {
  return useMutation({
    mutationFn: (email: string) => resendVerificationEmail(email),
  });
}

export function useForgotPasswordMutation() {
  return useMutation({
    mutationFn: (payload: ForgotPasswordInput) => requestPasswordReset(payload),
  });
}

export function useResetPasswordMutation() {
  return useMutation({
    mutationFn: (payload: ResetPasswordInput) => confirmPasswordReset(payload),
  });
}

export function useLogoutMutation() {
  const queryClient = useQueryClient();
  const clear = useAuthStore((s) => s.clear);

  return useMutation({
    mutationFn: () => logoutUser(),
    onSettled: () => {
      clear();
      queryClient.clear();
      try {
        window.localStorage.removeItem("givvly.wizard.v1");
      } catch {
        // Ignore storage errors
      }
    },
  });
}


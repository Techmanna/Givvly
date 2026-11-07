import { api } from "@/lib/api-client";
import type {
  ForgotPasswordInput,
  GoogleUrlResponse,
  LoginInput,
  LoginResponse,
  MessageResponse,
  RegisterResponse,
  ResetPasswordInput,
  SignupPayload,
  User,
  VerifyEmailInput,
} from "./types";

export async function fetchCurrentUser(): Promise<User> {
  const res = await api<{ user?: User } | User>("/auth/me");
  return (res as { user?: User }).user || (res as User);
}

export function registerUser(payload: SignupPayload): Promise<RegisterResponse> {
  return api<RegisterResponse>("/auth/register", {
    method: "POST",
    body: {
      name: payload.name,
      email: payload.email,
      phone: payload.phone,
      password: payload.password,
      acceptTerms: (payload as any).acceptTerms ?? payload.terms ?? true,
      terms: payload.terms ?? true,
    },
  });
}

export function loginUser(payload: LoginInput): Promise<LoginResponse> {
  return api<LoginResponse>("/auth/login", {
    method: "POST",
    body: payload,
  });
}

export function fetchGoogleAuthUrl(next?: string): Promise<GoogleUrlResponse> {
  const query = next ? `?next=${encodeURIComponent(next)}` : "";
  return api<GoogleUrlResponse>(`/auth/google/url${query}`);
}

export function verifyEmailToken(
  payload: VerifyEmailInput
): Promise<{ user?: User; message?: string }> {
  return api<{ user?: User; message?: string }>("/auth/verify-email", {
    method: "POST",
    body: payload,
  });
}

export function resendVerificationEmail(
  email: string
): Promise<MessageResponse> {
  return api<MessageResponse>("/auth/resend-verification", {
    method: "POST",
    body: { email },
  });
}

export function requestPasswordReset(
  payload: ForgotPasswordInput
): Promise<MessageResponse> {
  return api<MessageResponse>("/auth/forgot-password", {
    method: "POST",
    body: payload,
  });
}

export function confirmPasswordReset(
  payload: ResetPasswordInput
): Promise<MessageResponse> {
  return api<MessageResponse>("/auth/reset-password", {
    method: "POST",
    body: {
      token: payload.token,
      password: payload.password,
    },
  });
}

export function logoutUser(): Promise<MessageResponse> {
  return api<MessageResponse>("/auth/logout", {
    method: "POST",
  });
}

export function updateProfile(payload: {
  name: string;
  phone?: string;
}): Promise<User> {
  return api<User>("/me/profile", {
    method: "PATCH",
    body: payload,
  });
}

export function changePassword(payload: {
  currentPassword: string;
  newPassword: string;
}): Promise<{ ok: boolean }> {
  return api<{ ok: boolean }>("/me/password", {
    method: "POST",
    body: payload,
  });
}

export function deleteAccount(): Promise<{ deleted: boolean }> {
  return api<{ deleted: boolean }>("/me", {
    method: "DELETE",
  });
}


import type {
  ForgotPasswordInput,
  LoginInput,
  ResetPasswordInput,
  Role,
  SignupInput,
  SignupPayload,
  User,
  VerifyEmailInput,
} from "@givvly/contracts";

export type {
  ForgotPasswordInput,
  LoginInput,
  ResetPasswordInput,
  Role,
  SignupInput,
  SignupPayload,
  User,
  VerifyEmailInput,
};

export type RegisterResponse = {
  user: User;
  requiresVerification?: boolean;
};

export type LoginResponse = {
  user: User;
};

export type GoogleUrlResponse = {
  url: string;
};

export type MessageResponse = {
  message: string;
};


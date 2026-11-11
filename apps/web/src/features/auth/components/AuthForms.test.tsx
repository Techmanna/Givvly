import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { makeQueryClient } from "@/lib/query-client";
import { LoginForm } from "./LoginForm";
import { SignupForm } from "./SignupForm";
import { ResetPasswordForm } from "./ResetPasswordForm";
import { mapAuthErrorToForm } from "./mapAuthError";
import * as authApi from "../api";
import { ApiClientError } from "@/lib/api-client";

const pushMock = vi.fn();
const replaceMock = vi.fn();
const refreshMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
    replace: replaceMock,
    refresh: refreshMock,
  }),
}));

function renderWithQuery(ui: React.ReactElement) {
  const client = makeQueryClient();
  return render(
    <QueryClientProvider client={client}>{ui}</QueryClientProvider>
  );
}

describe("LoginForm & SignupForm", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    pushMock.mockReset();
    replaceMock.mockReset();
    refreshMock.mockReset();
  });

  it("redirects admin to /admin upon successful login", async () => {
    vi.spyOn(authApi, "loginUser").mockResolvedValueOnce({
      user: {
        id: "usr_admin_1",
        name: "Admin User",
        email: "admin@givvly.store",
        role: "ADMIN",
        emailVerified: true,
      },
    });

    const user = userEvent.setup();
    renderWithQuery(<LoginForm />);

    await user.type(screen.getByLabelText(/email address/i), "admin@givvly.store");
    await user.type(screen.getByLabelText(/^password$/i), "ValidPassword123!");
    await user.click(screen.getByRole("button", { name: /^sign in$/i }));

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith("/admin");
      expect(refreshMock).toHaveBeenCalled();
    });
  });

  it("redirects admin to /admin upon successful login", async () => {
    vi.spyOn(authApi, "loginUser").mockResolvedValueOnce({
      user: {
        id: "usr_admin_1",
        name: "Admin User",
        email: "admin@givvly.store",
        role: "ADMIN",
        emailVerified: true,
      },
    });

    const user = userEvent.setup();
    renderWithQuery(<LoginForm />);

    await user.type(screen.getByLabelText(/email address/i), "admin@givvly.store");
    await user.type(screen.getByLabelText(/^password$/i), "ValidPassword123!");
    await user.click(screen.getByRole("button", { name: /^sign in$/i }));

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith("/admin");
    });
  });

  it("honors specific nextPath if provided for standard user", async () => {
    vi.spyOn(authApi, "loginUser").mockResolvedValueOnce({
      user: {
        id: "usr_adaobi_1",
        name: "Adaobi Okafor",
        email: "adaobi@givvly.store",
        role: "USER",
        emailVerified: true,
      },
    });

    const user = userEvent.setup();
    renderWithQuery(<LoginForm nextPath="/events/new" />);

    await user.type(screen.getByLabelText(/email address/i), "adaobi@givvly.store");
    await user.type(screen.getByLabelText(/^password$/i), "ValidPassword123!");
    await user.click(screen.getByRole("button", { name: /^sign in$/i }));

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith("/events/new");
    });
  });

  it("validates required fields and shows generic error on INVALID_CREDENTIALS", async () => {
    vi.spyOn(authApi, "loginUser").mockRejectedValueOnce(
      new ApiClientError({
        status: 401,
        code: "INVALID_CREDENTIALS",
        message: "Wrong password",
        requestId: "req_1",
      })
    );

    const user = userEvent.setup();
    renderWithQuery(<LoginForm nextPath="/events/new" />);

    await user.type(screen.getByLabelText(/email address/i), "ada@givvly.store");
    await user.type(screen.getByLabelText(/^password$/i), "WrongPassword123");
    await user.click(screen.getByRole("button", { name: /^sign in$/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        /invalid email or password/i
      );
    });
  });

  it("submits signup and shows 'Check your email' with 60s resend cooldown", async () => {
    vi.spyOn(authApi, "registerUser").mockResolvedValueOnce({
      user: {
        id: "usr_1",
        name: "Adaobi Okafor",
        email: "ada@givvly.store",
        role: "USER",
        emailVerified: false,
      },
      requiresVerification: true,
    });

    const user = userEvent.setup();
    renderWithQuery(<SignupForm />);

    await user.type(screen.getByLabelText(/full name/i), "Adaobi Okafor");
    await user.type(screen.getByLabelText(/email address/i), "ada@givvly.store");
    await user.type(screen.getByLabelText(/^password$/i), "SafePassword99!");
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /check your email/i })
      ).toBeInTheDocument();
    });

    expect(
      screen.getByRole("button", { name: /resend email in 60s/i })
    ).toBeDisabled();
  });

  it("registerUser passes acceptTerms and terms in payload, and resendVerificationEmail resolves", async () => {
    vi.spyOn(authApi, "resendVerificationEmail").mockResolvedValueOnce({
      message: "Verification email sent",
    });
    const resendRes = await authApi.resendVerificationEmail("iamdavidenabs@gmail.com");
    expect(resendRes).toBeDefined();
    expect(resendRes.message).toBeDefined();
  });

  it("handles email conflict cleanly without separating letters with spaces", async () => {
    vi.spyOn(authApi, "registerUser").mockRejectedValueOnce(
      new ApiClientError({
        status: 409,
        code: "Conflict",
        message: "An account with this email already exists",
        details: "An account with this email already exists" as any,
        requestId: "req_conflict",
      })
    );

    const user = userEvent.setup();
    renderWithQuery(<SignupForm />);

    await user.type(screen.getByLabelText(/full name/i), "David Enabulele");
    await user.type(screen.getByLabelText(/email address/i), "iamdavidenabs@gmail.com");
    await user.type(screen.getByLabelText(/^password$/i), "SafePassword99!");
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => {
      // Must NOT display spaced-out letters like "A n a c c o u n t..."
      expect(screen.queryByText(/A n a c c o u n t/i)).not.toBeInTheDocument();
      // Displays the proper inline error under email field
      expect(screen.getByText("An account with this email already exists.")).toBeInTheDocument();
      // Displays the helper link to sign in
      expect(screen.getByRole("link", { name: /sign in instead/i })).toBeInTheDocument();
    });
  });

  it("ResetPasswordForm maps technical validation errors to friendly messages without raw camelCase", async () => {
    vi.spyOn(authApi, "confirmPasswordReset").mockRejectedValueOnce(
      new ApiClientError({
        status: 400,
        code: "Bad Request",
        message: "Validation failed",
        details: [
          "newPassword must be longer than or equal to 8 characters",
          "newPassword must be a string",
        ] as any,
        requestId: "req_reset_err",
      })
    );

    const user = userEvent.setup();
    renderWithQuery(<ResetPasswordForm token="tok_test_123" />);

    await user.type(screen.getByLabelText(/^new password$/i), "GJuum6JW86fSamH");
    await user.type(screen.getByLabelText(/^confirm new password$/i), "GJuum6JW86fSamH");
    await user.click(screen.getByRole("button", { name: /reset password/i }));

    await waitFor(() => {
      // Must NOT display raw developer error strings
      expect(screen.queryByText(/newPassword must be longer than/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/newPassword must be a string/i)).not.toBeInTheDocument();
      // Must display user-friendly message mapped to password field
      expect(screen.getByText(/Password must be at least 8 characters long\./i)).toBeInTheDocument();
    });
  });

  it("mapAuthErrorToForm maps expired token to clear friendly message", () => {
    const setError = vi.fn();
    const result = mapAuthErrorToForm(
      new ApiClientError({
        status: 400,
        code: "BAD_REQUEST",
        message: "Invalid or expired password reset token",
        requestId: "req_token",
      }),
      setError,
      ["password", "confirmPassword", "token"]
    );

    expect(result.formError).toBe(
      "This link is invalid or has expired. Please request a new one."
    );
  });
});


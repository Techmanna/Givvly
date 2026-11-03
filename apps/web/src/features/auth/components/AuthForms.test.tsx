import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { makeQueryClient } from "@/lib/query-client";
import { LoginForm } from "./LoginForm";
import { SignupForm } from "./SignupForm";
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
        email: "admin@givvly.ng",
        role: "ADMIN",
        emailVerified: true,
      },
    });

    const user = userEvent.setup();
    renderWithQuery(<LoginForm />);

    await user.type(screen.getByLabelText(/email address/i), "admin@givvly.ng");
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
        email: "admin@givvly.ng",
        role: "ADMIN",
        emailVerified: true,
      },
    });

    const user = userEvent.setup();
    renderWithQuery(<LoginForm />);

    await user.type(screen.getByLabelText(/email address/i), "admin@givvly.ng");
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
        email: "adaobi@givvly.ng",
        role: "USER",
        emailVerified: true,
      },
    });

    const user = userEvent.setup();
    renderWithQuery(<LoginForm nextPath="/events/new" />);

    await user.type(screen.getByLabelText(/email address/i), "adaobi@givvly.ng");
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

    await user.type(screen.getByLabelText(/email address/i), "ada@givvly.ng");
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
        email: "ada@givvly.ng",
        role: "USER",
        emailVerified: false,
      },
      requiresVerification: true,
    });

    const user = userEvent.setup();
    renderWithQuery(<SignupForm />);

    await user.type(screen.getByLabelText(/full name/i), "Adaobi Okafor");
    await user.type(screen.getByLabelText(/email address/i), "ada@givvly.ng");
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
});


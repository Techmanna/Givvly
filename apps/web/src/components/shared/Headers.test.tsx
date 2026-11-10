import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeQueryClient } from "@/lib/query-client";
import { useAuthStore } from "@/stores/auth-store";
import { MarketingHeader } from "./MarketingHeader";
import { UserAppHeader } from "./UserAppHeader";
import { AdminShell } from "@/features/admin";
import * as authApi from "@/features/auth/api";
import type { User } from "@givvly/contracts";

vi.mock("next/navigation", () => ({
  usePathname: () => "/gifts",
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

vi.mock("@/features/notifications", () => ({
  NotificationBell: () => <div data-testid="notification-bell">Bell</div>,
}));

function renderWithQuery(ui: React.ReactElement) {
  const client = makeQueryClient();
  return render(
    <QueryClientProvider client={client}>{ui}</QueryClientProvider>
  );
}

const mockHostUser: User = {
  id: "user_1",
  email: "adaobi@example.com",
  name: "Adaobi Nwosu",
  role: "USER",
  emailVerified: true,
};

const mockAdminUser: User = {
  id: "user_admin",
  email: "admin@givvly.com",
  name: "Super Admin",
  role: "ADMIN",
  emailVerified: true,
};

describe("MarketingHeader", () => {
  beforeEach(() => {
    useAuthStore.getState().clear();
  });

  it("renders guest view when unauthenticated", () => {
    renderWithQuery(<MarketingHeader initialUser={null} />);

    expect(screen.getByText("Gift Atelier")).toBeInTheDocument();
    expect(screen.getByText("Live Celebrations")).toBeInTheDocument();
    expect(screen.getByText("Concierge & FAQ")).toBeInTheDocument();
    expect(screen.getByText("Sign in")).toBeInTheDocument();
    expect(screen.getByText("Create Your Event")).toBeInTheDocument();
    expect(screen.queryByTestId("notification-bell")).not.toBeInTheDocument();
  });

  it("renders authenticated controls when user is logged in", () => {
    renderWithQuery(<MarketingHeader initialUser={mockHostUser} />);

    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByTestId("notification-bell")).toBeInTheDocument();
    expect(screen.getByText("Adaobi")).toBeInTheDocument();
    expect(screen.queryByText("Sign in")).not.toBeInTheDocument();
  });

  it("shows Admin shortcut for admin users", () => {
    renderWithQuery(<MarketingHeader initialUser={mockAdminUser} />);

    expect(screen.getByText("Admin")).toBeInTheDocument();
  });
});

describe("UserAppHeader", () => {
  beforeEach(() => {
    useAuthStore.getState().clear();
  });

  it("renders navigation links and user avatar", () => {
    renderWithQuery(<UserAppHeader user={mockHostUser} />);

    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Create Event")).toBeInTheDocument();
    expect(screen.getByText("Gift Atelier")).toBeInTheDocument();
    expect(screen.getByText("My Orders")).toBeInTheDocument();
    expect(screen.getByText("Bank & Payouts")).toBeInTheDocument();
    expect(screen.getByTestId("notification-bell")).toBeInTheDocument();
    expect(screen.getByText("Adaobi")).toBeInTheDocument();
  });

  it("renders Admin Console button when user role is ADMIN", () => {
    renderWithQuery(<UserAppHeader user={mockAdminUser} />);

    expect(screen.getByText("Admin Console")).toBeInTheDocument();
  });

  it("calls logoutUser and clears auth store on sign out", async () => {
    const logoutSpy = vi.spyOn(authApi, "logoutUser").mockResolvedValueOnce({ message: "Signed out" });
    useAuthStore.getState().setUser(mockHostUser);
    const user = userEvent.setup();

    renderWithQuery(<UserAppHeader user={mockHostUser} />);

    // Open user dropdown menu
    const trigger = screen.getByRole("button", { name: /user account menu/i });
    await user.click(trigger);

    const signOut = await screen.findByRole("menuitem", { name: /sign out/i });
    await user.click(signOut);

    await waitFor(() => {
      expect(logoutSpy).toHaveBeenCalledTimes(1);
      expect(useAuthStore.getState().user).toBeNull();
    });
  });
});

describe("AdminShell", () => {
  it("renders Admin navigation and Sign out buttons", () => {
    renderWithQuery(
      <AdminShell userName="Test Admin" userEmail="admin@example.com">
        <div>Admin Content</div>
      </AdminShell>
    );

    expect(screen.getByText("Givvly")).toBeInTheDocument();
    expect(screen.getByText("Test Admin")).toBeInTheDocument();
    expect(screen.getByText("admin@example.com")).toBeInTheDocument();
    expect(screen.getByText("Admin Content")).toBeInTheDocument();

    const signOutButtons = screen.getAllByRole("button", { name: /sign out/i });
    expect(signOutButtons.length).toBeGreaterThanOrEqual(1);
  });

  it("calls logoutUser when clicking desktop sidebar Sign out", async () => {
    const logoutSpy = vi.spyOn(authApi, "logoutUser").mockResolvedValueOnce({ message: "Signed out" });
    useAuthStore.getState().setUser(mockAdminUser);
    const user = userEvent.setup();

    renderWithQuery(
      <AdminShell userName="Super Admin" userEmail="admin@givvly.com">
        <div>Admin Dashboard</div>
      </AdminShell>
    );

    const signOutButtons = screen.getAllByRole("button", { name: /sign out/i });
    expect(signOutButtons.length).toBeGreaterThan(0);
    await user.click(signOutButtons[0]!);

    await waitFor(() => {
      expect(logoutSpy).toHaveBeenCalledTimes(1);
      expect(useAuthStore.getState().user).toBeNull();
    });
  });
});

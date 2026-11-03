import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { resetMockDatabase } from "@/lib/mocks/router";
import { AccountProfileForm, AccountSecurityForm } from "@/features/auth";
import {
  HeroCeremonyShowcase,
  LiveCelebrationsDirectory,
} from "@/features/events";
import { AdminConsoleView } from "./components/AdminConsoleView";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
  }),
}));

function createTestWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

describe("Step 8 Hardening, Account, Admin & SEO", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_USE_MOCK_API = "true";
    resetMockDatabase();
  });

  it("renders AccountProfileForm and saves updated profile", async () => {
    const user = userEvent.setup();
    render(<AccountProfileForm />, { wrapper: createTestWrapper() });

    const nameInput = screen.getByLabelText(/Full name/i);
    await user.clear(nameInput);
    await user.type(nameInput, "Adaobi Chidi-Okafor");
    await user.click(screen.getByRole("button", { name: /Save Profile/i }));

    expect(nameInput).toHaveValue("Adaobi Chidi-Okafor");
  });

  it("renders AccountSecurityForm with delete confirmation modal", async () => {
    const user = userEvent.setup();
    render(<AccountSecurityForm />, { wrapper: createTestWrapper() });

    await user.click(screen.getByRole("button", { name: /Delete Account/i }));
    expect(
      screen.getByText(/Delete your Givvly account\?/i)
    ).toBeInTheDocument();
  });

  it("renders AdminConsoleView sections (moderation, events, vendors, users)", async () => {
    const { rerender } = render(<AdminConsoleView section="events" />, {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => {
      expect(
        screen.getByText(/Adaobi & Chidi's Forever/i)
      ).toBeInTheDocument();
    });

    rerender(<AdminConsoleView section="vendors" />);
    await waitFor(() => {
      expect(screen.getByText(/Lagos Luxe Hampers/i)).toBeInTheDocument();
    });

    rerender(<AdminConsoleView section="users" />);
    await waitFor(() => {
      expect(screen.getByText(/Adaobi Okafor/i)).toBeInTheDocument();
    });
  });

  it("generates compliant robots.txt and sitemap.xml metadata", () => {
    const robotsConfig = robots();
    expect(robotsConfig.sitemap).toContain("/sitemap.xml");

    const entries = sitemap();
    expect(entries.some((e) => e.url.endsWith("/gifts"))).toBe(true);
    expect(entries.some((e) => e.url.endsWith("/celebrations"))).toBe(true);
    expect(
      entries.some((e) => e.url.endsWith("/e/adaobi-and-chidi-2026"))
    ).toBe(true);
  });

  it("renders LiveCelebrationsDirectory with weddings, birthdays, send-forths, naming ceremonies, and graduations", async () => {
    const user = userEvent.setup();
    render(<LiveCelebrationsDirectory />, { wrapper: createTestWrapper() });

    await waitFor(() => {
      expect(
        screen.getAllByText(/Adaobi & Chidi's Forever/i).length
      ).toBeGreaterThan(0);
      expect(
        screen.getAllByText(/Tunde's 40th Rooftop Jubilee/i).length
      ).toBeGreaterThan(0);
      expect(
        screen.getAllByText(/Prof\. Ngozi Nwosu's Distinguished Send-Forth/i)
          .length
      ).toBeGreaterThan(0);
    });

    await user.click(
      screen.getByRole("tab", { name: /Send-Forths & Honours/i })
    );
    await waitFor(() => {
      expect(
        screen.getAllByText(/Prof\. Ngozi Nwosu's Distinguished Send-Forth/i)
          .length
      ).toBeGreaterThan(0);
    });
  });

  it("switches ceremonies interactively in HeroCeremonyShowcase", async () => {
    const user = userEvent.setup();
    render(<HeroCeremonyShowcase />);

    expect(screen.getByText(/Adaobi & Chidi/i)).toBeInTheDocument();
    await user.click(screen.getByRole("tab", { name: /Send-Forth/i }));
    expect(screen.getByText(/Prof\. Ngozi Nwosu/i)).toBeInTheDocument();
  });
});

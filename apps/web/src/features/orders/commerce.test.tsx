import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createPoolContributionSchema,
  directCheckoutSchema,
  getNextValidOrderStatus,
} from "@givvly/contracts";
import { resetMockDatabase } from "@/lib/mocks/router";
import { PoolCard, RegistryGrid } from "@/features/registry";
import { StatusStepper } from "@/features/vendor";
import { LedgerTable } from "@/features/admin";
import { OrderTimeline } from "./components/OrderTimeline";
import { useCartStore } from "@/stores/cart-store";

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

describe("Phase 3 Commerce, Registry, Vendor & Admin", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_USE_MOCK_API = "true";
    resetMockDatabase();
  });

  it("validates direct checkout Nigerian phone and address length", () => {
    const valid = directCheckoutSchema.safeParse({
      recipientName: "Chidi Okafor",
      recipientPhone: "08031234567",
      street: "14 Admiralty Way",
      area: "Lekki Phase 1",
      city: "Lagos",
      state: "Lagos",
      giftNote: "Congratulations!",
      wrapping: true,
    });
    expect(valid.success).toBe(true);

    const invalidPhone = directCheckoutSchema.safeParse({
      recipientName: "Chidi Okafor",
      recipientPhone: "12345",
      street: "14 Admiralty Way",
      area: "Lekki Phase 1",
      city: "Lagos",
      state: "Lagos",
    });
    expect(invalidPhone.success).toBe(false);
  });

  it("enforces remaining goal cap in createPoolContributionSchema", () => {
    // ₦20,000 remaining (2,000,000 kobo)
    const schema = createPoolContributionSchema(2_000_000);

    const ok = schema.safeParse({
      amountNaira: 15_000,
      name: "Kemi",
      email: "kemi@example.com",
      anonymous: false,
    });
    expect(ok.success).toBe(true);

    const overfunded = schema.safeParse({
      amountNaira: 25_000,
      name: "Kemi",
      email: "kemi@example.com",
      anonymous: false,
    });
    expect(overfunded.success).toBe(false);
  });

  it("enforces strict sequential vendor order status transitions", () => {
    expect(getNextValidOrderStatus("PENDING_PAYMENT")).toBe("CONFIRMED");
    expect(getNextValidOrderStatus("CONFIRMED")).toBe("PACKED");
    expect(getNextValidOrderStatus("PACKED")).toBe("SHIPPED");
    expect(getNextValidOrderStatus("SHIPPED")).toBe("DELIVERED");
    expect(getNextValidOrderStatus("DELIVERED")).toBeNull();
  });

  it("renders RegistryGrid and PoolCard with Naira amounts", () => {
    render(
      <div>
        <RegistryGrid
          slug="chidada-forever-2026"
          moneyGiftsEnabled
          items={[
            {
              id: "reg_1",
              title: "Smeg 50s Retro Kettle",
              priceKobo: 18_500_000,
              status: "AVAILABLE",
            },
          ]}
        />
        <PoolCard
          slug="chidada-forever-2026"
          pool={{
            id: "pool_1",
            title: "Zanzibar Honeymoon Fund",
            priceKobo: 250_000_000,
            targetKobo: 250_000_000,
            raisedKobo: 150_000_000,
            status: "AVAILABLE",
            mode: "CASH",
          }}
        />
      </div>,
      { wrapper: createTestWrapper() }
    );

    expect(screen.getByText("Smeg 50s Retro Kettle")).toBeInTheDocument();
    expect(screen.getByText("Zanzibar Honeymoon Fund")).toBeInTheDocument();
    expect(screen.getByText("60% funded")).toBeInTheDocument();
  });

  it("only enables the next legal status button in StatusStepper", () => {
    render(<StatusStepper orderId="ord_01" currentStatus="CONFIRMED" />, {
      wrapper: createTestWrapper(),
    });

    const confirmedBtn = screen.getByRole("button", { name: /Confirmed/i });
    const packedBtn = screen.getByRole("button", { name: /Packed/i });
    const shippedBtn = screen.getByRole("button", { name: /Shipped/i });
    const deliveredBtn = screen.getByRole("button", { name: /Delivered/i });

    expect(confirmedBtn).toBeDisabled();
    expect(packedBtn).not.toBeDisabled();
    expect(shippedBtn).toBeDisabled();
    expect(deliveredBtn).toBeDisabled();
  });

  it("renders OrderTimeline and LedgerTable with kobo values", () => {
    render(
      <div>
        <OrderTimeline
          currentStatus="SHIPPED"
          timeline={[
            { status: "PENDING_PAYMENT", at: "2026-10-20T09:00:00Z" },
            { status: "CONFIRMED", at: "2026-10-20T09:05:00Z" },
            { status: "PACKED", at: "2026-10-21T10:00:00Z" },
            { status: "SHIPPED", at: "2026-10-21T14:00:00Z" },
          ]}
        />
        <LedgerTable
          entries={[
            {
              id: "led_1",
              type: "CREDIT",
              description: "Money Gift — Tunde Bakare",
              amountKobo: 50_000_000,
              reference: "PAY_GIV_1001",
              createdAt: "2026-10-20T10:15:00Z",
            },
          ]}
        />
      </div>
    );

    expect(screen.getByText("Out for delivery")).toBeInTheDocument();
    expect(screen.getByText("Money Gift — Tunde Bakare")).toBeInTheDocument();
    expect(screen.getByText("PAY_GIV_1001")).toBeInTheDocument();
  });

  it("hydrates and persists direct checkout draft in cart-store", () => {
    const store = useCartStore.getState();
    store.clearCart("lagos-artisan-scented-candle-set");

    store.updateDraft({
      recipientPhone: "08031234567",
      recipientName: "Chidi Nwosu",
      wrapping: true,
    });

    expect(useCartStore.getState().draft.recipientPhone).toBe("08031234567");
    expect(useCartStore.getState().draft.recipientName).toBe("Chidi Nwosu");
    expect(useCartStore.getState().draft.wrapping).toBe(true);
  });
});

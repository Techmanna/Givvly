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
import { BoxCheckoutForm } from "./components/BoxCheckoutForm";
import { useCartStore } from "@/stores/cart-store";
import type { CatalogProduct } from "@givvly/contracts";

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

  it("manages custom Gift Box items, packaging selection, and predefined combos in cart store", () => {
    const store = useCartStore.getState();
    store.clearBox();

    const sampleItem1: CatalogProduct = {
      id: "prod_sample_1",
      slug: "artisan-chocolate-truffles",
      name: "Artisan Chocolate Truffles",
      description: "Handcrafted dark truffles",
      priceKobo: 4_500_000, // ₦45,000
      category: "Chocolates",
      occasions: ["BIRTHDAY"],
      relationships: ["FRIEND"],
      vendorName: "Lagos Chocolatier",
      inStock: true,
      rating: 5,
      reviewCount: 12,
    };

    const sampleItem2: CatalogProduct = {
      id: "prod_sample_2",
      slug: "french-jasmine-candle",
      name: "French Jasmine Scented Candle",
      description: "Soy wax candle",
      priceKobo: 6_000_000, // ₦60,000
      category: "Wellness",
      occasions: ["BIRTHDAY"],
      relationships: ["FRIEND"],
      vendorName: "Scents of Ikoyi",
      inStock: true,
      rating: 5,
      reviewCount: 8,
    };

    // Add items to box
    store.addToBox(sampleItem1, 1);
    store.addToBox(sampleItem2, 2);

    expect(useCartStore.getState().getBoxItemCount()).toBe(3);
    // 45,000 + (60,000 * 2) = 165,000 naira = 16,500,000 kobo
    expect(useCartStore.getState().getItemsSubtotalKobo()).toBe(16_500_000);

    // Update quantity & test remove
    useCartStore.getState().updateBoxItemQty("prod_sample_1", 2);
    expect(useCartStore.getState().getBoxItemCount()).toBe(4);

    // Set packaging (Handwoven Cane Hamper: +₦8,500 = 850,000 kobo)
    useCartStore.getState().setBoxPackaging("woven-cane");
    expect(useCartStore.getState().getPackagingOption().name).toContain("Cane Hamper");
    // (45k*2 + 60k*2) + 8.5k = 218,500 naira = 21,850,000 kobo
    expect(useCartStore.getState().getTotalKobo()).toBe(21_850_000);

    // Load Predefined Combo
    const comboProduct: CatalogProduct = {
      id: "prod_combo_test",
      slug: "gentlemans-box-test",
      name: "The Gentleman's Box",
      description: "Curated 4-piece box",
      priceKobo: 25_000_000,
      category: "Combos",
      occasions: ["BIRTHDAY"],
      relationships: ["HUSBAND"],
      vendorName: "Lagos Luxe Hampers",
      inStock: true,
      rating: 5,
      reviewCount: 10,
      isCombo: true,
      comboItems: [
        { name: "Oud Cologne", qty: 1 },
        { name: "Leather Wallet", qty: 1 },
      ],
    };

    useCartStore.getState().loadPredefinedCombo(comboProduct);
    expect(useCartStore.getState().box.comboTitle).toBe("The Gentleman's Box");
    expect(useCartStore.getState().getBoxItemCount()).toBe(1);
    expect(useCartStore.getState().box.items[0]?.product.name).toBe("The Gentleman's Box");
  });

  it("renders BoxCheckoutForm with curated items and packaging", () => {
    const store = useCartStore.getState();
    store.clearBox();

    const sampleItem: CatalogProduct = {
      id: "prod_checkout_1",
      slug: "royal-champagne",
      name: "Moët & Chandon Brut",
      description: "Champagne",
      priceKobo: 18_500_000,
      category: "Drinks",
      occasions: ["WEDDING"],
      relationships: ["COUPLE"],
      vendorName: "Lagos Luxe Hampers",
      inStock: true,
      rating: 5,
      reviewCount: 20,
    };

    store.addToBox(sampleItem, 1);
    store.setComboTitle("Wedding Toast Box");

    render(<BoxCheckoutForm />, { wrapper: createTestWrapper() });

    expect(screen.getByText("Moët & Chandon Brut")).toBeInTheDocument();
    expect(screen.getByText("Wedding Toast Box")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Pay & Send Gift Box/i })).toBeInTheDocument();
  });
});

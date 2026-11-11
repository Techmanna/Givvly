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
import { CheckoutForm } from "./components/CheckoutForm";
import { BoxCheckoutForm } from "./components/BoxCheckoutForm";
import {
  SavedAddressSelector,
  SaveAddressToggle,
} from "./components/SavedAddressSelector";
import { useCartStore } from "@/stores/cart-store";
import { useSavedAddressStore } from "@/stores/saved-address-store";
import { createDirectOrder, fetchOrderTracking } from "./api";

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

    const validWithEmail = directCheckoutSchema.safeParse({
      recipientName: "Chidi Okafor",
      recipientPhone: "08031234567",
      buyerEmail: "buyer@example.com",
      street: "14 Admiralty Way",
      area: "Lekki Phase 1",
      city: "Lagos",
      state: "Lagos",
      giftNote: "Congratulations!",
      wrapping: true,
    });
    expect(validWithEmail.success).toBe(true);

    const invalidEmail = directCheckoutSchema.safeParse({
      recipientName: "Chidi Okafor",
      recipientPhone: "08031234567",
      buyerEmail: "not-an-email",
      street: "14 Admiralty Way",
      area: "Lekki Phase 1",
      city: "Lagos",
      state: "Lagos",
    });
    expect(invalidEmail.success).toBe(false);
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

  it("renders CheckoutForm with buyer confirmation email section", async () => {
    render(
      <CheckoutForm productSlug="signature-oud-and-amber-gift-box" />,
      {
        wrapper: createTestWrapper(),
      }
    );

    expect(
      await screen.findByText(/Your Details & Receipt Email/i)
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText(/Your email address/i)
    ).toBeInTheDocument();
  });

  it("manages multi-item Box flow with addItem, updateItemQty, removeItem, and clearBox", () => {
    const store = useCartStore.getState();
    store.clearBox();
    expect(useCartStore.getState().items).toHaveLength(0);

    // Add first item
    store.addItem({
      id: "prod_01",
      slug: "luxury-candle",
      name: "Hand-Poured Scented Candle",
      priceKobo: 2_500_000,
      imageUrl: "https://images.unsplash.com/photo-1603006905003-be475563bc59",
      vendorName: "Lagos Botanicals",
    });

    expect(useCartStore.getState().items).toHaveLength(1);
    expect(useCartStore.getState().items[0]?.qty).toBe(1);

    // Add same item again -> increments quantity
    store.addItem({
      id: "prod_01",
      slug: "luxury-candle",
      name: "Hand-Poured Scented Candle",
      priceKobo: 2_500_000,
    });
    expect(useCartStore.getState().items).toHaveLength(1);
    expect(useCartStore.getState().items[0]?.qty).toBe(2);

    // Add second item
    store.addItem({
      id: "prod_02",
      slug: "artisanal-chocolate",
      name: "Single-Origin Dark Chocolate",
      priceKobo: 1_200_000,
    });
    expect(useCartStore.getState().items).toHaveLength(2);

    // Update quantity
    store.updateItemQty("prod_01", 3);
    expect(useCartStore.getState().items.find((i) => i.id === "prod_01")?.qty).toBe(3);

    // Remove item
    store.removeItem("prod_01");
    expect(useCartStore.getState().items).toHaveLength(1);
    expect(useCartStore.getState().items[0]?.id).toBe("prod_02");

    // Clear box
    store.clearBox();
    expect(useCartStore.getState().items).toHaveLength(0);
  });

  it("renders BoxCheckoutForm with item count, luxury wrapping option, and recipient fields", () => {
    const store = useCartStore.getState();
    store.clearBox();
    store.addItem(
      {
        id: "item_test_01",
        slug: "leather-passport-holder",
        name: "Personalized Leather Passport Holder",
        priceKobo: 4_500_000,
      },
      2
    );

    render(<BoxCheckoutForm />, {
      wrapper: createTestWrapper(),
    });

    expect(screen.getByText("Checkout Your Gift Box")).toBeInTheDocument();
    expect(screen.getByText("Personalized Leather Passport Holder")).toBeInTheDocument();
    expect(screen.getByText(/Luxury Whole-Box Gift Presentation/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Recipient Full Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Recipient Phone/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Street Address/i)).toBeInTheDocument();
  });

  it("tracks multi-item box order by orderId or trackingToken with exact items and total", async () => {
    const createdRes = await createDirectOrder(
      {
        items: [
          {
            name: "Artisan Leather Journal",
            qty: 2,
            unitPriceKobo: 15_000_000,
          },
          {
            name: "Pure Wildflower Honey",
            qty: 1,
            unitPriceKobo: 10_000_000,
          },
        ],
        wrapping: true,
        recipientName: "Bisi Akande",
        recipientPhone: "08031234567",
        address: {
          street: "12 Marina Road",
          area: "Lagos Island",
          city: "Lagos",
          state: "Lagos",
        },
      },
      "idem_test_tracking_01"
    );

    expect(createdRes.order.totalKobo).toBe(40_250_000); // (2*15m + 10m) + 2.5k wrapping
    expect(createdRes.order.items).toHaveLength(2);

    // Track by order ID
    const trackedById = await fetchOrderTracking(createdRes.order.id);
    expect(trackedById.id).toBe(createdRes.order.id);
    expect(trackedById.recipientName).toBe("Bisi Akande");
    expect(trackedById.items).toHaveLength(2);
    expect(trackedById.totalKobo).toBe(40_250_000);

    // Track by tracking token
    if (createdRes.order.trackingToken) {
      const trackedByToken = await fetchOrderTracking(
        createdRes.order.trackingToken
      );
      expect(trackedByToken.id).toBe(createdRes.order.id);
      expect(trackedByToken.totalKobo).toBe(40_250_000);
    }
  });

  it("renders SavedAddressSelector and selects a presaved delivery address", () => {
    useSavedAddressStore.getState().clearAddresses();
    const addr1 = useSavedAddressStore.getState().addAddress({
      label: "Home Lekki",
      recipientName: "David Enabulele",
      recipientPhone: "08031234567",
      street: "14 Admiralty Way",
      area: "Lekki Phase 1",
      city: "Lagos",
      state: "Lagos",
    });

    const addr2 = useSavedAddressStore.getState().addAddress({
      label: "Office VI",
      recipientName: "David Office",
      recipientPhone: "08099887766",
      street: "Plot 5 Victoria Island",
      area: "VI",
      city: "Lagos",
      state: "Lagos",
    });

    const onSelect = vi.fn();
    render(
      <SavedAddressSelector
        selectedAddressId={addr1.id}
        onSelectAddress={onSelect}
      />
    );

    expect(screen.getByText("Presaved Delivery Addresses")).toBeInTheDocument();
    expect(screen.getByText("Home Lekki")).toBeInTheDocument();
    expect(screen.getByText("Office VI")).toBeInTheDocument();
    expect(screen.getByText(/14 Admiralty Way/i)).toBeInTheDocument();
    expect(screen.getByText(/Plot 5 Victoria Island/i)).toBeInTheDocument();

    // Click second address
    const officeCard = screen.getByText("Office VI").closest('[role="button"]');
    expect(officeCard).not.toBeNull();
    officeCard?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: addr2.id }));
  });

  it("renders SaveAddressToggle with toggle state and label input", () => {
    const onToggle = vi.fn();
    const onLabelChange = vi.fn();
    const onSaveNow = vi.fn();

    const { rerender } = render(
      <SaveAddressToggle
        enabled={false}
        onToggle={onToggle}
        label=""
        onLabelChange={onLabelChange}
        onSaveNow={onSaveNow}
        canSaveNow={false}
      />
    );

    expect(
      screen.getByText(/Save this delivery address & contact for next time/i)
    ).toBeInTheDocument();

    // Re-render with enabled=true to show label and save now button
    rerender(
      <SaveAddressToggle
        enabled={true}
        onToggle={onToggle}
        label="Mom's Place"
        onLabelChange={onLabelChange}
        onSaveNow={onSaveNow}
        canSaveNow={true}
      />
    );

    expect(
      screen.getByPlaceholderText(/Give this address a label/i)
    ).toHaveValue("Mom's Place");
    expect(
      screen.getByRole("button", { name: /Save to Address Book/i })
    ).toBeInTheDocument();
  });
});

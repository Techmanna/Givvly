import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { resetMockDatabase } from "@/lib/mocks/router";
import {
  DEFAULT_SHIPPING_ZONES,
  calculateOrderVatAndTotal,
} from "@givvly/contracts";
import { useCartStore } from "@/stores/cart-store";
import { BagCheckoutForm } from "./components/BagCheckoutForm";
import { ShippingZonesView } from "@/features/admin/components/ShippingZonesView";

function createWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

describe("Shipping Zones & 7.5% VAT", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_USE_MOCK_API = "true";
    resetMockDatabase();
  });

  it("computes 7.5% VAT on gifts + VAT portion of shipping matching Naira totals", () => {
    const zoneA = DEFAULT_SHIPPING_ZONES.find((z) => z.code === "ZONE_A")!;
    const result = calculateOrderVatAndTotal({
      subtotalKobo: 11_000_000, // ₦110,000
      shippingFeeKobo: zoneA.priceKobo, // ₦3,763 (incl. VAT)
    });

    expect(result.giftVatKobo).toBe(825_000); // ₦8,250
    expect(Math.round(result.totalVatKobo / 100)).toBe(8513); // ₦8,513
    expect(result.totalKobo).toBe(12_201_300); // ₦122,013
  });

  it("renders shipping zones, delivery charges note, and VAT breakdown in BagCheckoutForm", async () => {
    const store = useCartStore.getState();
    store.clearBag();
    store.addItem(
      {
        id: "prod_test_vat",
        slug: "test-gift",
        name: "Test Gift",
        priceKobo: 11_000_000,
      },
      1,
    );

    render(<BagCheckoutForm />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getAllByText(/ZONE A/i).length).toBeGreaterThan(0);
    });
    expect(screen.getByText(/A note about delivery charges/i)).toBeInTheDocument();
    expect(screen.getByText(/VAT \(7\.5% on gifts\)/i)).toBeInTheDocument();
    expect(screen.getByText(/includes/i)).toBeInTheDocument();
  });

  it("allows admin to view and toggle shipping zones in ShippingZonesView", async () => {
    const user = userEvent.setup();
    render(<ShippingZonesView />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("ZONE A")).toBeInTheDocument();
    });

    const toggle = screen.getByRole("switch", { name: /Toggle ZONE A/i });
    expect(toggle).toHaveAttribute("aria-checked", "true");
    await user.click(toggle);

    await waitFor(() => {
      expect(toggle).toHaveAttribute("aria-checked", "false");
    });
  });
});

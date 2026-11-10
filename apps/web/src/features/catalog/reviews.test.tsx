import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { resetMockDatabase, getMockDatabase } from "@/lib/mocks/router";
import { useAuthStore } from "@/stores/auth-store";
import { ProductReviewsSection } from "./components/ProductReviewsSection";
import type { CatalogProduct } from "./types";

const mockProduct: CatalogProduct = {
  id: "prod_test_01",
  slug: "artisanal-nigerian-cocoa-spice-gift-box-wais",
  name: "Artisanal Nigerian Cocoa & Spice Gift Box",
  description: "Handcrafted Nigerian single-origin dark chocolate.",
  priceKobo: 3750000,
  category: "Gourmet & Treats",
  giftType: "PHYSICAL",
  occasions: ["WEDDING", "BIRTHDAY"],
  relationships: ["FRIEND", "FAMILY"],
  imageUrl: "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=800",
  vendorName: "Lagos Luxe Hampers",
  inStock: true,
  rating: 4.9,
  reviewCount: 3,
  isCombo: true,
  comboItems: [
    { name: "Single-Origin 70% Cocoa Bar", qty: 2, tag: "Handmade" },
    { name: "Spiced Hibiscus Ginger Tea", qty: 1 },
  ],
};

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

describe("ProductReviewsSection", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_USE_MOCK_API = "true";
    resetMockDatabase();
    getMockDatabase().products.push(mockProduct as any);
    useAuthStore.getState().clear();
  });

  it("renders customer reviews and shows login prompt for guest users", async () => {
    render(<ProductReviewsSection product={mockProduct} />, {
      wrapper: createTestWrapper(),
    });


    await waitFor(() => {
      expect(screen.getByText("Customer Reviews")).toBeInTheDocument();
      expect(screen.getByText(/Based on \d+ verified reviews?/i)).toBeInTheDocument();
      expect(screen.getByText("Vanessa O.")).toBeInTheDocument();
      expect(screen.getByText("Chidi N.")).toBeInTheDocument();
      expect(screen.getByText(/Sensational Keepsake Box/i)).toBeInTheDocument();
    });

    // Check login CTA for guest user
    expect(screen.getByRole("link", { name: /Log in to Review/i })).toBeInTheDocument();

    // Check WhatsApp concierge link
    expect(screen.getByText(/Chat with Concierge/i)).toBeInTheDocument();
    expect(screen.getByText(/Nationwide Delivery/i)).toBeInTheDocument();
    expect(screen.getByText(/Guaranteed Protection/i)).toBeInTheDocument();
  });

  it("filters reviews interactively when clicking rating breakdown bars", async () => {
    const user = userEvent.setup();
    render(<ProductReviewsSection product={mockProduct} />, {
      wrapper: createTestWrapper(),
    });


    await waitFor(() => {
      expect(screen.getByText("Vanessa O.")).toBeInTheDocument();
    });

    // Click 4-star bar to filter
    const fourStarBar = screen.getByTitle(/Filter by 4 star reviews/i);
    await user.click(fourStarBar);

    await waitFor(() => {
      expect(screen.getByText("4 Stars Only")).toBeInTheDocument();
      expect(screen.getByText("Amina Bello")).toBeInTheDocument();
      expect(screen.queryByText("Vanessa O.")).not.toBeInTheDocument();
    });

    // Clear filter
    const clearBtn = screen.getByRole("button", { name: /Clear filter/i });
    await user.click(clearBtn);

    await waitFor(() => {
      expect(screen.getByText("Vanessa O.")).toBeInTheDocument();
      expect(screen.getByText("Amina Bello")).toBeInTheDocument();
    });
  });

  it("shows disabled 'Verified Purchasers Only' CTA when logged in user has not purchased product", async () => {
    const unpurchasedUser = {
      id: "usr_unpurchased_1",
      name: "Tunde Bakare",
      email: "tunde.bakare@example.com",
      role: "USER" as const,
      emailVerified: true,
    };
    getMockDatabase().currentUser = unpurchasedUser;
    useAuthStore.getState().setUser(unpurchasedUser);

    render(<ProductReviewsSection product={mockProduct} />, {
      wrapper: createTestWrapper(),
    });


    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /Verified Purchasers Only/i })
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Only customers who purchased this gift can leave a review/i)
      ).toBeInTheDocument();
    });
  });

  it("allows verified purchasers to open form, prefills author name, and submits review", async () => {
    const user = userEvent.setup();
    const userId = "usr_folake_1";
    const purchaserUser = {
      id: userId,
      name: "Folake Adebayo",
      email: "folake@example.com",
      role: "USER" as const,
      emailVerified: true,
    };
    getMockDatabase().currentUser = purchaserUser;
    useAuthStore.getState().setUser(purchaserUser);

    // Inject verified purchase into mock database
    getMockDatabase().orders.push({
      id: "ord_verified_01",
      number: "GIV-2026-9999",
      buyerUserId: userId,
      buyerEmail: "folake@example.com",
      recipientName: "Chidi Okafor",
      status: "CONFIRMED",
      subtotalKobo: 3750000,
      deliveryFeeKobo: 0,
      feeKobo: 0,
      totalKobo: 3750000,
      trackingToken: "trk_test_01",
      items: [
        {
          productId: mockProduct.id,
          title: mockProduct.name,
          quantity: 1,
          priceKobo: 3750000,
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as any);

    render(<ProductReviewsSection product={mockProduct} />, {
      wrapper: createTestWrapper(),
    });


    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Write a Review/i })).toBeInTheDocument();
    });

    const writeButton = screen.getByRole("button", { name: /Write a Review/i });
    await user.click(writeButton);

    await waitFor(() => {
      expect(screen.getByText("Verified Purchaser")).toBeInTheDocument();
      expect(screen.getByDisplayValue("Folake Adebayo")).toBeInTheDocument();
    });

    // Fill headline and details
    const titleInput = screen.getByPlaceholderText(
      /e\.g\. Exquisite presentation for our wedding!/i
    );
    const commentInput = screen.getByPlaceholderText(
      /Tell others about the packaging/i
    );

    await user.type(titleInput, "Unmatched Elegance & Fast Dispatch");
    await user.type(
      commentInput,
      "The cocoa gift box blew my guests away! Authentic Nigerian craft at its finest."
    );

    const submitBtn = screen.getByRole("button", {
      name: /Publish Verified Review/i,
    });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText("Unmatched Elegance & Fast Dispatch")).toBeInTheDocument();
      expect(screen.getByText("Folake Adebayo")).toBeInTheDocument();
      expect(
        screen.getByText(/The cocoa gift box blew my guests away!/i)
      ).toBeInTheDocument();
    });
  });
});


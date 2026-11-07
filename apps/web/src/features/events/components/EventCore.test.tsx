import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeQueryClient } from "@/lib/query-client";
import { PayoutSetupForm } from "./PayoutSetupForm";
import { EventUnlockForm } from "./EventUnlockForm";
import { getIntelligentRegistrySuggestions } from "./CreateEventWizard";
import { MOCK_CATALOG_PRODUCTS } from "@/lib/mocks/data";
import * as eventsApi from "../api";
import { ApiClientError } from "@/lib/api-client";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}));

function renderWithQuery(ui: React.ReactElement) {
  const client = makeQueryClient();
  return render(
    <QueryClientProvider client={client}>{ui}</QueryClientProvider>
  );
}

describe("PayoutSetupForm & EventUnlockForm", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    pushMock.mockReset();
  });

  it("shows masked account number and Money gifts on badge when VERIFIED account exists", async () => {
    vi.spyOn(eventsApi, "fetchBanks").mockResolvedValue([
      { code: "058", name: "Guaranty Trust Bank" },
    ]);
    vi.spyOn(eventsApi, "fetchPayoutAccount").mockResolvedValue({
      id: "pa_1",
      bankCode: "058",
      bankName: "Guaranty Trust Bank",
      accountNumberLast4: "6789",
      accountName: "ADAOBI OKAFOR",
      status: "VERIFIED",
      updatedAt: "2026-10-28T10:00:00Z",
    });

    renderWithQuery(<PayoutSetupForm />);

    await waitFor(() => {
      expect(screen.getByText(/••••••6789/)).toBeInTheDocument();
    });
    expect(screen.getByText(/money gifts on/i)).toBeInTheDocument();
  });

  it("counts attempts on INVALID_ACCESS_CODE in EventUnlockForm and redirects on valid code", async () => {
    const unlockSpy = vi
      .spyOn(eventsApi, "unlockPrivateEvent")
      .mockRejectedValueOnce(
        new ApiClientError({
          status: 403,
          code: "INVALID_ACCESS_CODE",
          message: "Wrong code",
          requestId: "req_1",
        })
      )
      .mockResolvedValueOnce({ unlocked: true });

    const user = userEvent.setup();
    renderWithQuery(<EventUnlockForm slug="ada-wedding" />);

    const input = screen.getByLabelText(/access code/i);
    await user.type(input, "WRONG123");
    await user.click(screen.getByRole("button", { name: /unlock event/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/incorrect access code \(attempt 1\)/i)
      ).toBeInTheDocument();
    });

    await user.clear(input);
    await user.type(input, "CORRECT1");
    await user.click(screen.getByRole("button", { name: /unlock event/i }));

    await waitFor(() => {
      expect(unlockSpy).toHaveBeenCalledWith("ada-wedding", "CORRECT1");
      expect(pushMock).toHaveBeenCalledWith("/e/ada-wedding");
    });
  });

  it("ranks backend catalog products using Event type, Event name, Event date, and Our story", () => {
    const weddingResult = getIntelligentRegistrySuggestions(
      MOCK_CATALOG_PRODUCTS,
      {
        type: "WEDDING",
        name: "Chidi & Amaka's Wedding & New Home",
        date: "2026-12-19",
        story: "We love cooking in our new kitchen and hosting dinner.",
      }
    );

    expect(weddingResult.recommendations.length).toBeGreaterThan(0);
    expect(weddingResult.activeSignals).toEqual(
      expect.arrayContaining([
        "Event: Wedding",
        expect.stringContaining("Festive Season"),
        "Story: Personalized cues active",
      ])
    );
    expect(
      weddingResult.recommendations.some(
        (r) =>
          r.product.occasions.includes("WEDDING") ||
          r.product.giftType === "HOME_KITCHEN"
      )
    ).toBe(true);

    const babyResult = getIntelligentRegistrySuggestions(
      MOCK_CATALOG_PRODUCTS,
      {
        type: "BABY_SHOWER",
        name: "Welcome Baby Onaopemipo Naming Ceremony",
        date: "2026-08-15",
        story: "Preparing the nursery for our newborn bundle of joy.",
      }
    );

    expect(babyResult.recommendations[0]?.product.giftType).toBe("BABY_ITEMS");
    expect(babyResult.recommendations[0]?.matchReason).toMatch(
      /Baby Shower|Baby & Nursery/i
    );
  });
});


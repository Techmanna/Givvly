import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { makeQueryClient } from "@/lib/query-client";
import { resetMockDatabase } from "@/lib/mocks/router";
import {
  GIVE_DRAFT_STORAGE_KEY,
  useGiveDraftStore,
} from "@/stores/give-draft-store";
import {
  GiveMoneyForm,
  getDynamicBlessingChips,
} from "./components/GiveMoneyForm";
import { GiveReceiptView } from "./components/GiveReceiptView";
import { OwnerFeed } from "./components/OwnerFeed";
import { WallOfLove } from "@/features/moderation";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
  }),
  usePathname: () => "/events/evt_wedding_01/gifts",
}));

function renderWithQuery(ui: React.ReactElement) {
  const client = makeQueryClient();
  return render(
    <QueryClientProvider client={client}>{ui}</QueryClientProvider>
  );
}

describe("Step 4: Money gifts, Wall of Love, and Owner Feed", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_USE_MOCK_API = "true";
    vi.restoreAllMocks();
    pushMock.mockReset();
    window.sessionStorage.clear();
    resetMockDatabase();
    useGiveDraftStore.getState().clearGiveDraft("adaobi-and-chidi-2026");
  });

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_USE_MOCK_API;
  });

  it("persists give draft and idempotencyKey in sessionStorage and rotates/clears key", () => {
    const store = useGiveDraftStore.getState();
    store.hydrateForSlug("adaobi-and-chidi-2026");
    const firstKey = useGiveDraftStore.getState().draft.idempotencyKey;
    expect(firstKey.length).toBeGreaterThan(5);

    store.updateDraft({ amountKobo: 2_500_000, name: "Chinedu" });
    const raw = window.sessionStorage.getItem(GIVE_DRAFT_STORAGE_KEY);
    expect(raw).toBeTruthy();

    const rotatedKey = store.rotateIdempotencyKey();
    expect(rotatedKey).not.toBe(firstKey);

    store.clearGiveDraft("adaobi-and-chidi-2026");
    expect(window.sessionStorage.getItem(GIVE_DRAFT_STORAGE_KEY)).toBeNull();
  });

  it("disables money gift form when owner payout is not verified", () => {
    renderWithQuery(
      <GiveMoneyForm
        slug="welcome-baby-okafor"
        eventName="Welcome Baby Okafor Shower"
        ownerFirstName="Adaobi"
        moneyGiftsEnabled={false}
      />
    );

    expect(
      screen.getByText(/money gifts are not enabled for this event yet/i)
    ).toBeInTheDocument();
  });

  it("validates GiveMoneyForm, shows soft profanity warning, and completes payment in mock mode", async () => {
    const user = userEvent.setup();
    renderWithQuery(
      <GiveMoneyForm
        slug="adaobi-and-chidi-2026"
        eventName="Adaobi & Chidi's Forever"
        ownerFirstName="Adaobi"
        moneyGiftsEnabled={true}
      />
    );

    await user.type(screen.getByLabelText(/your name/i), "Tunde");
    await user.type(
      screen.getByLabelText(/email address/i),
      "tunde@example.com"
    );
    await user.type(
      screen.getByLabelText(/message for adaobi/i),
      "Don't be a fool, congrats!"
    );

    expect(
      screen.getByText(/messages flagged by our filter will be held for review/i)
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /send gift/i }));

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith(
        expect.stringMatching(
          /^\/e\/adaobi-and-chidi-2026\/give\/success\?ref=PAY_GIV_/
        )
      );
    });
  });

  it("polls payment status on GiveReceiptView and renders receipt on SUCCESS", async () => {
    renderWithQuery(
      <GiveReceiptView
        slug="adaobi-and-chidi-2026"
        eventName="Adaobi & Chidi's Forever"
        ownerFirstName="Adaobi"
        reference="PAY_GIV_TEST_123"
      />
    );

    await waitFor(() => {
      expect(
        screen.getByText(/thank you for celebrating adaobi!/i)
      ).toBeInTheDocument();
    });

    expect(screen.getByText("PAY_GIV_TEST_123")).toBeInTheDocument();
  });

  it("posts a wish on WallOfLove and holds profane messages as PENDING", async () => {
    const user = userEvent.setup();
    renderWithQuery(
      <WallOfLove slug="adaobi-and-chidi-2026" ownerFirstName="Adaobi" />
    );

    await waitFor(() => {
      expect(screen.getByText(/Chief & Mrs\. Nwosu/)).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText(/your name/i), "Ngozi");
    await user.type(
      screen.getByLabelText(/your message/i),
      "This is a scam message"
    );
    await user.click(screen.getByRole("button", { name: /post message/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/will appear after review/i)
      ).toBeInTheDocument();
    });
  });

  it("renders OwnerFeed and toggles thanked status", async () => {
    const user = userEvent.setup();
    renderWithQuery(<OwnerFeed eventId="evt_wedding_01" />);

    await waitFor(() => {
      expect(screen.getByText(/Kemi Adesanya/)).toBeInTheDocument();
    });

    const markButtons = screen.getAllByRole("button", {
      name: /mark thanked/i,
    });
    expect(markButtons.length).toBeGreaterThan(0);
    await user.click(markButtons[0]!);

    await waitFor(() => {
      expect(
        screen.getAllByRole("button", { name: /^thanked$/i }).length
      ).toBeGreaterThanOrEqual(3);
    });
  });

  it("generates dynamic celebratory blessing chips tailored to event context", () => {
    const weddingChips = getDynamicBlessingChips({
      eventType: "WEDDING",
      eventName: "Adaobi & Chidi's Forever",
      ownerFirstName: "Adaobi",
      eventDate: "2026-12-19",
      eventStory: "From Lagos to our honeymoon getaway!",
    });
    expect(weddingChips.contextLabel).toBe("Wedding");
    expect(weddingChips.chips[0]).toContain("Happy married life, Adaobi!");
    expect(weddingChips.chips[2]).toContain("honeymoon");

    const milestoneBirthdayChips = getDynamicBlessingChips({
      eventType: "BIRTHDAY",
      eventName: "Tunde's 40th Birthday Thanksgiving",
      ownerFirstName: "Tunde",
    });
    expect(milestoneBirthdayChips.contextLabel).toBe("40th Birthday");
    expect(milestoneBirthdayChips.chips[0]).toContain(
      "Happy 40th birthday, Tunde!"
    );
    expect(milestoneBirthdayChips.chips[2]).toContain("give thanks");

    const namingChips = getDynamicBlessingChips({
      eventType: "BABY_SHOWER",
      eventName: "Baby Amara Naming Ceremony",
      ownerFirstName: "Chiamaka",
    });
    expect(namingChips.contextLabel).toBe("Naming & Dedication");
    expect(namingChips.chips[2]).toContain("naming and dedication");
  });
});

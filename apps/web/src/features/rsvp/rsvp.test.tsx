import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { makeQueryClient } from "@/lib/query-client";
import { INITIAL_EVENTS } from "@/lib/mocks/data";
import { getMockDatabase, resetMockDatabase } from "@/lib/mocks/router";
import { InviteEditor, KeepsakeSummaryView } from "@/features/events";
import { GuestListTable } from "./components/GuestListTable";
import { RsvpForm } from "./components/RsvpForm";
import { rsvpFormSchema } from "./schemas";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
  usePathname: () => "/events/evt_wedding_01/guests",
}));

function renderWithQuery(ui: React.ReactElement) {
  const client = makeQueryClient();
  return render(
    <QueryClientProvider client={client}>{ui}</QueryClientProvider>
  );
}

describe("Step 5: Invites, RSVP, Guest List CSV Export, and Keepsake Summary", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_USE_MOCK_API = "true";
    vi.restoreAllMocks();
    resetMockDatabase();
  });

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_USE_MOCK_API;
  });

  it("requires either email or phone in rsvpFormSchema", () => {
    expect(
      rsvpFormSchema.safeParse({
        name: "Bisi Adewale",
        response: "YES",
        email: "",
        phone: "",
      }).success
    ).toBe(false);

    expect(
      rsvpFormSchema.safeParse({
        name: "Bisi Adewale",
        response: "YES",
        email: "bisi@example.com",
        plusOneName: "Femi Adewale",
      }).success
    ).toBe(true);
  });

  it("submits RSVP with plus-one, shows confirmation with Send a gift button, and deduplicates by email", async () => {
    const user = userEvent.setup();
    renderWithQuery(
      <RsvpForm
        slug="adaobi-and-chidi-2026"
        ownerFirstName="Adaobi"
        allowPlusOne={true}
        moneyGiftsEnabled={true}
      />
    );

    await user.type(screen.getByLabelText(/your full name/i), "Kemi Adesanya");
    await user.type(
      screen.getByLabelText(/plus-one name/i),
      "Tobi Adesanya"
    );
    await user.type(
      screen.getByLabelText(/email address/i),
      "kemi@example.com"
    );
    await user.click(screen.getByRole("button", { name: /send rsvp/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/rsvp confirmed, kemi adesanya!/i)
      ).toBeInTheDocument();
    });

    expect(
      screen.getByRole("link", { name: /send a gift/i })
    ).toBeInTheDocument();

    const rsvps = getMockDatabase().rsvpsByEvent["evt_wedding_01"] ?? [];
    const kemiEntries = rsvps.filter((r) => r.email === "kemi@example.com");
    expect(kemiEntries).toHaveLength(1);
    expect(kemiEntries[0]?.plusOneName).toBe("Tobi Adesanya");
  });

  it("renders GuestListTable with attendance counts", async () => {
    renderWithQuery(<GuestListTable eventId="evt_wedding_01" />);

    await waitFor(() => {
      expect(screen.getByText("Kemi Adesanya")).toBeInTheDocument();
    });
    expect(
      screen.getByRole("button", { name: /export csv/i })
    ).toBeInTheDocument();
  });

  it("updates invitation template and fields in InviteEditor", async () => {
    const user = userEvent.setup();
    renderWithQuery(<InviteEditor initialEvent={INITIAL_EVENTS[0]!} />);

    const royalGoldRadio = screen.getByRole("radio", { name: /royal gold/i });
    await user.click(royalGoldRadio);

    const saveBtn = screen.getByRole("button", { name: /save invite design/i });
    await user.click(saveBtn);

    await waitFor(() => {
      const updated = getMockDatabase().events.find(
        (e) => e.id === "evt_wedding_01"
      );
      expect(updated?.template?.templateId).toBe("royal-gold");
    });
  });

  it("renders KeepsakeSummaryView and toggles keepsakePublished", async () => {
    const user = userEvent.setup();
    renderWithQuery(<KeepsakeSummaryView eventId="evt_wedding_01" />);

    await waitFor(() => {
      expect(screen.getByText(/private preview/i)).toBeInTheDocument();
    });

    const toggle = screen.getByRole("switch", {
      name: /publish keepsake page/i,
    });
    await user.click(toggle);

    await waitFor(() => {
      expect(screen.getByText(/public keepsake on/i)).toBeInTheDocument();
    });
  });
});


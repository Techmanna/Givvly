import { beforeEach, describe, expect, it } from "vitest";
import {
  buildPastHostSuggestions,
  readPastHosts,
  savePastHost,
  useEventWizardStore,
  WIZARD_STORAGE_KEY,
} from "@/stores/event-wizard-store";

describe("useEventWizardStore", () => {
  beforeEach(() => {
    window.localStorage.clear();
    useEventWizardStore.getState().clearWizard();
  });

  it("persists draft and step to localStorage key givvly.wizard.v1", () => {
    useEventWizardStore.getState().updateDraft({
      type: "WEDDING",
      name: "Chidi & Amaka",
    });
    useEventWizardStore.getState().setStep(2);

    const raw = window.localStorage.getItem(WIZARD_STORAGE_KEY);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw ?? "{}");
    expect(parsed.version).toBe(1);
    expect(parsed.step).toBe(2);
    expect(parsed.draft.name).toBe("Chidi & Amaka");
  });

  it("discards malformed or mismatched version data in localStorage silently", () => {
    window.localStorage.setItem(
      WIZARD_STORAGE_KEY,
      JSON.stringify({ version: 999, step: 4, draft: { name: "Old" } })
    );

    useEventWizardStore.getState().hydrateFromStorage();
    expect(useEventWizardStore.getState().step).toBe(1);
    expect(useEventWizardStore.getState().draft.name).toBe("");
    expect(window.localStorage.getItem(WIZARD_STORAGE_KEY)).toBeNull();
  });

  it("clears storage on clearWizard", () => {
    useEventWizardStore.getState().updateDraft({ name: "Test Event" });
    expect(window.localStorage.getItem(WIZARD_STORAGE_KEY)).not.toBeNull();

    useEventWizardStore.getState().clearWizard();
    expect(window.localStorage.getItem(WIZARD_STORAGE_KEY)).toBeNull();
    expect(useEventWizardStore.getState().draft.name).toBe("");
  });

  it("saves past hosts in localStorage and builds deduplicated suggestions from past events", () => {
    savePastHost("Chief & Mrs. Nwosu");
    savePastHost("Chidi & Amaka");
    savePastHost("chief & mrs. nwosu"); // case-insensitive duplicate

    const stored = readPastHosts();
    expect(stored).toEqual(["chief & mrs. nwosu", "Chidi & Amaka"]);

    const suggestions = buildPastHostSuggestions(
      [
        {
          id: "evt_1",
          slug: "tunde-40th",
          name: "Tunde's 40th Rooftop Jubilee",
          type: "BIRTHDAY",
          date: "2026-11-29",
          visibility: "PUBLIC",
          status: "PUBLISHED",
          moneyGiftsEnabled: true,
          totalReceivedKobo: 0,
          giftCount: 0,
          rsvpYesCount: 0,
        },
        {
          id: "evt_2",
          slug: "dr-chisom",
          name: "MBBS Induction",
          hostName: "Dr. Chisom Eze",
          type: "GRADUATION",
          date: "2026-12-18",
          visibility: "PUBLIC",
          status: "PUBLISHED",
          moneyGiftsEnabled: true,
          totalReceivedKobo: 0,
          giftCount: 0,
          rsvpYesCount: 0,
        },
      ],
      stored,
      "Adaobi"
    );

    expect(suggestions).toEqual([
      "chief & mrs. nwosu",
      "Chidi & Amaka",
      "Tunde",
      "Dr. Chisom Eze",
    ]);
  });
});


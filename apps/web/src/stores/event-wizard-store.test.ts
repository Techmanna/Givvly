import { beforeEach, describe, expect, it } from "vitest";
import {
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
});


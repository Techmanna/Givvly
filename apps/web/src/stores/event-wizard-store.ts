import { create } from "zustand";
import type {
  EventType,
  EventVisibility,
  WizardRegistryItemInput,
} from "@givvly/contracts";

export const WIZARD_STORAGE_KEY = "givvly.wizard.v1";
const WIZARD_STORAGE_VERSION = 1;

export type WizardStep = 1 | 2 | 3 | 4 | 5;

export type EventWizardDraft = {
  type: EventType;
  name: string;
  date: string;
  coverKey?: string;
  coverUrl?: string;
  story: string;
  visibility: EventVisibility;
  accessCode: string;
  registryItems: WizardRegistryItemInput[];
};

type PersistedWizardPayload = {
  version: number;
  step: WizardStep;
  draft: EventWizardDraft;
};

export function generateAccessCodeSuggestion(length = 8): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    const idx = Math.floor(Math.random() * chars.length);
    result += chars[idx] ?? "A";
  }
  return result;
}

export function createDefaultWizardDraft(): EventWizardDraft {
  return {
    type: "BIRTHDAY",
    name: "",
    date: "",
    coverKey: undefined,
    coverUrl: undefined,
    story: "",
    visibility: "PUBLIC",
    accessCode: generateAccessCodeSuggestion(8),
    registryItems: [],
  };
}

function readWizardStorage(): { step: WizardStep; draft: EventWizardDraft } {
  const fallback = {
    step: 1 as WizardStep,
    draft: createDefaultWizardDraft(),
  };

  if (typeof window === "undefined") {
    return fallback;
  }

  try {
    const raw = window.localStorage.getItem(WIZARD_STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<PersistedWizardPayload> | null;
    if (
      !parsed ||
      parsed.version !== WIZARD_STORAGE_VERSION ||
      typeof parsed.step !== "number" ||
      parsed.step < 1 ||
      parsed.step > 5 ||
      !parsed.draft ||
      typeof parsed.draft !== "object"
    ) {
      window.localStorage.removeItem(WIZARD_STORAGE_KEY);
      return fallback;
    }

    return {
      step: parsed.step as WizardStep,
      draft: {
        ...createDefaultWizardDraft(),
        ...parsed.draft,
        registryItems: Array.isArray(parsed.draft.registryItems)
          ? parsed.draft.registryItems
          : [],
      },
    };
  } catch {
    try {
      window.localStorage.removeItem(WIZARD_STORAGE_KEY);
    } catch {
      // Ignore storage errors
    }
    return fallback;
  }
}

function writeWizardStorage(step: WizardStep, draft: EventWizardDraft): void {
  if (typeof window === "undefined") return;
  try {
    const payload: PersistedWizardPayload = {
      version: WIZARD_STORAGE_VERSION,
      step,
      draft,
    };
    window.localStorage.setItem(WIZARD_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore storage quota/access errors
  }
}

export type EventWizardState = {
  step: WizardStep;
  draft: EventWizardDraft;
  setStep: (step: WizardStep) => void;
  updateDraft: (patch: Partial<EventWizardDraft>) => void;
  addRegistryItem: (item: WizardRegistryItemInput) => void;
  removeRegistryItem: (id: string) => void;
  hydrateFromStorage: () => void;
  clearWizard: () => void;
};

export const useEventWizardStore = create<EventWizardState>((set, get) => ({
  step: 1,
  draft: createDefaultWizardDraft(),
  setStep: (step) => {
    const currentDraft = get().draft;
    writeWizardStorage(step, currentDraft);
    set({ step });
  },
  updateDraft: (patch) => {
    const nextDraft = { ...get().draft, ...patch };
    const currentStep = get().step;
    writeWizardStorage(currentStep, nextDraft);
    set({ draft: nextDraft });
  },
  addRegistryItem: (item) => {
    const current = get().draft.registryItems;
    if (current.length >= 50) return;
    const nextDraft = {
      ...get().draft,
      registryItems: [...current, item],
    };
    writeWizardStorage(get().step, nextDraft);
    set({ draft: nextDraft });
  },
  removeRegistryItem: (id) => {
    const nextDraft = {
      ...get().draft,
      registryItems: get().draft.registryItems.filter((item) => item.id !== id),
    };
    writeWizardStorage(get().step, nextDraft);
    set({ draft: nextDraft });
  },
  hydrateFromStorage: () => {
    const loaded = readWizardStorage();
    set({ step: loaded.step, draft: loaded.draft });
  },
  clearWizard: () => {
    if (typeof window !== "undefined") {
      try {
        window.localStorage.removeItem(WIZARD_STORAGE_KEY);
      } catch {
        // Ignore storage errors
      }
    }
    set({ step: 1, draft: createDefaultWizardDraft() });
  },
}));


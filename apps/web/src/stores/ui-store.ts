import { create } from "zustand";

export type ThemeMode = "light" | "dark" | "system";

const THEME_STORAGE_KEY = "givvly.theme";

function readInitialTheme(): ThemeMode {
  if (typeof window === "undefined") return "system";
  try {
    const raw = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (raw === "light" || raw === "dark" || raw === "system") {
      return raw;
    }
    return "system";
  } catch {
    return "system";
  }
}

function writeTheme(theme: ThemeMode): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Ignore storage write errors (Section 12)
  }
}

export type UiState = {
  mobileNavOpen: boolean;
  openDialogs: Record<string, boolean>;
  theme: ThemeMode;
  setMobileNavOpen: (open: boolean) => void;
  setDialogOpen: (dialogId: string, open: boolean) => void;
  setTheme: (theme: ThemeMode) => void;
};

export const useUiStore = create<UiState>((set) => ({
  mobileNavOpen: false,
  openDialogs: {},
  theme: readInitialTheme(),
  setMobileNavOpen: (open) => set({ mobileNavOpen: open }),
  setDialogOpen: (dialogId, open) =>
    set((state) => ({
      openDialogs: { ...state.openDialogs, [dialogId]: open },
    })),
  setTheme: (theme) => {
    writeTheme(theme);
    set({ theme });
  },
}));


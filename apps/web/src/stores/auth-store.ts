import { create } from "zustand";
import type { User } from "@givvly/contracts";

export type AuthStatus = "loading" | "authed" | "guest";

export type AuthState = {
  user: User | null;
  status: AuthStatus;
  setUser: (user: User) => void;
  clear: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  status: "loading",
  setUser: (user) => set({ user, status: "authed" }),
  clear: () => set({ user: null, status: "guest" }),
}));


import { beforeEach, describe, expect, it } from "vitest";
import { useAuthStore } from "@/stores/auth-store";
import { authKeys } from "@/features/auth/keys";

describe("useAuthStore", () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, status: "loading" });
  });

  it("starts in loading state and transitions to authed and guest", () => {
    expect(useAuthStore.getState().status).toBe("loading");

    useAuthStore.getState().setUser({
      id: "usr_1",
      name: "Chidi",
      email: "chidi@givvly.store",
      role: "USER",
      emailVerified: true,
    });

    expect(useAuthStore.getState().status).toBe("authed");
    expect(useAuthStore.getState().user?.email).toBe("chidi@givvly.store");

    useAuthStore.getState().clear();
    expect(useAuthStore.getState().status).toBe("guest");
    expect(useAuthStore.getState().user).toBeNull();
  });
});

describe("authKeys", () => {
  it("builds deterministic query keys", () => {
    expect(authKeys.all).toEqual(["auth"]);
    expect(authKeys.me()).toEqual(["auth", "me"]);
    expect(authKeys.googleUrl("/events/new")).toEqual([
      "auth",
      "googleUrl",
      "/events/new",
    ]);
  });
});


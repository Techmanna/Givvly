import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

vi.mock("next/font/google", () => ({
  Fraunces: () => ({
    variable: "--font-fraunces",
    className: "font-fraunces",
  }),
  DM_Sans: () => ({
    variable: "--font-dm-sans",
    className: "font-dm-sans",
  }),
}));

if (typeof globalThis.ResizeObserver === "undefined") {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

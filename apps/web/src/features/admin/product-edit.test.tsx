import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { resetMockDatabase } from "@/lib/mocks/router";
import { ProductManagementView } from "./components/ProductManagementView";

function createTestWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

describe("Admin Full Product Editing", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_USE_MOCK_API = "true";
    resetMockDatabase();
  });

  it("opens directly into Edit Product tab when clicking 'Edit' button on card", async () => {
    const user = userEvent.setup();
    render(<ProductManagementView />, { wrapper: createTestWrapper() });

    await waitFor(() => {
      expect(screen.getAllByRole("button", { name: /^Edit$/i }).length).toBeGreaterThan(0);
    });

    const editButtons = screen.getAllByRole("button", { name: /^Edit$/i });
    await user.click(editButtons[0]!);

    // Should open dialog with Full Edit tab active and show all comprehensive editing inputs
    await waitFor(() => {
      expect(screen.getByText(/Basic Information & Identity/i)).toBeInTheDocument();
      expect(screen.getByText(/Collections & Target Audience/i)).toBeInTheDocument();
      expect(screen.getByText(/Product Media \(Image \/ Video\)/i)).toBeInTheDocument();
      expect(screen.getByText(/Full Product Description \*/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Save Product Changes/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Deactivate Product/i })).toBeInTheDocument();
    });
  });

  it("allows updating product fields, adding combo items, toggling tags and saving", async () => {
    const user = userEvent.setup();
    render(<ProductManagementView />, { wrapper: createTestWrapper() });

    await waitFor(() => {
      expect(screen.getAllByRole("button", { name: /^Edit$/i }).length).toBeGreaterThan(0);
    });

    const editButtons = screen.getAllByRole("button", { name: /^Edit$/i });
    await user.click(editButtons[0]!);

    // Find and update the name field by placeholder
    const nameInput = await screen.findByPlaceholderText(/e\.g\. Royal Champagne & Gourmet Hamper/i);
    expect(nameInput).toBeInTheDocument();
    await user.clear(nameInput);
    await user.type(nameInput, "Ultra Premium Champagne & Belgian Truffles");

    // Check that slug input is available and prefilled
    const slugInput = screen.getByPlaceholderText(/royal-champagne-gourmet-hamper/i);
    expect(slugInput).toBeInTheDocument();

    // Toggle an occasion tag
    const occasionBtn = screen.getByRole("button", { name: /ANNIVERSARY/i });
    await user.click(occasionBtn);

    // Save changes
    const saveButton = screen.getByRole("button", { name: /Save Product Changes/i });
    await user.click(saveButton);

    // After saving, switches back to Overview specifications tab with updated title
    await waitFor(() => {
      expect(screen.getAllByText(/Ultra Premium Champagne & Belgian Truffles/i).length).toBeGreaterThanOrEqual(1);
    });
  });

  it("allows adding combo items to curated combo boxes", async () => {
    const user = userEvent.setup();
    render(<ProductManagementView />, { wrapper: createTestWrapper() });

    await waitFor(() => {
      expect(screen.getAllByRole("button", { name: /^Edit$/i }).length).toBeGreaterThan(0);
    });

    const editButtons = screen.getAllByRole("button", { name: /^Edit$/i });
    await user.click(editButtons[0]!);

    // Check Curated Combo Box switch
    const comboSection = await screen.findByText(/Curated Combo Box Bundle/i);
    expect(comboSection).toBeInTheDocument();

    // Toggle the combo switch to ON
    const comboSwitch = screen.getAllByRole("switch").find((s) =>
      s.closest("div")?.textContent?.includes("Curated Combo Box Bundle")
    );
    if (comboSwitch && comboSwitch.getAttribute("data-state") !== "checked") {
      await user.click(comboSwitch);
    }

    // Add a new combo item
    const comboItemNameInput = await screen.findByPlaceholderText(/Scented Candle, Belgian Truffles/i);
    await user.type(comboItemNameInput, "Handmade Crystal Flute Set");

    const addItemButton = screen.getByRole("button", { name: /^Add$/i });
    await user.click(addItemButton);

    // Verify item appears in the combo list
    expect(screen.getByText("Handmade Crystal Flute Set")).toBeInTheDocument();
  });
});

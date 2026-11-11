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

describe("Admin Products Listing - Bulk Actions & Deletion", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_USE_MOCK_API = "true";
    resetMockDatabase();
  });

  it("renders checkboxes on product cards and allows selecting individual products", async () => {
    const user = userEvent.setup();
    render(<ProductManagementView />, { wrapper: createTestWrapper() });

    await waitFor(() => {
      expect(screen.getAllByTestId("product-select-checkbox").length).toBeGreaterThan(0);
    });

    // Bulk action bar should not be visible initially
    expect(screen.queryByRole("region", { name: /bulk actions bar/i })).not.toBeInTheDocument();

    const checkboxes = screen.getAllByTestId("product-select-checkbox");
    // Select first product
    await user.click(checkboxes[0]!);

    // Bulk action bar should now appear with "1 selected"
    await waitFor(() => {
      expect(screen.getByRole("region", { name: /bulk actions bar/i })).toBeInTheDocument();
      expect(screen.getByText("1 selected")).toBeInTheDocument();
    });

    // Select second product
    await user.click(checkboxes[1]!);
    expect(screen.getByText("2 selected")).toBeInTheDocument();

    // Deselect first product
    await user.click(checkboxes[0]!);
    expect(screen.getByText("1 selected")).toBeInTheDocument();

    // Deselect second product -> bar closes
    await user.click(checkboxes[1]!);
    expect(screen.queryByRole("region", { name: /bulk actions bar/i })).not.toBeInTheDocument();
  });

  it("allows selecting all products on the current page and clearing selection", async () => {
    const user = userEvent.setup();
    render(<ProductManagementView />, { wrapper: createTestWrapper() });

    await waitFor(() => {
      expect(screen.getByTestId("select-all-page-checkbox")).toBeInTheDocument();
    });

    const selectAllCheckbox = screen.getByTestId("select-all-page-checkbox");
    await user.click(selectAllCheckbox);

    // Should have selected all items on page
    const cardCheckboxes = screen.getAllByTestId("product-select-checkbox");
    await waitFor(() => {
      expect(screen.getByText(new RegExp(`${cardCheckboxes.length} selected`, "i"))).toBeInTheDocument();
    });

    // Click "Clear selection"
    const clearButtons = screen.getAllByRole("button", { name: /clear selection/i });
    await user.click(clearButtons[0]!);

    expect(screen.queryByRole("region", { name: /bulk actions bar/i })).not.toBeInTheDocument();
  });

  it("bulk updates product stock (Mark In Stock and Mark Out of Stock)", async () => {
    const user = userEvent.setup();
    render(<ProductManagementView />, { wrapper: createTestWrapper() });

    await waitFor(() => {
      expect(screen.getAllByTestId("product-select-checkbox").length).toBeGreaterThan(0);
    });

    const checkboxes = screen.getAllByTestId("product-select-checkbox");
    await user.click(checkboxes[0]!);
    await user.click(checkboxes[1]!);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /mark in stock/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /mark out of stock/i })).toBeInTheDocument();
    });

    // Click Mark Out of Stock
    const outOfStockBtn = screen.getByRole("button", { name: /mark out of stock/i });
    await user.click(outOfStockBtn);

    // Wait for mutation to complete
    await waitFor(() => {
      expect(screen.getByText("2 selected")).toBeInTheDocument();
    });

    // Click Mark In Stock
    const inStockBtn = screen.getByRole("button", { name: /mark in stock/i });
    await user.click(inStockBtn);

    await waitFor(() => {
      expect(screen.getByText("2 selected")).toBeInTheDocument();
    });
  });

  it("opens ConfirmDialog on 'Delete Selected' and executes bulk delete upon confirmation", async () => {
    const user = userEvent.setup();
    render(<ProductManagementView />, { wrapper: createTestWrapper() });

    await waitFor(() => {
      expect(screen.getAllByTestId("product-select-checkbox").length).toBeGreaterThan(0);
    });

    const checkboxes = screen.getAllByTestId("product-select-checkbox");
    const firstCheckbox = checkboxes[0]!;
    const secondCheckbox = checkboxes[1]!;

    await user.click(firstCheckbox);
    await user.click(secondCheckbox);

    const deleteBtn = screen.getByRole("button", { name: /delete selected/i });
    await user.click(deleteBtn);

    // Confirm dialog should open with title & description
    await waitFor(() => {
      expect(screen.getByText(/Delete 2 Products\?/i)).toBeInTheDocument();
      expect(screen.getByText(/Are you sure you want to delete 2 selected products\?/i)).toBeInTheDocument();
    });

    // Click confirmation button in dialog
    const confirmDeleteBtn = screen.getByRole("button", { name: /^Delete 2 Products$/i });
    await user.click(confirmDeleteBtn);

    // Selection should be cleared and modal closed
    await waitFor(() => {
      expect(screen.queryByRole("region", { name: /bulk actions bar/i })).not.toBeInTheDocument();
      expect(screen.queryByText(/Delete 2 Products\?/i)).not.toBeInTheDocument();
    });
  });
});

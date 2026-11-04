import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { resetMockDatabase } from "@/lib/mocks/router";
import { ProductManagementView } from "./components/ProductManagementView";
import { OrderManagementView } from "./components/OrderManagementView";
import { UserManagementView } from "./components/UserManagementView";
import { DataTable, type DataTableColumn } from "./components/DataTable";

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

describe("Admin Pagination Integration", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_USE_MOCK_API = "true";
    resetMockDatabase();
  });

  it("renders ProductManagementView with pagination controls", async () => {
    render(<ProductManagementView />, { wrapper: createTestWrapper() });

    // Should display products and pagination summary
    expect(await screen.findByText(/Gift Products & Curated Combos/i)).toBeInTheDocument();
    expect(await screen.findByText(/Showing/i)).toBeInTheDocument();
  });

  it("renders OrderManagementView with pagination controls", async () => {
    render(<OrderManagementView />, { wrapper: createTestWrapper() });

    expect(await screen.findByText(/Order Fulfillment & Logistics Pipeline/i)).toBeInTheDocument();
    expect(await screen.findByText(/Showing/i)).toBeInTheDocument();
  });

  it("renders UserManagementView with pagination controls", async () => {
    render(<UserManagementView />, { wrapper: createTestWrapper() });

    expect(await screen.findByText(/User Accounts & Host Management/i)).toBeInTheDocument();
    expect(await screen.findByText(/Showing/i)).toBeInTheDocument();
  });

  it("paginates DataTable rows when exceeding page size", async () => {
    const user = userEvent.setup();
    type Item = { id: string; name: string };
    const items: Item[] = Array.from({ length: 25 }, (_, i) => ({
      id: `item_${i + 1}`,
      name: `Record ${i + 1}`,
    }));

    const columns: DataTableColumn<Item>[] = [
      { header: "Name", render: (r) => <span>{r.name}</span> },
    ];

    render(
      <DataTable
        data={items}
        columns={columns}
        getRowKey={(r) => r.id}
        pageSize={10}
        itemName="records"
      />
    );

    // Page 1 should show Record 1 and Record 10, but not Record 11
    expect(screen.getByText("Record 1")).toBeInTheDocument();
    expect(screen.getByText("Record 10")).toBeInTheDocument();
    expect(screen.queryByText("Record 11")).not.toBeInTheDocument();
    expect(screen.getByText(/Showing/i)).toHaveTextContent(/Showing 1–10 of 25 records/i);

    // Click Next button
    const nextBtn = screen.getByRole("button", { name: /Next/i });
    await user.click(nextBtn);

    // Page 2 should show Record 11 and Record 20
    expect(screen.queryByText("Record 10")).not.toBeInTheDocument();
    expect(screen.getByText("Record 11")).toBeInTheDocument();
    expect(screen.getByText("Record 20")).toBeInTheDocument();
    expect(screen.getByText(/Showing/i)).toHaveTextContent(/Showing 11–20 of 25 records/i);
  });
});

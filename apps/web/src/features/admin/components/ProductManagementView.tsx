"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/EmptyState";
import { PaginationBar } from "@/components/shared/PaginationBar";
import { matchesProductCategory } from "@/features/catalog";
import {
  useAdminOrders,
  useAdminProducts,
  useUpdateAdminProduct,
  useBulkDeleteAdminProducts,
  useBulkUpdateAdminProductStock,
} from "../hooks/useAdmin";
import type { AdminProduct } from "../types";
import {
  AddProductDialog,
  ProductFiltersBar,
  ProductCardItem,
  ProductDetailModal,
  BulkActionBar,
} from "./products";

export function ProductManagementView() {
  const productsQuery = useAdminProducts();
  const ordersQuery = useAdminOrders();
  const updateProductMutation = useUpdateAdminProduct();
  const bulkDeleteMutation = useBulkDeleteAdminProducts();
  const bulkUpdateStockMutation = useBulkUpdateAdminProductStock();

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [combosOnly, setCombosOnly] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<AdminProduct | null>(null);
  const [page, setPage] = useState(1);
  const [dialogTab, setDialogTab] = useState<"overview" | "activity" | "edit">("overview");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const PAGE_SIZE = 12;

  const products = productsQuery.data ?? [];
  const allOrders = ordersQuery.data ?? [];

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = matchesProductCategory(p, selectedCategory);
    const matchesCombo = !combosOnly || p.isCombo;
    return matchesSearch && matchesCategory && matchesCombo;
  });

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const pageIds = paginatedProducts.map((p) => p.id);
  const isAllOnPageSelected =
    pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id));
  const isSomeOnPageSelected =
    pageIds.some((id) => selectedIds.has(id)) && !isAllOnPageSelected;

  const handleSearchChange = (val: string) => {
    setSearch(val);
    setPage(1);
  };

  const handleCategoryChange = (cat: string) => {
    setSelectedCategory(cat);
    setPage(1);
  };

  const handleCombosToggle = (checked: boolean) => {
    setCombosOnly(checked);
    setPage(1);
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleToggleSelectAllOnPage = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (isAllOnPageSelected) {
        pageIds.forEach((id) => next.delete(id));
      } else {
        pageIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const handleClearSelection = () => {
    setSelectedIds(new Set());
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    try {
      const res = await bulkDeleteMutation.mutateAsync({ ids });
      const count = res.count ?? ids.length;
      toast.success(
        `Successfully deleted ${count} ${count === 1 ? "product" : "products"}`
      );
      setSelectedIds(new Set());
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to bulk delete products"
      );
      throw err;
    }
  };

  const handleBulkUpdateStock = async (inStock: boolean) => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    try {
      const res = await bulkUpdateStockMutation.mutateAsync({ ids, inStock });
      const count = res.count ?? ids.length;
      toast.success(
        `Marked ${count} ${count === 1 ? "product" : "products"} ${
          inStock ? "in stock" : "out of stock"
        }`
      );
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update product stock"
      );
      throw err;
    }
  };

  const handleToggleStock = async (id: string, currentStock: boolean) => {
    try {
      await updateProductMutation.mutateAsync({
        productId: id,
        patch: { inStock: !currentStock },
      });
      toast.success(
        !currentStock ? "Product marked in stock" : "Product marked out of stock"
      );
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update product stock"
      );
    }
  };

  const handleSelectProduct = (
    product: AdminProduct,
    tab: "overview" | "activity" | "edit" = "overview"
  ) => {
    setSelectedProduct(product);
    setDialogTab(tab);
  };

  return (
    <div className="space-y-6">
      {/* Header with Title and Add Product Dialog */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="font-heading text-xl font-bold text-foreground">
            Gift Products & Curated Combos
          </h2>
          <p className="text-xs text-muted-foreground">
            Manage single gifts and pre-assembled gift combo boxes available across all celebrations.
          </p>
        </div>

        <AddProductDialog />
      </div>

      {/* Filter and Search Bar */}
      <ProductFiltersBar
        search={search}
        onSearchChange={handleSearchChange}
        combosOnly={combosOnly}
        onCombosToggle={handleCombosToggle}
        selectedCategory={selectedCategory}
        onCategoryChange={handleCategoryChange}
      />

      {/* Products Grid */}
      {productsQuery.isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
      ) : productsQuery.isError ? (
        <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-xs text-destructive">
          Failed to load catalog products. Please retry.
        </div>
      ) : filteredProducts.length === 0 ? (
        <EmptyState
          title="No products found"
          description="Try clearing search filters or add a new gift product to the catalog."
        />
      ) : (
        <div className="space-y-4">
          {/* Page Selection Bar */}
          <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-xs">
            <div className="flex items-center gap-2">
              <Checkbox
                id="select-all-page"
                data-testid="select-all-page-checkbox"
                checked={
                  isAllOnPageSelected
                    ? true
                    : isSomeOnPageSelected
                      ? "indeterminate"
                      : false
                }
                onCheckedChange={handleToggleSelectAllOnPage}
                aria-label="Select all products on current page"
              />
              <label
                htmlFor="select-all-page"
                className="cursor-pointer font-medium text-muted-foreground select-none hover:text-foreground"
              >
                {selectedIds.size > 0
                  ? `${selectedIds.size} of ${filteredProducts.length} selected`
                  : `Select all on page (${paginatedProducts.length})`}
              </label>
            </div>

            {selectedIds.size > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClearSelection}
                className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
              >
                Clear selection
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {paginatedProducts.map((product) => (
              <ProductCardItem
                key={product.id}
                product={product}
                onSelect={handleSelectProduct}
                onToggleStock={handleToggleStock}
                isStockPending={updateProductMutation.isPending}
                isSelected={selectedIds.has(product.id)}
                onToggleSelect={handleToggleSelect}
              />
            ))}
          </div>

          <PaginationBar
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredProducts.length}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
            itemName="gifts"
          />
        </div>
      )}

      {/* Floating Bulk Actions Bar */}
      <BulkActionBar
        selectedCount={selectedIds.size}
        totalOnPage={paginatedProducts.length}
        isAllOnPageSelected={isAllOnPageSelected}
        onSelectAllOnPage={handleToggleSelectAllOnPage}
        onClearSelection={handleClearSelection}
        onBulkDelete={handleBulkDelete}
        onBulkUpdateStock={handleBulkUpdateStock}
        isDeleting={bulkDeleteMutation.isPending}
        isUpdatingStock={bulkUpdateStockMutation.isPending}
      />

      {/* Product Detail, Activities & Quick Edit Modal */}
      <ProductDetailModal
        product={selectedProduct}
        open={Boolean(selectedProduct)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedProduct(null);
            setDialogTab("overview");
          }
        }}
        activeTab={dialogTab}
        onTabChange={setDialogTab}
        onProductUpdated={(updated) => setSelectedProduct(updated)}
        onProductDeleted={() => setSelectedProduct(null)}
        orders={allOrders}
      />
    </div>
  );
}

"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { PaginationBar } from "@/components/shared/PaginationBar";
import { matchesProductCategory } from "@/features/catalog";
import {
  useAdminOrders,
  useAdminProducts,
  useUpdateAdminProduct,
} from "../hooks/useAdmin";
import type { AdminProduct } from "../types";
import {
  AddProductDialog,
  ProductFiltersBar,
  ProductCardItem,
  ProductDetailModal,
} from "./products";

export function ProductManagementView() {
  const productsQuery = useAdminProducts();
  const ordersQuery = useAdminOrders();
  const updateProductMutation = useUpdateAdminProduct();

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [combosOnly, setCombosOnly] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<AdminProduct | null>(null);
  const [page, setPage] = useState(1);
  const [dialogTab, setDialogTab] = useState<"overview" | "activity" | "edit">("overview");

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
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {paginatedProducts.map((product) => (
              <ProductCardItem
                key={product.id}
                product={product}
                onSelect={handleSelectProduct}
                onToggleStock={handleToggleStock}
                isStockPending={updateProductMutation.isPending}
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

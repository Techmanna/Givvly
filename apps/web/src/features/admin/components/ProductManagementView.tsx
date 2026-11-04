"use client";

import { useState } from "react";
import {
  Plus,
  Search,
  Layers,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Money } from "@/components/shared/Money";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { PaginationBar } from "@/components/shared/PaginationBar";
import {
  useAdminProducts,
  useCreateAdminProduct,
  useUpdateAdminProduct,
} from "../hooks/useAdmin";
import type { CreateProductInput } from "../types";

const CATEGORIES = [
  "ALL",
  "Wedding Gifts",
  "Birthday Gifts",
  "Corporate Gifts",
  "Gift for Him",
  "Gift for Her",
  "Luxury",
  "Flowers",
  "Chocolates & Hampers",
  "Customized Gifts",
];

export function ProductManagementView() {
  const productsQuery = useAdminProducts();
  const createProductMutation = useCreateAdminProduct();
  const updateProductMutation = useUpdateAdminProduct();

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [combosOnly, setCombosOnly] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [page, setPage] = useState(1);

  const PAGE_SIZE = 12;

  // Add Product form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    priceNaira: "",
    category: "Wedding Gifts",
    imageUrl: "/images/gifts/box-luxury.jpg",
    inStock: true,
    isCombo: false,
    comboItems: "",
  });

  const products = productsQuery.data ?? [];

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory =
      selectedCategory === "ALL" || p.category === selectedCategory;
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

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const priceNum = parseFloat(formData.priceNaira);
    if (isNaN(priceNum) || priceNum <= 0) {
      toast.error("Please enter a valid price in Naira");
      return;
    }

    if (!formData.name.trim()) {
      toast.error("Product name is required");
      return;
    }

    try {
      const input: CreateProductInput = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        priceKobo: Math.round(priceNum * 100),
        category: formData.category,
        occasions: [formData.category],
        imageUrl: formData.imageUrl.trim() || "/images/gifts/box-luxury.jpg",
        inStock: formData.inStock,
        isCombo: formData.isCombo,
        comboItems: formData.isCombo
          ? formData.comboItems
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
              .map((name) => ({ name, qty: 1 }))
          : undefined,
      };

      await createProductMutation.mutateAsync(input);
      toast.success("Product added to catalog successfully");
      setIsAddOpen(false);
      setFormData({
        name: "",
        description: "",
        priceNaira: "",
        category: "Wedding Gifts",
        imageUrl: "/images/gifts/box-luxury.jpg",
        inStock: true,
        isCombo: false,
        comboItems: "",
      });
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to add product"
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Title and Add Product Button */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="font-heading text-xl font-bold text-foreground">
            Gift Products & Curated Combos
          </h2>
          <p className="text-xs text-muted-foreground">
            Manage single gifts and pre-assembled gift combo boxes available across all celebrations.
          </p>
        </div>

        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button className="shadow-sm">
              <Plus className="mr-1.5 h-4 w-4" />
              <span>Add New Product</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle className="font-heading text-lg">
                Add Catalog Gift Item / Combo
              </DialogTitle>
              <DialogDescription className="text-xs">
                Create a single item or curated combo box for celebration registries.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleCreateProduct} className="space-y-4 pt-2">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">
                  Product Name *
                </label>
                <Input
                  required
                  placeholder="e.g. Royal Champagne & Gourmet Hamper"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">
                  Description
                </label>
                <Input
                  placeholder="e.g. Moët & Chandon Imperial, assorted Belgian truffles"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">
                    Price in Naira (₦) *
                  </label>
                  <Input
                    required
                    type="number"
                    min="100"
                    placeholder="45000"
                    value={formData.priceNaira}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        priceNaira: e.target.value,
                      }))
                    }
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">
                    Category
                  </label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={formData.category}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        category: e.target.value,
                      }))
                    }
                  >
                    {CATEGORIES.filter((c) => c !== "ALL").map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">
                  Image URL / Asset Path
                </label>
                <Input
                  placeholder="/images/gifts/box-luxury.jpg"
                  value={formData.imageUrl}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      imageUrl: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="rounded-xl border border-border/80 bg-muted/30 p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-xs font-semibold text-foreground">
                      Curated Combo Box?
                    </span>
                    <p className="text-[11px] text-muted-foreground">
                      Enable if this gift contains multiple bundled items.
                    </p>
                  </div>
                  <Switch
                    checked={formData.isCombo}
                    onCheckedChange={(val) =>
                      setFormData((prev) => ({ ...prev, isCombo: val }))
                    }
                  />
                </div>

                {formData.isCombo && (
                  <div className="space-y-1 pt-1">
                    <label className="text-xs font-semibold text-foreground">
                      Combo Items (comma-separated)
                    </label>
                    <Input
                      placeholder="Vintage Wine, Chocolates, Scented Candle"
                      value={formData.comboItems}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          comboItems: e.target.value,
                        }))
                      }
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-xs font-semibold text-foreground">
                  In Stock Immediately?
                </span>
                <Switch
                  checked={formData.inStock}
                  onCheckedChange={(val) =>
                    setFormData((prev) => ({ ...prev, inStock: val }))
                  }
                />
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createProductMutation.isPending}
                >
                  {createProductMutation.isPending ? "Creating..." : "Save Product"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filter and Search Bar */}
      <div className="space-y-3 rounded-xl border border-border bg-card p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search product name, items or description..."
              className="pl-9 text-xs"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-4">
            <label className="inline-flex items-center gap-2 text-xs font-medium text-foreground cursor-pointer">
              <Switch
                checked={combosOnly}
                onCheckedChange={handleCombosToggle}
              />
              <span>Predefined Combos Only</span>
            </label>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap gap-1.5 pt-1 border-t border-border/40">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => handleCategoryChange(cat)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                selectedCategory === cat
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

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
              <Card
                key={product.id}
                className={`overflow-hidden border transition-all duration-200 hover:shadow-soft ${
                  product.inStock
                    ? "border-border/80 bg-card"
                    : "border-border/40 bg-muted/20 opacity-80"
                }`}
              >
              <div className="flex h-full flex-col justify-between p-4">
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      {product.isCombo ? (
                        <Badge
                          variant="secondary"
                          className="bg-accent/20 text-accent-foreground text-[10px] font-semibold gap-1"
                        >
                          <Layers className="h-3 w-3" />
                          <span>Curated Combo</span>
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="text-[10px] text-muted-foreground"
                        >
                          {product.category}
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-muted-foreground">
                        {product.inStock ? "In Stock" : "Out of Stock"}
                      </span>
                      <Switch
                        checked={product.inStock}
                        onCheckedChange={() =>
                          handleToggleStock(product.id, product.inStock)
                        }
                        disabled={updateProductMutation.isPending}
                        aria-label={`Toggle stock for ${product.name}`}
                      />
                    </div>
                  </div>

                  <h3 className="font-heading text-base font-bold text-foreground line-clamp-1">
                    {product.name}
                  </h3>

                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {product.description}
                  </p>

                  {product.isCombo && product.comboItems && product.comboItems.length > 0 && (
                    <div className="rounded-lg bg-muted/40 p-2 text-[11px] text-foreground space-y-1">
                      <p className="font-semibold text-muted-foreground uppercase text-[9px] tracking-wider">
                        Box Includes ({product.comboItems.length} items):
                      </p>
                      <p className="line-clamp-2 text-xs">
                        {product.comboItems
                          .map((c) => `${c.qty}x ${c.name}`)
                          .join(" • ")}
                      </p>
                    </div>
                  )}
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-border/50 pt-3">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Catalog Price
                    </span>
                    <p className="font-heading text-base font-bold text-primary">
                      <Money amountKobo={product.priceKobo} />
                    </p>
                  </div>

                  <span className="text-[10px] font-mono text-muted-foreground">
                    ID: {product.id.slice(-6)}
                  </span>
                </div>
              </div>
            </Card>
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
    </div>
  );
}

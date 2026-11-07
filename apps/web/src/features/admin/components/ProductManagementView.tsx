"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  Layers,
  Eye,
  ExternalLink,
  Package,
  ShoppingCart,
  Star,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { PaginationBar } from "@/components/shared/PaginationBar";
import { FileDropzone } from "@/components/shared/FileDropzone";
import { formatDate } from "@/lib/format";
import { isVideoMediaUrl, uploadMediaFile } from "@/features/events/api";
import {
  useAdminOrders,
  useAdminProducts,
  useCreateAdminProduct,
  useUpdateAdminProduct,
} from "../hooks/useAdmin";
import type { AdminProduct, CreateProductInput } from "../types";

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
  const ordersQuery = useAdminOrders();
  const createProductMutation = useCreateAdminProduct();
  const updateProductMutation = useUpdateAdminProduct();

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [combosOnly, setCombosOnly] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<AdminProduct | null>(null);
  const [page, setPage] = useState(1);

  const PAGE_SIZE = 12;

  // Edit Product form state for detail view
  const [editFormData, setEditFormData] = useState({
    name: "",
    priceNaira: "",
    category: "Wedding Gifts",
    description: "",
    inStock: true,
  });

  useEffect(() => {
    if (selectedProduct) {
      setEditFormData({
        name: selectedProduct.name,
        priceNaira: String(Math.round(selectedProduct.priceKobo / 100)),
        category: selectedProduct.category,
        description: selectedProduct.description,
        inStock: selectedProduct.inStock,
      });
    }
  }, [selectedProduct]);

  // Product Activities & Order analytics
  const allOrders = ordersQuery.data ?? [];
  const selectedProductOrders = useMemo(() => {
    if (!selectedProduct) return [];
    const pName = selectedProduct.name.toLowerCase().trim();
    const pSlug = selectedProduct.slug.toLowerCase().trim();
    const pId = selectedProduct.id;

    return allOrders.filter((ord) =>
      (ord.items || []).some((it) => {
        const itName = it.name?.toLowerCase().trim() || "";
        const itPid = (it as any).productId;
        return (
          itPid === pId ||
          itName === pName ||
          (itName && pName.includes(itName)) ||
          (pSlug && itName.replace(/[^a-z0-9]+/g, "-") === pSlug)
        );
      })
    );
  }, [selectedProduct, allOrders]);

  const productUnitsSold = useMemo(() => {
    if (!selectedProduct) return 0;
    const pName = selectedProduct.name.toLowerCase().trim();
    const pId = selectedProduct.id;
    return selectedProductOrders.reduce((sum, ord) => {
      const matching = (ord.items || []).filter((it) => {
        const itName = it.name?.toLowerCase().trim() || "";
        const itPid = (it as any).productId;
        return itPid === pId || itName === pName || (itName && pName.includes(itName));
      });
      return sum + matching.reduce((s, it) => s + (it.qty || 1), 0);
    }, 0);
  }, [selectedProduct, selectedProductOrders]);

  const productRevenueKobo = useMemo(() => {
    if (!selectedProduct) return 0;
    const pName = selectedProduct.name.toLowerCase().trim();
    const pId = selectedProduct.id;
    return selectedProductOrders.reduce((sum, ord) => {
      const matching = (ord.items || []).filter((it) => {
        const itName = it.name?.toLowerCase().trim() || "";
        const itPid = (it as any).productId;
        return itPid === pId || itName === pName || (itName && pName.includes(itName));
      });
      return (
        sum +
        matching.reduce(
          (s, it) =>
            s + (it.unitPriceKobo || selectedProduct.priceKobo) * (it.qty || 1),
          0
        )
      );
    }, 0);
  }, [selectedProduct, selectedProductOrders]);

  const handleSaveEditProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    const priceNum = parseFloat(editFormData.priceNaira);
    if (isNaN(priceNum) || priceNum <= 0) {
      toast.error("Please enter a valid price in Naira");
      return;
    }
    if (!editFormData.name.trim()) {
      toast.error("Product name cannot be empty");
      return;
    }

    try {
      await updateProductMutation.mutateAsync({
        productId: selectedProduct.id,
        patch: {
          name: editFormData.name.trim(),
          priceKobo: Math.round(priceNum * 100),
          category: editFormData.category,
          description: editFormData.description.trim(),
          inStock: editFormData.inStock,
        },
      });
      setSelectedProduct((prev) =>
        prev
          ? {
              ...prev,
              name: editFormData.name.trim(),
              priceKobo: Math.round(priceNum * 100),
              category: editFormData.category,
              description: editFormData.description.trim(),
              inStock: editFormData.inStock,
            }
          : null
      );
      toast.success("Product updated successfully");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update product"
      );
    }
  };

  // Add Product form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    priceNaira: "",
    category: "Wedding Gifts",
    imageUrl: "",
    inStock: true,
    isCombo: false,
    comboItems: "",
  });
  const [mediaPreviewUrl, setMediaPreviewUrl] = useState<string>("");
  const [mediaKind, setMediaKind] = useState<"IMAGE" | "VIDEO">("IMAGE");
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleSelectProductMedia = async (file: File) => {
    const objectUrl = URL.createObjectURL(file);
    setMediaPreviewUrl(objectUrl);
    setMediaKind(file.type.startsWith("video/") ? "VIDEO" : "IMAGE");
    setIsUploadingMedia(true);
    setUploadProgress(5);
    try {
      const uploaded = await uploadMediaFile(file, "PRODUCT", (pct) =>
        setUploadProgress(pct)
      );
      setFormData((prev) => ({
        ...prev,
        imageUrl: uploaded.url,
      }));
      setMediaKind(uploaded.kind);
      toast.success(
        uploaded.kind === "VIDEO"
          ? "Product video uploaded"
          : "Product image uploaded"
      );
    } catch (err) {
      setMediaPreviewUrl("");
      setFormData((prev) => ({ ...prev, imageUrl: "" }));
      toast.error(
        err instanceof Error ? err.message : "Could not upload product media"
      );
    } finally {
      setIsUploadingMedia(false);
    }
  };

  const handleRemoveProductMedia = () => {
    setMediaPreviewUrl("");
    setFormData((prev) => ({ ...prev, imageUrl: "" }));
    setUploadProgress(0);
  };

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
      setMediaPreviewUrl("");
      setUploadProgress(0);
      setFormData({
        name: "",
        description: "",
        priceNaira: "",
        category: "Wedding Gifts",
        imageUrl: "",
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
                  <Select
                    value={formData.category}
                    onValueChange={(val) =>
                      setFormData((prev) => ({
                        ...prev,
                        category: val,
                      }))
                    }
                  >
                    <SelectTrigger className="h-10 text-xs">
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.filter((c) => c !== "ALL").map((cat) => (
                        <SelectItem key={cat} value={cat} className="text-xs">
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Product Image or Video
                </label>
                <FileDropzone
                  allowVideo={true}
                  previewUrl={mediaPreviewUrl || formData.imageUrl || undefined}
                  previewKind={mediaKind}
                  label="Tap or drag to upload product image or video"
                  isUploading={isUploadingMedia}
                  uploadProgress={uploadProgress}
                  onSelectFile={handleSelectProductMedia}
                  onRemove={handleRemoveProductMedia}
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
                  disabled={createProductMutation.isPending || isUploadingMedia}
                >
                  {isUploadingMedia
                    ? "Uploading Media..."
                    : createProductMutation.isPending
                      ? "Creating..."
                      : "Save Product"}
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
                className={`overflow-hidden border transition-all duration-200 hover:shadow-soft flex flex-col justify-between ${
                  product.inStock
                    ? "border-border/80 bg-card hover:border-primary/40"
                    : "border-border/40 bg-muted/20 opacity-80"
                }`}
              >
              <div className="flex h-full flex-col justify-between p-4">
                <div className="space-y-2.5">
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

                  {product.imageUrl && (
                    <div
                      onClick={() => setSelectedProduct(product)}
                      className="group relative h-36 w-full cursor-pointer overflow-hidden rounded-lg border border-border/50 bg-muted/30"
                    >
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    </div>
                  )}

                  <h3
                    onClick={() => setSelectedProduct(product)}
                    className="font-heading text-base font-bold text-foreground line-clamp-1 cursor-pointer hover:text-primary transition-colors"
                  >
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
                      <p className="line-clamp-1 text-xs">
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

                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 gap-1.5 text-xs"
                    onClick={() => setSelectedProduct(product)}
                  >
                    <Eye className="h-3.5 w-3.5" />
                    <span>View Details</span>
                  </Button>
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

      {/* Product Detail & Activities Dialog */}
      <Dialog
        open={Boolean(selectedProduct)}
        onOpenChange={(open) => !open && setSelectedProduct(null)}
      >
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto sm:max-w-4xl p-0 gap-0">
          {selectedProduct && (
            <div className="space-y-6 p-6">
              {/* Header */}
              <div className="flex flex-col justify-between gap-4 border-b border-border pb-4 sm:flex-row sm:items-center">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="text-xs font-mono">
                      ID: {selectedProduct.id}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {selectedProduct.category}
                    </Badge>
                    {selectedProduct.isCombo && (
                      <Badge className="bg-accent/20 text-accent-foreground text-xs font-semibold gap-1">
                        <Layers className="h-3 w-3" />
                        Curated Combo
                      </Badge>
                    )}
                    <Badge
                      className={
                        selectedProduct.inStock
                          ? "bg-emerald-600 text-white text-xs"
                          : "bg-zinc-500 text-white text-xs"
                      }
                    >
                      {selectedProduct.inStock ? "In Stock" : "Out of Stock"}
                    </Badge>
                  </div>
                  <DialogTitle className="font-heading text-xl font-bold text-foreground">
                    {selectedProduct.name}
                  </DialogTitle>
                  <p className="text-xs text-muted-foreground font-mono">
                    Slug: {selectedProduct.slug}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="text-xs gap-1.5"
                  >
                    <Link
                      href={`/gifts/${selectedProduct.slug}`}
                      target="_blank"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      <span>Live Catalog Page</span>
                    </Link>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="text-xs gap-1.5"
                  >
                    <Link
                      href={`/checkout/${selectedProduct.slug}`}
                      target="_blank"
                    >
                      <ShoppingCart className="h-3.5 w-3.5" />
                      <span>Direct Checkout</span>
                    </Link>
                  </Button>
                </div>
              </div>

              {/* 4 Stat / KPI Cards */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Card className="border-border/80 bg-muted/20 p-3.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Unit Price
                  </span>
                  <p className="mt-1 font-heading text-lg font-bold text-primary">
                    <Money amountKobo={selectedProduct.priceKobo} />
                  </p>
                </Card>

                <Card className="border-border/80 bg-muted/20 p-3.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Units Sold
                  </span>
                  <p className="mt-1 font-heading text-lg font-bold text-foreground">
                    {productUnitsSold} units
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    across {selectedProductOrders.length} orders
                  </p>
                </Card>

                <Card className="border-border/80 bg-muted/20 p-3.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Product Revenue
                  </span>
                  <p className="mt-1 font-heading text-lg font-bold text-emerald-600 dark:text-emerald-400">
                    <Money amountKobo={productRevenueKobo} />
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    delivered & confirmed
                  </p>
                </Card>

                <Card className="border-border/80 bg-muted/20 p-3.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Rating & Reviews
                  </span>
                  <div className="mt-1 flex items-center gap-1.5">
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                    <span className="font-heading text-lg font-bold text-foreground">
                      {selectedProduct.rating.toFixed(1)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      ({selectedProduct.reviewCount})
                    </span>
                  </div>
                </Card>
              </div>

              {/* Tabs: Specifications, Orders/Activity, Quick Edit */}
              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="overview" className="text-xs">
                    Specifications & Curation
                  </TabsTrigger>
                  <TabsTrigger value="activity" className="text-xs">
                    Orders & Activities ({selectedProductOrders.length})
                  </TabsTrigger>
                  <TabsTrigger value="edit" className="text-xs">
                    Quick Edit & Inventory
                  </TabsTrigger>
                </TabsList>

                {/* Tab 1: Overview */}
                <TabsContent value="overview" className="space-y-4 pt-3">
                  <div className="grid gap-4 sm:grid-cols-3">
                    {/* Media Preview */}
                    <div className="sm:col-span-1">
                      <div className="overflow-hidden rounded-xl border border-border bg-muted/30">
                        {isVideoMediaUrl(selectedProduct.imageUrl || "") ? (
                          <video
                            src={selectedProduct.imageUrl}
                            controls
                            className="aspect-square w-full object-cover"
                          />
                        ) : (
                          <img
                            src={
                              selectedProduct.imageUrl ||
                              "/images/gifts/box-luxury.jpg"
                            }
                            alt={selectedProduct.name}
                            className="aspect-square w-full object-cover"
                          />
                        )}
                      </div>
                    </div>

                    {/* Details */}
                    <div className="space-y-3 sm:col-span-2 text-xs">
                      <div>
                        <span className="font-semibold text-muted-foreground uppercase text-[10px] tracking-wider">
                          Full Product Description
                        </span>
                        <p className="mt-1 text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                          {selectedProduct.description}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-3 border-t border-border/50 pt-2.5">
                        <div>
                          <span className="text-muted-foreground">Sourcing Vendor</span>
                          <p className="font-semibold text-foreground text-sm">
                            {selectedProduct.vendorName}
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Packaging Included</span>
                          <p className="font-semibold text-foreground text-sm">
                            {selectedProduct.packagingIncluded || "Luxury Gift Box & Ribbon"}
                          </p>
                        </div>
                      </div>

                      {/* Occasions & Relationships */}
                      <div className="space-y-2 border-t border-border/50 pt-2.5">
                        {selectedProduct.occasions && selectedProduct.occasions.length > 0 && (
                          <div>
                            <span className="text-muted-foreground text-[11px] block mb-1">
                              Target Occasions:
                            </span>
                            <div className="flex flex-wrap gap-1">
                              {selectedProduct.occasions.map((occ) => (
                                <Badge key={occ} variant="outline" className="text-[10px]">
                                  {occ}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {selectedProduct.relationships && selectedProduct.relationships.length > 0 && (
                          <div>
                            <span className="text-muted-foreground text-[11px] block mb-1">
                              Relationships:
                            </span>
                            <div className="flex flex-wrap gap-1">
                              {selectedProduct.relationships.map((rel) => (
                                <Badge key={rel} variant="secondary" className="text-[10px]">
                                  {rel}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Combo Breakdown */}
                      {selectedProduct.isCombo && selectedProduct.comboItems && (
                        <div className="rounded-xl border border-border bg-muted/20 p-3 space-y-1.5">
                          <span className="font-semibold text-foreground text-xs flex items-center gap-1.5">
                            <Layers className="h-3.5 w-3.5 text-primary" />
                            Combo Box Contents ({selectedProduct.comboItems.length} items)
                          </span>
                          <ul className="space-y-1 text-xs text-muted-foreground pl-1">
                            {selectedProduct.comboItems.map((item, idx) => (
                              <li key={idx} className="flex items-center justify-between">
                                <span>• {item.name}</span>
                                <Badge variant="outline" className="text-[10px] font-mono">
                                  Qty: {item.qty}
                                </Badge>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </TabsContent>

                {/* Tab 2: Orders & Activity */}
                <TabsContent value="activity" className="space-y-3 pt-3">
                  {selectedProductOrders.length === 0 ? (
                    <div className="rounded-xl border border-border/80 bg-muted/20 p-8 text-center text-xs text-muted-foreground space-y-2">
                      <Package className="mx-auto h-8 w-8 text-muted-foreground/60" />
                      <p className="font-semibold text-foreground text-sm">
                        No Orders Placed Yet
                      </p>
                      <p>
                        This product has not been purchased in any orders yet. It is published and ready in the live store.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                      {selectedProductOrders.map((ord) => (
                        <div
                          key={ord.id}
                          className="flex flex-col justify-between gap-2 rounded-xl border border-border/80 bg-card p-3 sm:flex-row sm:items-center text-xs transition-colors hover:border-primary/40"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Link
                                href={`/admin/orders/${ord.id}`}
                                className="font-mono font-bold text-foreground hover:text-primary hover:underline"
                              >
                                {ord.number}
                              </Link>
                              <StatusBadge status={ord.status} />
                              <span className="text-[11px] text-muted-foreground">
                                {formatDate(ord.createdAt || ord.timeline?.[0]?.at || new Date().toISOString())}
                              </span>
                            </div>
                            <p className="text-muted-foreground">
                              Recipient: <strong className="text-foreground">{ord.recipientName}</strong>
                            </p>
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-3">
                            <div className="text-left sm:text-right">
                              <span className="text-[10px] uppercase text-muted-foreground block">
                                Total Value
                              </span>
                              <span className="font-bold text-primary">
                                <Money amountKobo={ord.totalKobo} />
                              </span>
                            </div>
                            <Button asChild size="sm" variant="ghost" className="h-7 px-2 text-xs">
                              <Link href={`/admin/orders/${ord.id}`}>
                                View Order
                              </Link>
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* Tab 3: Quick Edit */}
                <TabsContent value="edit" className="pt-3">
                  <form onSubmit={handleSaveEditProduct} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground">
                        Product Name *
                      </label>
                      <Input
                        value={editFormData.name}
                        onChange={(e) =>
                          setEditFormData((prev) => ({ ...prev, name: e.target.value }))
                        }
                        required
                        className="text-xs"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-foreground">
                          Price in Naira (₦) *
                        </label>
                        <Input
                          type="number"
                          value={editFormData.priceNaira}
                          onChange={(e) =>
                            setEditFormData((prev) => ({
                              ...prev,
                              priceNaira: e.target.value,
                            }))
                          }
                          required
                          className="text-xs"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-foreground">
                          Category
                        </label>
                        <Select
                          value={editFormData.category}
                          onValueChange={(val) =>
                            setEditFormData((prev) => ({ ...prev, category: val }))
                          }
                        >
                          <SelectTrigger className="h-10 text-xs">
                            <SelectValue placeholder="Select Category" />
                          </SelectTrigger>
                          <SelectContent>
                            {CATEGORIES.filter((c) => c !== "ALL").map((cat) => (
                              <SelectItem key={cat} value={cat} className="text-xs">
                                {cat}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground">
                        Description
                      </label>
                      <Textarea
                        rows={3}
                        value={editFormData.description}
                        onChange={(e) =>
                          setEditFormData((prev) => ({
                            ...prev,
                            description: e.target.value,
                          }))
                        }
                        className="text-xs"
                      />
                    </div>

                    <div className="flex items-center justify-between rounded-xl border border-border bg-muted/20 p-3">
                      <div className="space-y-0.5">
                        <p className="text-xs font-semibold text-foreground">
                          Stock Availability
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          Toggle whether this product is actively purchasable in the public catalog
                        </p>
                      </div>
                      <Switch
                        checked={editFormData.inStock}
                        onCheckedChange={(checked) =>
                          setEditFormData((prev) => ({ ...prev, inStock: checked }))
                        }
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedProduct(null)}
                        className="text-xs"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        size="sm"
                        disabled={updateProductMutation.isPending}
                        className="text-xs"
                      >
                        {updateProductMutation.isPending ? "Saving..." : "Save Changes"}
                      </Button>
                    </div>
                  </form>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

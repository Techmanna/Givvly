"use client";

import { useState, useEffect } from "react";
import { Plus, X, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileDropzone } from "@/components/shared/FileDropzone";
import { isVideoMediaUrl, uploadMediaFile } from "@/features/events/api";
import {
  MAIN_COLLECTIONS,
  PRODUCT_DEPARTMENTS,
  RECIPIENT_GENDER_OPTIONS,
} from "@/features/catalog";
import { useUpdateAdminProduct, useDeleteAdminProduct } from "../../hooks/useAdmin";
import { COMMON_OCCASIONS, COMMON_RELATIONSHIPS } from "./constants";
import type { AdminProduct } from "../../types";

interface ProductEditFormProps {
  product: AdminProduct;
  onSuccess: (updated: AdminProduct) => void;
  onCancel: () => void;
  onDeleted?: () => void;
}

export function ProductEditForm({
  product,
  onSuccess,
  onCancel,
  onDeleted,
}: ProductEditFormProps) {
  const updateProductMutation = useUpdateAdminProduct();
  const deleteProductMutation = useDeleteAdminProduct();
  const [isDeletingProduct, setIsDeletingProduct] = useState(false);

  const [editFormData, setEditFormData] = useState({
    name: "",
    slug: "",
    priceNaira: "",
    mainCategory: "WEDDING",
    category: "Curated Combos & Boxes",
    giftType: "LUXURY",
    gender: "UNISEX" as "UNISEX" | "MALE" | "FEMALE",
    vendorName: "Givvly Curated",
    packagingIncluded: "Luxury Gift Box & Ribbon",
    description: "",
    imageUrl: "",
    inStock: true,
    stock: 50,
    isCombo: false,
    comboItems: [] as Array<{ name: string; qty: number }>,
    occasions: [] as string[],
    relationships: [] as string[],
  });

  const [editComboItemInput, setEditComboItemInput] = useState({ name: "", qty: 1 });
  const [editMediaPreviewUrl, setEditMediaPreviewUrl] = useState<string>("");
  const [editMediaKind, setEditMediaKind] = useState<"IMAGE" | "VIDEO">("IMAGE");
  const [isEditUploadingMedia, setIsEditUploadingMedia] = useState(false);
  const [editUploadProgress, setEditUploadProgress] = useState(0);

  useEffect(() => {
    if (product) {
      const initialMain =
        (product.mainCategories && product.mainCategories[0]) ||
        (product.category?.toLowerCase().includes("him") ? "FOR_HIM" : undefined) ||
        (product.category?.toLowerCase().includes("her") ? "FOR_HER" : undefined) ||
        (product.category?.toLowerCase().includes("birth") ? "BIRTHDAY" : undefined) ||
        (product.category?.toLowerCase().includes("wed") ? "WEDDING" : undefined) ||
        (product.category?.toLowerCase().includes("corp") ? "CORPORATE" : undefined) ||
        (product.isCombo ? "COMBOS" : "WEDDING");

      const dept =
        PRODUCT_DEPARTMENTS.find(
          (d) => d.label === product.category || d.value === product.category
        )?.label ||
        product.category ||
        "Curated Combos & Boxes";

      const items = Array.isArray(product.comboItems)
        ? product.comboItems.map((c) => ({
            name: c.name || "",
            qty: c.qty || 1,
          }))
        : [];

      setEditFormData({
        name: product.name || "",
        slug: product.slug || "",
        priceNaira: String(Math.round(product.priceKobo / 100)),
        mainCategory: initialMain,
        category: dept,
        giftType: product.giftType || "LUXURY",
        gender: product.gender || "UNISEX",
        vendorName: product.vendorName || "Givvly Curated",
        packagingIncluded: product.packagingIncluded || "Luxury Gift Box & Ribbon",
        description: product.description || "",
        imageUrl: product.imageUrl || "",
        inStock: product.inStock,
        stock: product.stock ?? (product.inStock ? 50 : 0),
        isCombo: Boolean(product.isCombo || items.length > 0),
        comboItems: items,
        occasions: product.occasions ? [...product.occasions] : [],
        relationships: product.relationships ? [...product.relationships] : [],
      });

      setEditMediaPreviewUrl(product.imageUrl || "");
      setEditMediaKind(isVideoMediaUrl(product.imageUrl || "") ? "VIDEO" : "IMAGE");
      setEditComboItemInput({ name: "", qty: 1 });
      setEditUploadProgress(0);
    }
  }, [product]);

  const handleSelectEditProductMedia = async (file: File) => {
    const objectUrl = URL.createObjectURL(file);
    setEditMediaPreviewUrl(objectUrl);
    setEditMediaKind(file.type.startsWith("video/") ? "VIDEO" : "IMAGE");
    setIsEditUploadingMedia(true);
    setEditUploadProgress(5);
    try {
      const uploaded = await uploadMediaFile(file, "PRODUCT", (pct) =>
        setEditUploadProgress(pct)
      );
      setEditFormData((prev) => ({
        ...prev,
        imageUrl: uploaded.url,
      }));
      setEditMediaKind(uploaded.kind);
      toast.success(
        uploaded.kind === "VIDEO"
          ? "Product video uploaded"
          : "Product image uploaded"
      );
    } catch (err) {
      setEditMediaPreviewUrl(product?.imageUrl || "");
      toast.error(
        err instanceof Error ? err.message : "Could not upload product media"
      );
    } finally {
      setIsEditUploadingMedia(false);
    }
  };

  const handleRemoveEditProductMedia = () => {
    setEditMediaPreviewUrl("");
    setEditFormData((prev) => ({ ...prev, imageUrl: "" }));
    setEditUploadProgress(0);
  };

  const handleAddEditComboItem = () => {
    const name = editComboItemInput.name.trim();
    if (!name) {
      toast.error("Please enter an item name");
      return;
    }
    setEditFormData((prev) => ({
      ...prev,
      comboItems: [
        ...prev.comboItems,
        { name, qty: Math.max(1, editComboItemInput.qty || 1) },
      ],
    }));
    setEditComboItemInput({ name: "", qty: 1 });
  };

  const handleRemoveEditComboItem = (index: number) => {
    setEditFormData((prev) => ({
      ...prev,
      comboItems: prev.comboItems.filter((_, i) => i !== index),
    }));
  };

  const handleUpdateEditComboItemQty = (index: number, newQty: number) => {
    if (newQty < 1) return;
    setEditFormData((prev) => ({
      ...prev,
      comboItems: prev.comboItems.map((item, i) =>
        i === index ? { ...item, qty: newQty } : item
      ),
    }));
  };

  const handleToggleOccasion = (occ: string) => {
    setEditFormData((prev) => {
      const exists = prev.occasions.includes(occ);
      return {
        ...prev,
        occasions: exists
          ? prev.occasions.filter((o) => o !== occ)
          : [...prev.occasions, occ],
      };
    });
  };

  const handleToggleRelationship = (rel: string) => {
    setEditFormData((prev) => {
      const exists = prev.relationships.includes(rel);
      return {
        ...prev,
        relationships: exists
          ? prev.relationships.filter((r) => r !== rel)
          : [...prev.relationships, rel],
      };
    });
  };

  const handleSaveEditProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;

    const priceNum = parseFloat(editFormData.priceNaira);
    if (isNaN(priceNum) || priceNum <= 0) {
      toast.error("Please enter a valid price in Naira");
      return;
    }

    if (!editFormData.name.trim()) {
      toast.error("Product name is required");
      return;
    }

    try {
      const mainCats = [editFormData.mainCategory];
      if (editFormData.isCombo && !mainCats.includes("COMBOS")) {
        mainCats.push("COMBOS");
      }
      if (editFormData.gender === "MALE" && !mainCats.includes("FOR_HIM")) {
        mainCats.push("FOR_HIM");
      }
      if (editFormData.gender === "FEMALE" && !mainCats.includes("FOR_HER")) {
        mainCats.push("FOR_HER");
      }

      const dept = PRODUCT_DEPARTMENTS.find((d) => d.label === editFormData.category);

      const cleanSlug = editFormData.slug.trim()
        ? editFormData.slug
            .toLowerCase()
            .trim()
            .replace(/[^\w\s-]/g, "")
            .replace(/[\s_-]+/g, "-")
        : undefined;

      const comboItemsPayload = editFormData.isCombo
        ? editFormData.comboItems.filter((c) => c.name.trim().length > 0)
        : undefined;

      await updateProductMutation.mutateAsync({
        productId: product.id,
        patch: {
          name: editFormData.name.trim(),
          slug: cleanSlug,
          category: editFormData.category,
          mainCategories: mainCats,
          giftType: dept?.giftType || editFormData.giftType || product.giftType || "LUXURY",
          gender: editFormData.gender,
          description: editFormData.description.trim(),
          vendorName: editFormData.vendorName.trim(),
          packagingIncluded: editFormData.packagingIncluded.trim(),
          priceKobo: Math.round(priceNum * 100),
          imageUrl: editFormData.imageUrl.trim() || undefined,
          inStock: editFormData.inStock,
          stock: editFormData.inStock ? editFormData.stock : 0,
          isCombo: editFormData.isCombo,
          comboItems: comboItemsPayload,
          occasions: editFormData.occasions,
          relationships: editFormData.relationships,
        },
      });

      const updated: AdminProduct = {
        ...product,
        name: editFormData.name.trim(),
        slug: cleanSlug || product.slug,
        priceKobo: Math.round(priceNum * 100),
        category: editFormData.category,
        mainCategories: mainCats,
        giftType: dept?.giftType || editFormData.giftType || product.giftType || "LUXURY",
        gender: editFormData.gender,
        description: editFormData.description.trim(),
        vendorName: editFormData.vendorName.trim(),
        packagingIncluded: editFormData.packagingIncluded.trim(),
        imageUrl: editFormData.imageUrl.trim() || product.imageUrl,
        inStock: editFormData.inStock,
        stock: editFormData.inStock ? editFormData.stock : 0,
        isCombo: editFormData.isCombo,
        comboItems: comboItemsPayload,
        occasions: editFormData.occasions,
        relationships: editFormData.relationships,
      };

      toast.success("Product updated successfully");
      onSuccess(updated);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update product"
      );
    }
  };

  const handleDeleteProduct = async () => {
    if (!product) return;
    const confirmDelete = window.confirm(
      `Are you sure you want to deactivate "${product.name}" from the active catalog?`
    );
    if (!confirmDelete) return;

    try {
      setIsDeletingProduct(true);
      await deleteProductMutation.mutateAsync(product.id);
      toast.success(`"${product.name}" has been deactivated.`);
      onDeleted?.();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to deactivate product"
      );
    } finally {
      setIsDeletingProduct(false);
    }
  };

  return (
    <form onSubmit={handleSaveEditProduct} className="space-y-6">
      {/* Section 1: Basic Identity & Pricing */}
      <div className="rounded-xl border border-border/80 bg-card p-4 space-y-4">
        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Basic Information & Identity
        </h4>

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
            placeholder="e.g. Royal Champagne & Gourmet Hamper"
            className="text-xs"
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              Product URL Slug
            </label>
            <Input
              value={editFormData.slug}
              // onChange={(e) =>
              //   setEditFormData((prev) => ({ ...prev, slug: e.target.value }))
              // }
              disabled
              placeholder="e.g. royal-champagne-gourmet-hamper"
              className="font-mono text-xs"
            />
            <p className="text-[11px] text-muted-foreground">
              Path: <span className="font-mono text-foreground">/gifts/{editFormData.slug || product.slug}</span>
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              Price in Naira (₦) *
            </label>
            <Input
              type="number"
              min="100"
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
            {editFormData.priceNaira && !isNaN(parseFloat(editFormData.priceNaira)) && (
              <p className="text-[11px] text-muted-foreground">
                Catalog Value: <strong className="text-foreground">₦{parseFloat(editFormData.priceNaira).toLocaleString()}</strong>
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              Sourcing Vendor Name
            </label>
            <Input
              value={editFormData.vendorName}
              onChange={(e) =>
                setEditFormData((prev) => ({ ...prev, vendorName: e.target.value }))
              }
              placeholder="e.g. Givvly Curated, Artisan Bakery"
              className="text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              Packaging Details
            </label>
            <Input
              value={editFormData.packagingIncluded}
              onChange={(e) =>
                setEditFormData((prev) => ({ ...prev, packagingIncluded: e.target.value }))
              }
              placeholder="e.g. Luxury Velvet Box & Silk Ribbon"
              className="text-xs"
            />
          </div>
        </div>
      </div>

      {/* Section 2: Categorization & Department */}
      <div className="rounded-xl border border-border/80 bg-card p-4 space-y-4">
        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Collections & Target Audience
        </h4>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              Primary Collection *
            </label>
            <Select
              value={editFormData.mainCategory}
              onValueChange={(val) =>
                setEditFormData((prev) => ({
                  ...prev,
                  mainCategory: val,
                  gender:
                    val === "FOR_HIM"
                      ? "MALE"
                      : val === "FOR_HER"
                        ? "FEMALE"
                        : prev.gender,
                }))
              }
            >
              <SelectTrigger className="h-10 text-xs">
                <SelectValue placeholder="Select Collection" />
              </SelectTrigger>
              <SelectContent>
                {MAIN_COLLECTIONS.filter((c) => c.value !== "ALL").map(
                  (col) => (
                    <SelectItem
                      key={col.value}
                      value={col.value}
                      className="text-xs"
                    >
                      {col.label}
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              Gift Department *
            </label>
            <Select
              value={editFormData.category}
              onValueChange={(val) => {
                const dept = PRODUCT_DEPARTMENTS.find(
                  (d) => d.value === val || d.label === val
                );
                const isCombo = dept?.giftType === "COMBOS" || dept?.value.includes("Combo");
                setEditFormData((prev) => ({
                  ...prev,
                  category: val,
                  giftType: dept?.giftType || prev.giftType,
                  isCombo: isCombo ? true : prev.isCombo,
                }));
              }}
            >
              <SelectTrigger className="h-10 text-xs">
                <SelectValue placeholder="Select Department" />
              </SelectTrigger>
              <SelectContent>
                {PRODUCT_DEPARTMENTS.map((dept) => (
                  <SelectItem
                    key={dept.label}
                    value={dept.label}
                    className="text-xs"
                  >
                    {dept.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              Target Recipient
            </label>
            <Select
              value={editFormData.gender}
              onValueChange={(val: "UNISEX" | "MALE" | "FEMALE") =>
                setEditFormData((prev) => ({ ...prev, gender: val }))
              }
            >
              <SelectTrigger className="h-10 text-xs">
                <SelectValue placeholder="Select Recipient" />
              </SelectTrigger>
              <SelectContent>
                {RECIPIENT_GENDER_OPTIONS.map((g) => (
                  <SelectItem
                    key={g.value}
                    value={g.value}
                    className="text-xs"
                  >
                    {g.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Section 3: Media & Imagery */}
      <div className="rounded-xl border border-border/80 bg-card p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Product Media (Image / Video)
          </h4>
          {editFormData.imageUrl && (
            <span className="text-[10px] text-muted-foreground font-mono truncate max-w-xs">
              {editFormData.imageUrl}
            </span>
          )}
        </div>

        <div className="space-y-2">
          <FileDropzone
            allowVideo={true}
            previewUrl={editMediaPreviewUrl || editFormData.imageUrl || undefined}
            previewKind={editMediaKind}
            label="Upload or replace product image / video"
            isUploading={isEditUploadingMedia}
            uploadProgress={editUploadProgress}
            onSelectFile={handleSelectEditProductMedia}
            onRemove={handleRemoveEditProductMedia}
          />

          <div className="space-y-1 pt-1">
            <label className="text-[11px] font-medium text-muted-foreground">
              Or paste custom image/media URL directly:
            </label>
            <Input
              value={editFormData.imageUrl}
              onChange={(e) => {
                const val = e.target.value;
                setEditFormData((prev) => ({ ...prev, imageUrl: val }));
                setEditMediaPreviewUrl(val);
                setEditMediaKind(isVideoMediaUrl(val) ? "VIDEO" : "IMAGE");
              }}
              placeholder="https://cdn.givvly.store/products/box.jpg"
              className="font-mono text-xs"
            />
          </div>
        </div>
      </div>

      {/* Section 4: Curated Combo Box Builder */}
      <div className="rounded-xl border border-border/80 bg-card p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Curated Combo Box Bundle
            </h4>
            <p className="text-[11px] text-muted-foreground">
              Enable if this gift contains multiple bundled items inside the box.
            </p>
          </div>
          <Switch
            checked={editFormData.isCombo}
            onCheckedChange={(checked) =>
              setEditFormData((prev) => ({ ...prev, isCombo: checked }))
            }
          />
        </div>

        {editFormData.isCombo && (
          <div className="space-y-3 rounded-lg border border-border/60 bg-muted/20 p-3 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground">
                Bundled Box Items ({editFormData.comboItems.length})
              </span>
              <span className="text-[10px] text-muted-foreground">
                Items appear in customer receipts and tracking
              </span>
            </div>

            {editFormData.comboItems.length > 0 ? (
              <div className="space-y-2">
                {editFormData.comboItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between gap-2 rounded-md border border-border/50 bg-card p-2 text-xs"
                  >
                    <span className="font-medium text-foreground">
                      {item.name}
                    </span>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center border border-border rounded-md overflow-hidden">
                        <button
                          type="button"
                          onClick={() => handleUpdateEditComboItemQty(idx, item.qty - 1)}
                          className="px-2 py-0.5 text-xs hover:bg-muted text-muted-foreground"
                        >
                          -
                        </button>
                        <span className="px-2 text-xs font-mono font-semibold">
                          {item.qty}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleUpdateEditComboItemQty(idx, item.qty + 1)}
                          className="px-2 py-0.5 text-xs hover:bg-muted text-muted-foreground"
                        >
                          +
                        </button>
                      </div>

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveEditComboItem(idx)}
                        className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">
                No bundled items yet. Add the individual items below.
              </p>
            )}

            {/* Add New Item Row */}
            <div className="flex items-center gap-2 pt-1 border-t border-border/40">
              <Input
                placeholder="e.g. Scented Candle, Belgian Truffles"
                value={editComboItemInput.name}
                onChange={(e) =>
                  setEditComboItemInput((prev) => ({
                    ...prev,
                    name: e.target.value,
                  }))
                }
                className="text-xs flex-1"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddEditComboItem();
                  }
                }}
              />
              <Input
                type="number"
                min="1"
                value={editComboItemInput.qty}
                onChange={(e) =>
                  setEditComboItemInput((prev) => ({
                    ...prev,
                    qty: parseInt(e.target.value, 10) || 1,
                  }))
                }
                className="w-16 text-xs text-center font-mono"
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleAddEditComboItem}
                className="text-xs gap-1"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add</span>
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Section 5: Occasions & Relationships Tagging */}
      <div className="rounded-xl border border-border/80 bg-card p-4 space-y-4">
        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Occasions & Relationships Tags
        </h4>

        <div className="space-y-2">
          <label className="text-xs font-semibold text-foreground">
            Target Occasions (Click to toggle)
          </label>
          <div className="flex flex-wrap gap-1.5">
            {COMMON_OCCASIONS.map((occ) => {
              const isSelected = editFormData.occasions.includes(occ);
              return (
                <button
                  key={occ}
                  type="button"
                  onClick={() => handleToggleOccasion(occ)}
                  className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                    isSelected
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {occ} {isSelected && "✓"}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-2 pt-2 border-t border-border/40">
          <label className="text-xs font-semibold text-foreground">
            Target Relationships (Click to toggle)
          </label>
          <div className="flex flex-wrap gap-1.5">
            {COMMON_RELATIONSHIPS.map((rel) => {
              const isSelected = editFormData.relationships.includes(rel);
              return (
                <button
                  key={rel}
                  type="button"
                  onClick={() => handleToggleRelationship(rel)}
                  className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                    isSelected
                      ? "bg-accent/40 text-accent-foreground border border-accent font-semibold"
                      : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {rel} {isSelected && "✓"}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Section 6: Full Description */}
      <div className="rounded-xl border border-border/80 bg-card p-4 space-y-2">
        <label className="text-xs font-semibold text-foreground">
          Full Product Description *
        </label>
        <Textarea
          rows={4}
          value={editFormData.description}
          onChange={(e) =>
            setEditFormData((prev) => ({
              ...prev,
              description: e.target.value,
            }))
          }
          placeholder="Detailed contents, materials, dimensions, and celebration gifting notes..."
          className="text-xs leading-relaxed"
          required
        />
      </div>

      {/* Section 7: Stock & Visibility */}
      <div className="rounded-xl border border-border/80 bg-card p-4 space-y-4">
        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Inventory & Availability
        </h4>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-0.5">
            <p className="text-xs font-semibold text-foreground">
              Public Stock Status
            </p>
            <p className="text-[11px] text-muted-foreground">
              Toggle whether this product is purchasable immediately by gift buyers
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {editFormData.inStock ? "In Stock" : "Out of Stock"}
            </span>
            <Switch
              checked={editFormData.inStock}
              onCheckedChange={(checked) =>
                setEditFormData((prev) => ({ ...prev, inStock: checked }))
              }
            />
          </div>
        </div>

        {editFormData.inStock && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-border/40">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">
                Tracked Units Available
              </label>
              <Input
                type="number"
                min="0"
                value={editFormData.stock}
                onChange={(e) =>
                  setEditFormData((prev) => ({
                    ...prev,
                    stock: parseInt(e.target.value, 10) || 0,
                  }))
                }
                className="text-xs"
              />
            </div>
          </div>
        )}
      </div>

      {/* Section 8: Actions & Danger Zone */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-border">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={isDeletingProduct}
          onClick={handleDeleteProduct}
          className="text-destructive hover:bg-destructive/10 text-xs gap-1.5 w-full sm:w-auto"
        >
          <Trash2 className="h-3.5 w-3.5" />
          <span>Deactivate Product</span>
        </Button>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onCancel}
            className="text-xs"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={updateProductMutation.isPending || isEditUploadingMedia}
            className="text-xs min-w-[130px]"
          >
            {updateProductMutation.isPending ? "Saving Changes..." : "Save Product Changes"}
          </Button>
        </div>
      </div>
    </form>
  );
}

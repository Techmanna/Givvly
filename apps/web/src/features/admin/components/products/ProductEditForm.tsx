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
import {
  useAdminVendors,
  useUpdateAdminProduct,
  useDeleteAdminProduct,
} from "../../hooks/useAdmin";
import { COMMON_OCCASIONS, COMMON_RELATIONSHIPS } from "./constants";
import type { AdminProduct } from "../../types";
import { calculateVendorSellingPrice } from "@givvly/contracts";
import { VendorPricingPreview } from "./VendorPricingPreview";

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
  const vendorsQuery = useAdminVendors();
  const vendors = vendorsQuery.data ?? [];
  const [isDeletingProduct, setIsDeletingProduct] = useState(false);

  const [editFormData, setEditFormData] = useState({
    name: "",
    slug: "",
    priceNaira: "",
    costPriceNaira: "",
    priceOverridden: false,
    mainCategory: "WEDDING",
    category: "Curated Combos & Boxes",
    giftType: "LUXURY",
    gender: "UNISEX" as "UNISEX" | "MALE" | "FEMALE",
    vendorId: "",
    vendorName: "Givvly Curated",
    packagingIncluded: "Luxury Gift Box & Ribbon",
    description: "",
    imageUrl: "",
    inStock: true,
    stock: 50,
    isCombo: false,
    comboItems: [] as Array<{ name: string; qty: number }>,
    variants: [] as Array<{
      id: string;
      name: string;
      priceNaira: string;
      stock: string;
      sku: string;
      active: boolean;
    }>,
    occasions: [] as string[],
    relationships: [] as string[],
    boxRole: "ITEM" as "ITEM" | "GIFT_BOX",
    boxMaxItems: "",
    boxSizeTier: "" as "" | "SMALL" | "MEDIUM" | "LARGE",
  });

  const [editComboItemInput, setEditComboItemInput] = useState({ name: "", qty: 1 });
  const [variantInput, setVariantInput] = useState({
    name: "",
    priceNaira: "",
    stock: "",
    sku: "",
  });
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

      const initialVariants = Array.isArray(product.variants)
        ? product.variants.map((v) => ({
            id: v.id || `var_${Math.random().toString(36).substring(2, 9)}`,
            name: v.name || "",
            priceNaira: String(Math.round((v.priceKobo || 0) / 100)),
            stock: v.stock === null || v.stock === undefined ? "" : String(v.stock),
            sku: v.sku || "",
            active: v.active !== false,
          }))
        : [];

      setEditFormData({
        name: product.name || "",
        slug: product.slug || "",
        priceNaira: String(Math.round(product.priceKobo / 100)),
        costPriceNaira:
          product.costPriceKobo !== null && product.costPriceKobo !== undefined
            ? String(Math.round(product.costPriceKobo / 100))
            : "",
        priceOverridden: Boolean(product.priceOverridden),
        mainCategory: initialMain,
        category: dept,
        giftType: product.giftType || "LUXURY",
        gender: product.gender || "UNISEX",
        vendorId: product.vendorId || "",
        vendorName: product.vendorName || "Givvly Curated",
        packagingIncluded: product.packagingIncluded || "Luxury Gift Box & Ribbon",
        description: product.description || "",
        imageUrl: product.imageUrl || "",
        inStock: product.inStock,
        stock: product.stock ?? (product.inStock ? 50 : 0),
        isCombo: Boolean(product.isCombo || items.length > 0),
        comboItems: items,
        variants: initialVariants,
        occasions: product.occasions ? [...product.occasions] : [],
        relationships: product.relationships ? [...product.relationships] : [],
        boxRole: product.boxRole === "GIFT_BOX" ? "GIFT_BOX" : "ITEM",
        boxMaxItems:
          typeof product.boxMaxItems === "number" ? String(product.boxMaxItems) : "",
        boxSizeTier: product.boxSizeTier ?? "",
      });

      setEditMediaPreviewUrl(product.imageUrl || "");
      setEditMediaKind(isVideoMediaUrl(product.imageUrl || "") ? "VIDEO" : "IMAGE");
      setEditComboItemInput({ name: "", qty: 1 });
      setVariantInput({ name: "", priceNaira: "", stock: "", sku: "" });
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

  const handleAddVariant = () => {
    const name = variantInput.name.trim();
    const priceNum = parseFloat(variantInput.priceNaira);
    if (!name) {
      toast.error("Please enter an option name (e.g. '500g', 'Large', 'Midnight Blue')");
      return;
    }
    if (isNaN(priceNum) || priceNum <= 0) {
      toast.error("Please enter a valid price in Naira for this option");
      return;
    }

    const newVariant = {
      id: `var_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name,
      priceNaira: String(priceNum),
      stock: variantInput.stock.trim(),
      sku: variantInput.sku.trim(),
      active: true,
    };

    setEditFormData((prev) => ({
      ...prev,
      variants: [...prev.variants, newVariant],
    }));

    setVariantInput({ name: "", priceNaira: "", stock: "", sku: "" });
    toast.success(`Option "${name}" added`);
  };

  const handleRemoveVariant = (index: number) => {
    setEditFormData((prev) => ({
      ...prev,
      variants: prev.variants.filter((_, i) => i !== index),
    }));
  };

  const handleUpdateVariant = (
    index: number,
    patch: Partial<{
      name: string;
      priceNaira: string;
      stock: string;
      sku: string;
      active: boolean;
    }>
  ) => {
    setEditFormData((prev) => ({
      ...prev,
      variants: prev.variants.map((v, i) => (i === index ? { ...v, ...patch } : v)),
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

      // Auto-flush pending variant from input row if user filled it out but didn't click "+"
      const allVariants = [...editFormData.variants];
      const pendingName = variantInput.name.trim();
      const pendingPrice = parseFloat(variantInput.priceNaira);
      if (pendingName && !isNaN(pendingPrice) && pendingPrice > 0) {
        allVariants.push({
          id: `var_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          name: pendingName,
          priceNaira: String(pendingPrice),
          stock: variantInput.stock.trim(),
          sku: variantInput.sku.trim(),
          active: true,
        });
      }

      const variantsPayload = allVariants
        .filter(
          (v) => v.name.trim().length > 0 && parseFloat(v.priceNaira) > 0
        )
        .map((v) => ({
          id: v.id,
          name: v.name.trim(),
          priceKobo: Math.round(parseFloat(v.priceNaira) * 100),
          stock: String(v.stock ?? "").trim()
            ? parseInt(String(v.stock), 10)
            : null,
          sku: String(v.sku ?? "").trim() || undefined,
          active: v.active !== false,
        }));

      const costPriceNum = editFormData.costPriceNaira.trim()
        ? parseFloat(editFormData.costPriceNaira)
        : null;

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
          vendorId: editFormData.vendorId || null,
          vendorName: editFormData.vendorName.trim(),
          packagingIncluded: editFormData.packagingIncluded.trim(),
          priceKobo: Math.round(priceNum * 100),
          costPriceKobo:
            costPriceNum !== null && !isNaN(costPriceNum) && costPriceNum >= 0
              ? Math.round(costPriceNum * 100)
              : null,
          priceOverridden: editFormData.priceOverridden,
          imageUrl: editFormData.imageUrl.trim() || undefined,
          inStock: editFormData.inStock,
          stock: editFormData.inStock ? editFormData.stock : 0,
          isCombo: editFormData.isCombo,
          comboItems: comboItemsPayload,
          variants: variantsPayload,
          occasions: editFormData.occasions,
          relationships: editFormData.relationships,
          boxRole: editFormData.boxRole,
          boxMaxItems: editFormData.boxMaxItems.trim()
            ? Number(editFormData.boxMaxItems)
            : null,
          boxSizeTier: editFormData.boxSizeTier || null,
        },
      });

      const activePrices = (variantsPayload || [])
        .filter((v) => v.active !== false)
        .map((v) => v.priceKobo);
      const minPriceKobo =
        activePrices.length > 0
          ? Math.min(...activePrices)
          : Math.round(priceNum * 100);
      const maxPriceKobo =
        activePrices.length > 0
          ? Math.max(...activePrices)
          : Math.round(priceNum * 100);

      const updated: AdminProduct = {
        ...product,
        name: editFormData.name.trim(),
        slug: cleanSlug || product.slug,
        priceKobo: Math.round(priceNum * 100),
        variants: variantsPayload,
        minPriceKobo,
        maxPriceKobo,
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

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              Source / Vendor (Optional)
            </label>
            <Select
              value={editFormData.vendorId || "__NONE__"}
              onValueChange={(val) => {
                const nextVendorId = val === "__NONE__" ? "" : val;
                const chosen = vendors.find((v) => v.id === nextVendorId);
                setEditFormData((prev) => {
                  const costNum = parseFloat(prev.costPriceNaira);
                  const suggested =
                    chosen && !prev.priceOverridden && !isNaN(costNum) && costNum > 0
                      ? String(
                          Math.round(
                            calculateVendorSellingPrice(
                              Math.round(costNum * 100),
                              chosen
                            ).sellingPriceKobo / 100
                          )
                        )
                      : null;
                  return {
                    ...prev,
                    vendorId: nextVendorId,
                    vendorName: chosen ? chosen.name : "Givvly Curated",
                    ...(suggested !== null && { priceNaira: suggested }),
                  };
                });
              }}
            >
              <SelectTrigger className="text-xs bg-card">
                <SelectValue placeholder="Givvly Curated (No specific vendor)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__NONE__">
                  Givvly Curated (No specific vendor)
                </SelectItem>
                {vendors.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.name}
                    {v.location ? ` (${v.location})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              Vendor / Buying Price (₦, Admin Only)
            </label>
            <Input
              type="number"
              min="0"
              value={editFormData.costPriceNaira}
              onChange={(e) => {
                const nextCost = e.target.value;
                setEditFormData((prev) => {
                  const chosen = vendors.find((v) => v.id === prev.vendorId);
                  const costNum = parseFloat(nextCost);
                  const suggested =
                    chosen && !prev.priceOverridden && !isNaN(costNum) && costNum > 0
                      ? String(
                          Math.round(
                            calculateVendorSellingPrice(
                              Math.round(costNum * 100),
                              chosen
                            ).sellingPriceKobo / 100
                          )
                        )
                      : null;
                  return {
                    ...prev,
                    costPriceNaira: nextCost,
                    ...(suggested !== null && { priceNaira: suggested }),
                  };
                });
              }}
              placeholder="Optional (not visible to customers)"
              className="text-xs"
            />
          </div>
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
                priceOverridden: Boolean(prev.vendorId),
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

        <VendorPricingPreview
          vendor={vendors.find((v) => v.id === editFormData.vendorId) ?? null}
          costPriceNaira={editFormData.costPriceNaira}
          priceNaira={editFormData.priceNaira}
          isOverridden={editFormData.priceOverridden}
          onReapplyRule={() => {
            const chosen = vendors.find((v) => v.id === editFormData.vendorId);
            const costNum = parseFloat(editFormData.costPriceNaira);
            if (!chosen || isNaN(costNum) || costNum <= 0) return;
            const calc = calculateVendorSellingPrice(
              Math.round(costNum * 100),
              chosen
            );
            setEditFormData((prev) => ({
              ...prev,
              priceNaira: String(Math.round(calc.sellingPriceKobo / 100)),
              priceOverridden: false,
            }));
          }}
        />
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

      {/* Section: Product Options & Variants */}
      <div className="rounded-xl border border-border/80 bg-card p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Product Options & Variants
              </h4>
              {editFormData.variants.length > 0 && (
                <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                  {editFormData.variants.length} option
                  {editFormData.variants.length === 1 ? "" : "s"}
                </span>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Define options such as sizes, scents, colors, or bundles with custom prices and inventory.
            </p>
          </div>
        </div>

        <div className="space-y-3 rounded-lg border border-border/60 bg-muted/20 p-3 pt-2">
          {editFormData.variants.length > 0 ? (
            <div className="space-y-2">
              <div className="hidden sm:grid sm:grid-cols-12 gap-2 text-[10px] font-semibold uppercase text-muted-foreground px-2">
                <span className="col-span-4">Option Name</span>
                <span className="col-span-3">Price (₦)</span>
                <span className="col-span-2">Stock</span>
                <span className="col-span-2">SKU</span>
                <span className="col-span-1 text-right">Action</span>
              </div>
              {editFormData.variants.map((variant, idx) => (
                <div
                  key={variant.id || idx}
                  className="flex flex-col sm:grid sm:grid-cols-12 items-start sm:items-center gap-2 rounded-md border border-border/50 bg-card p-2 text-xs"
                >
                  <div className="w-full sm:col-span-4">
                    <Input
                      value={variant.name}
                      onChange={(e) =>
                        handleUpdateVariant(idx, { name: e.target.value })
                      }
                      placeholder="e.g. 500g, Large, Rose Gold"
                      className="h-8 text-xs font-medium"
                    />
                  </div>
                  <div className="w-full sm:col-span-3">
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-serif text-muted-foreground">
                        ₦
                      </span>
                      <Input
                        type="number"
                        min="0"
                        step="100"
                        value={variant.priceNaira}
                        onChange={(e) =>
                          handleUpdateVariant(idx, { priceNaira: e.target.value })
                        }
                        placeholder="Price"
                        className="h-8 pl-6 text-xs font-mono font-semibold"
                      />
                    </div>
                  </div>
                  <div className="w-full sm:col-span-2">
                    <Input
                      type="number"
                      min="0"
                      value={variant.stock ?? ""}
                      onChange={(e) =>
                        handleUpdateVariant(idx, { stock: e.target.value })
                      }
                      placeholder="Unlimited"
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                  <div className="w-full sm:col-span-2">
                    <Input
                      value={variant.sku ?? ""}
                      onChange={(e) =>
                        handleUpdateVariant(idx, { sku: e.target.value })
                      }
                      placeholder="SKU-001"
                      className="h-8 text-[11px] font-mono uppercase"
                    />
                  </div>
                  <div className="w-full sm:col-span-1 flex items-center justify-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveVariant(idx)}
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
              No custom options yet. The base product price (₦{editFormData.priceNaira || "0"}) will apply to all orders.
            </p>
          )}

          {/* Add New Variant Row */}
          <div className="space-y-2 pt-2 border-t border-border/40">
            <span className="text-[11px] font-semibold text-foreground">
              Add New Option
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
              <div className="sm:col-span-4">
                <Input
                  placeholder="Option name (e.g. Deluxe 1kg)"
                  value={variantInput.name}
                  onChange={(e) =>
                    setVariantInput((prev) => ({ ...prev, name: e.target.value }))
                  }
                  className="h-8 text-xs"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddVariant();
                    }
                  }}
                />
              </div>
              <div className="sm:col-span-3">
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-serif text-muted-foreground">
                    ₦
                  </span>
                  <Input
                    type="number"
                    min="0"
                    step="100"
                    placeholder="Price in ₦"
                    value={variantInput.priceNaira}
                    onChange={(e) =>
                      setVariantInput((prev) => ({
                        ...prev,
                        priceNaira: e.target.value,
                      }))
                    }
                    className="h-8 pl-6 text-xs font-mono"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddVariant();
                      }
                    }}
                  />
                </div>
              </div>
              <div className="sm:col-span-2">
                <Input
                  type="number"
                  min="0"
                  placeholder="Stock (opt)"
                  value={variantInput.stock}
                  onChange={(e) =>
                    setVariantInput((prev) => ({ ...prev, stock: e.target.value }))
                  }
                  className="h-8 text-xs font-mono"
                />
              </div>
              <div className="sm:col-span-2">
                <Input
                  placeholder="SKU (opt)"
                  value={variantInput.sku}
                  onChange={(e) =>
                    setVariantInput((prev) => ({ ...prev, sku: e.target.value }))
                  }
                  className="h-8 text-[11px] font-mono uppercase"
                />
              </div>
              <div className="sm:col-span-1">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleAddVariant}
                  className="h-8 w-full text-xs gap-1 px-2"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span className="sm:hidden">Add Option</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Curate Your Box Role */}
      <div className="rounded-xl border border-border/80 bg-card p-4 space-y-4">
        <div className="space-y-0.5">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Curate Your Box Role
          </h4>
          <p className="text-[11px] text-muted-foreground">
            Mark as a Gift Box if customers choose it as packaging in Step 1 of Curate Your Box.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">Role</label>
            <select
              value={editFormData.boxRole}
              onChange={(e) =>
                setEditFormData((prev) => ({
                  ...prev,
                  boxRole: e.target.value === "GIFT_BOX" ? "GIFT_BOX" : "ITEM",
                }))
              }
              className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-xs text-foreground"
            >
              <option value="ITEM">Gift Item</option>
              <option value="GIFT_BOX">Gift Box (Packaging)</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">Size Tier</label>
            <select
              value={editFormData.boxSizeTier}
              onChange={(e) =>
                setEditFormData((prev) => ({
                  ...prev,
                  boxSizeTier: e.target.value as "" | "SMALL" | "MEDIUM" | "LARGE",
                }))
              }
              className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-xs text-foreground"
            >
              <option value="">None / Standard</option>
              <option value="SMALL">Small</option>
              <option value="MEDIUM">Medium</option>
              <option value="LARGE">Large</option>
            </select>
          </div>
          {editFormData.boxRole === "GIFT_BOX" && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">
                Max Items Capacity
              </label>
              <Input
                type="number"
                min={3}
                max={30}
                placeholder="e.g. 6"
                value={editFormData.boxMaxItems}
                onChange={(e) =>
                  setEditFormData((prev) => ({ ...prev, boxMaxItems: e.target.value }))
                }
                className="h-9 text-xs"
              />
            </div>
          )}
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

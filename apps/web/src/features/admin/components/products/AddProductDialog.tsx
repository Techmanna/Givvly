"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
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
import { FileDropzone } from "@/components/shared/FileDropzone";
import { uploadMediaFile } from "@/features/events/api";
import {
  MAIN_COLLECTIONS,
  PRODUCT_DEPARTMENTS,
  RECIPIENT_GENDER_OPTIONS,
} from "@/features/catalog";
import { useAdminVendors, useCreateAdminProduct } from "../../hooks/useAdmin";
import type { CreateProductInput } from "../../types";
import { Textarea } from "@/components/ui/textarea";

interface AddProductDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function AddProductDialog({
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: AddProductDialogProps = {}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : internalOpen;
  const setIsOpen = isControlled ? (controlledOnOpenChange || (() => { })) : setInternalOpen;

  const createProductMutation = useCreateAdminProduct();
  const vendorsQuery = useAdminVendors();
  const vendors = vendorsQuery.data ?? [];

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    priceNaira: "",
    costPriceNaira: "",
    mainCategory: "WEDDING",
    category: "Curated Combos & Boxes",
    giftType: "LUXURY",
    gender: "UNISEX" as "UNISEX" | "MALE" | "FEMALE",
    vendorId: "",
    imageUrl: "",
    inStock: true,
    isCombo: false,
    comboItems: "",
    boxRole: "ITEM" as "GIFT_BOX" | "ITEM" | "EXCLUDED",
    boxMaxItems: "6",
    boxSizeTier: "" as "" | "SMALL" | "MEDIUM" | "LARGE",
  });

  const [mediaPreviewUrl, setMediaPreviewUrl] = useState<string>("");
  const [mediaKind, setMediaKind] = useState<"IMAGE" | "VIDEO">("IMAGE");
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      priceNaira: "",
      costPriceNaira: "",
      mainCategory: "WEDDING",
      category: "Curated Combos & Boxes",
      giftType: "LUXURY",
      gender: "UNISEX",
      vendorId: "",
      imageUrl: "",
      inStock: true,
      isCombo: false,
      comboItems: "",
      boxRole: "ITEM",
      boxMaxItems: "6",
      boxSizeTier: "",
    });
    setMediaPreviewUrl("");
    setUploadProgress(0);
  };

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
      const isGiftBox = formData.boxRole === "GIFT_BOX";
      const dept = PRODUCT_DEPARTMENTS.find((d) => d.label === formData.category);
      const mainCats = isGiftBox ? ["BIRTHDAY", "ANNIVERSARY", "WEDDING"] : [formData.mainCategory];
      if (!isGiftBox && formData.isCombo && !mainCats.includes("COMBOS")) {
        mainCats.push("COMBOS");
      }
      if (!isGiftBox && formData.gender === "MALE" && !mainCats.includes("FOR_HIM")) {
        mainCats.push("FOR_HIM");
      }
      if (!isGiftBox && formData.gender === "FEMALE" && !mainCats.includes("FOR_HER")) {
        mainCats.push("FOR_HER");
      }

      const occasions: string[] = [];
      if (isGiftBox) occasions.push("BIRTHDAY", "ANNIVERSARY", "WEDDING");
      else if (formData.mainCategory === "WEDDING") occasions.push("WEDDING", "ANNIVERSARY");
      else if (formData.mainCategory === "BIRTHDAY") occasions.push("BIRTHDAY");
      else if (formData.mainCategory === "CORPORATE") occasions.push("CORPORATE", "PROMOTION", "CONGRATULATIONS");
      else occasions.push("JUST_BECAUSE", "APPRECIATION");

      const relationships: string[] = [];
      if (isGiftBox) relationships.push("FRIEND", "PARTNER", "COUPLE", "FAMILY");
      else if (formData.gender === "MALE") relationships.push("HUSBAND", "BOYFRIEND", "FRIEND", "BROTHER");
      else if (formData.gender === "FEMALE") relationships.push("WIFE", "GIRLFRIEND", "FRIEND", "SISTER");
      else relationships.push("COUPLE", "FRIEND", "COLLEAGUE");

      const costPriceNum = formData.costPriceNaira.trim()
        ? parseFloat(formData.costPriceNaira)
        : null;

      const input: CreateProductInput = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        priceKobo: Math.round(priceNum * 100),
        costPriceKobo:
          costPriceNum !== null && !isNaN(costPriceNum) && costPriceNum >= 0
            ? Math.round(costPriceNum * 100)
            : null,
        category: isGiftBox ? "Gift Boxes" : formData.category,
        mainCategories: mainCats,
        giftType: isGiftBox ? "PACKAGING" : dept?.giftType || formData.giftType || "LUXURY",
        gender: isGiftBox ? "UNISEX" : formData.gender,
        vendorId: formData.vendorId || null,
        occasions,
        relationships,
        imageUrl: formData.imageUrl.trim() || "/images/gifts/box-luxury.jpg",
        inStock: formData.inStock,
        isCombo: isGiftBox ? false : formData.isCombo,
        comboItems:
          !isGiftBox && formData.isCombo
            ? formData.comboItems
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
              .map((name) => ({ name, qty: 1 }))
            : undefined,
        boxRole: formData.boxRole,
        boxMaxItems:
          formData.boxRole === "GIFT_BOX" && formData.boxMaxItems
            ? Math.max(3, Number(formData.boxMaxItems) || 6)
            : null,
        boxSizeTier: formData.boxSizeTier || null,
      };

      await createProductMutation.mutateAsync(input);
      toast.success("Product added to catalog successfully");
      setIsOpen(false);
      resetForm();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to add product"
      );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="shadow-sm">
          <Plus className="mr-1.5 h-4 w-4" />
          <span>Add New Product</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading text-lg">
            Add Catalog Gift Item / Box
          </DialogTitle>
          <DialogDescription className="text-xs">
            Create a single gift item, curated combo, or packaging box for Curate Your Box.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleCreateProduct} className="space-y-4 pt-2">
          {/* Curate Your Box Role (at top so Gift Box mode hides unnecessary categorization) */}
          <div className="rounded-xl border border-border/80 bg-muted/30 p-3 space-y-3">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">
                  Product Role
                </label>
                <Select
                  value={formData.boxRole}
                  onValueChange={(val: "GIFT_BOX" | "ITEM" | "EXCLUDED") =>
                    setFormData((prev) => ({
                      ...prev,
                      boxRole: val,
                      boxSizeTier:
                        val === "GIFT_BOX" && !prev.boxSizeTier
                          ? "MEDIUM"
                          : prev.boxSizeTier,
                    }))
                  }
                >
                  <SelectTrigger className="h-9 text-xs bg-card">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ITEM">Standard Gift Item (Selectable in Step 2)</SelectItem>
                    <SelectItem value="GIFT_BOX">Gift Box / Packaging (Selectable in Step 1)</SelectItem>
                    <SelectItem value="EXCLUDED">Exclude from Box Builder</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">
                  Source / Vendor (Optional)
                </label>
                <Select
                  value={formData.vendorId || "__NONE__"}
                  onValueChange={(val) =>
                    setFormData((prev) => ({
                      ...prev,
                      vendorId: val === "__NONE__" ? "" : val,
                    }))
                  }
                >
                  <SelectTrigger className="h-9 text-xs bg-card">
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

              {formData.boxRole === "ITEM" && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">
                    Minimum Box Size Required (Optional)
                  </label>
                  <Select
                    value={formData.boxSizeTier || "ANY"}
                    onValueChange={(val) =>
                      setFormData((prev) => ({
                        ...prev,
                        boxSizeTier: val === "ANY" ? "" : (val as "SMALL" | "MEDIUM" | "LARGE"),
                      }))
                    }
                  >
                    <SelectTrigger className="h-9 text-xs bg-card">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ANY">Fits in Any Box</SelectItem>
                      <SelectItem value="MEDIUM">Requires Medium or Large Box</SelectItem>
                      <SelectItem value="LARGE">Requires Large Box Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {formData.boxRole === "GIFT_BOX" && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground">
                      Max Items Capacity
                    </label>
                    <Input
                      type="number"
                      min={3}
                      max={50}
                      className="h-9"
                      value={formData.boxMaxItems}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, boxMaxItems: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground">
                      Box Size Tier
                    </label>
                    <Select
                      value={formData.boxSizeTier || "MEDIUM"}
                      onValueChange={(val: "SMALL" | "MEDIUM" | "LARGE") =>
                        setFormData((prev) => ({ ...prev, boxSizeTier: val }))
                      }
                    >
                      <SelectTrigger className="h-9 text-xs bg-card">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SMALL">Small (Petite)</SelectItem>
                        <SelectItem value="MEDIUM">Medium (Signature)</SelectItem>
                        <SelectItem value="LARGE">Large (Grand Trunk)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Core Details Grid */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">
                  {formData.boxRole === "GIFT_BOX" ? "Box Name *" : "Product Name *"}
                </label>
                <Input
                  required
                  placeholder={
                    formData.boxRole === "GIFT_BOX"
                      ? "e.g. Signature Velvet Atelier Box"
                      : "e.g. Royal Champagne & Gourmet Hamper"
                  }
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                />
              </div>

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

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Vendor / Buying Price (₦, Admin Only)
                </label>
                <Input
                  type="number"
                  min="0"
                  placeholder="Optional (e.g. 35000)"
                  value={formData.costPriceNaira}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      costPriceNaira: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">
                  Description
                </label>
                <Textarea
                  rows={3}
                  placeholder={
                    formData.boxRole === "GIFT_BOX"
                      ? "e.g. Luxury velvet keepsake box with silk ribbon and wax seal"
                      : "e.g. Moët & Chandon Imperial, assorted Belgian truffles"
                  }
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                />
              </div>

              {formData.boxRole !== "GIFT_BOX" && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground">
                      Primary Collection / Occasion *
                    </label>
                    <Select
                      value={formData.mainCategory}
                      onValueChange={(val) =>
                        setFormData((prev) => ({
                          ...prev,
                          mainCategory: val,
                          isCombo: val === "COMBOS" ? true : prev.isCombo,
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
                        <SelectValue placeholder="Select primary collection" />
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

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground">
                      Gift Department *
                    </label>
                    <Select
                      value={formData.category}
                      onValueChange={(val) => {
                        const dept = PRODUCT_DEPARTMENTS.find(
                          (d) => d.value === val || d.label === val
                        );
                        const isCombo = dept?.giftType === "COMBOS" || dept?.value.includes("Combo");
                        setFormData((prev) => ({
                          ...prev,
                          category: val,
                          giftType: dept?.giftType || prev.giftType,
                          isCombo: isCombo ? true : prev.isCombo,
                        }));
                      }}
                    >
                      <SelectTrigger className="h-10 text-xs">
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                      <SelectContent>
                        {PRODUCT_DEPARTMENTS.map((dept) => (
                          <SelectItem
                            key={dept.value}
                            value={dept.value}
                            className="text-xs"
                          >
                            {dept.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-xs font-semibold text-foreground">
                      Target Recipient
                    </label>
                    <Select
                      value={formData.gender}
                      onValueChange={(val: "UNISEX" | "MALE" | "FEMALE") =>
                        setFormData((prev) => ({
                          ...prev,
                          gender: val,
                        }))
                      }
                    >
                      <SelectTrigger className="h-10 text-xs">
                        <SelectValue placeholder="Select target recipient" />
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
              )}
            </div>

            <div className="space-y-4">
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

              {formData.boxRole !== "GIFT_BOX" && (
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
              )}

              <div className="flex items-center justify-between rounded-xl border border-border/80 bg-muted/30 p-3">
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
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
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
  );
}

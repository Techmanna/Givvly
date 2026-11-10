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
import { useCreateAdminProduct } from "../../hooks/useAdmin";
import type { CreateProductInput } from "../../types";

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
  const setIsOpen = isControlled ? (controlledOnOpenChange || (() => {})) : setInternalOpen;

  const createProductMutation = useCreateAdminProduct();

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    priceNaira: "",
    mainCategory: "WEDDING",
    category: "Curated Combos & Boxes",
    giftType: "LUXURY",
    gender: "UNISEX" as "UNISEX" | "MALE" | "FEMALE",
    imageUrl: "",
    inStock: true,
    isCombo: false,
    comboItems: "",
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
      mainCategory: "WEDDING",
      category: "Curated Combos & Boxes",
      giftType: "LUXURY",
      gender: "UNISEX",
      imageUrl: "",
      inStock: true,
      isCombo: false,
      comboItems: "",
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
      const dept = PRODUCT_DEPARTMENTS.find((d) => d.label === formData.category);
      const mainCats = [formData.mainCategory];
      if (formData.isCombo && !mainCats.includes("COMBOS")) {
        mainCats.push("COMBOS");
      }
      if (formData.gender === "MALE" && !mainCats.includes("FOR_HIM")) {
        mainCats.push("FOR_HIM");
      }
      if (formData.gender === "FEMALE" && !mainCats.includes("FOR_HER")) {
        mainCats.push("FOR_HER");
      }

      const occasions: string[] = [];
      if (formData.mainCategory === "WEDDING") occasions.push("WEDDING", "ANNIVERSARY");
      else if (formData.mainCategory === "BIRTHDAY") occasions.push("BIRTHDAY");
      else if (formData.mainCategory === "CORPORATE") occasions.push("CORPORATE", "PROMOTION", "CONGRATULATIONS");
      else occasions.push("JUST_BECAUSE", "APPRECIATION");

      const relationships: string[] = [];
      if (formData.gender === "MALE") relationships.push("HUSBAND", "BOYFRIEND", "FRIEND", "BROTHER");
      else if (formData.gender === "FEMALE") relationships.push("WIFE", "GIRLFRIEND", "FRIEND", "SISTER");
      else relationships.push("COUPLE", "FRIEND", "COLLEAGUE");

      const input: CreateProductInput = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        priceKobo: Math.round(priceNum * 100),
        category: formData.category,
        mainCategories: mainCats,
        giftType: dept?.giftType || formData.giftType || "LUXURY",
        gender: formData.gender,
        occasions,
        relationships,
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
          </div>

          <div className="grid grid-cols-2 gap-3">
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

            <div className="space-y-1">
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

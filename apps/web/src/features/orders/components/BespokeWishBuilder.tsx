"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Gift,
  Plus,
  Trash2,
  ExternalLink,
  Upload,
  Check,
  Package,
  Truck,
  ShieldCheck,
  Send,
  Loader2,
  Calendar,
  ArrowRight,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { SavedAddressSelector } from "./SavedAddressSelector";
import { useCreateBespokeWishPackage } from "../hooks/useOrders";
import { uploadMediaFile } from "@/features/events/api";
import { useAuthStore } from "@/stores/auth-store";
import type {
  BespokeWishCategory,
  BespokeWrapStyle,
  BespokeWishItem,
  SavedAddress,
} from "@givvly/contracts";

const OCCASIONS = [
  "Birthday Celebration",
  "Wedding & Nuptials",
  "Anniversary",
  "Housewarming",
  "Baby Shower & Arrival",
  "Graduation & Milestone",
  "Career Promotion",
  "Valentine & Romance",
  "Just Because / Appreciation",
];

const CATEGORIES: Array<{ key: BespokeWishCategory; label: string; icon: string }> = [
  { key: "TECH_GADGETS", label: "Tech & Gadgets", icon: "💻" },
  { key: "FASHION_JEWELRY", label: "Fashion & Jewelry", icon: "👜" },
  { key: "BEAUTY_PERFUME", label: "Beauty & Fragrance", icon: "✨" },
  { key: "HOME_LIVING", label: "Home & Living", icon: "🏡" },
  { key: "GOURMET_DRINKS", label: "Gourmet & Fine Drinks", icon: "🥂" },
  { key: "BOOKS_KEEPSAKES", label: "Watches & Keepsakes", icon: "⌚" },
  { key: "EXPERIENTIAL", label: "Experiences & Dining", icon: "🎟️" },
  { key: "OTHER", label: "Bespoke Request", icon: "🎁" },
];

const PACKAGING_OPTIONS: Array<{
  style: BespokeWrapStyle;
  title: string;
  tagline: string;
  feeText: string;
  description: string;
  colorBorder: string;
  accentBg: string;
}> = [
  {
    style: "SIGNATURE_VELVET_BOX",
    title: "Signature Velvet Keepsake Box",
    tagline: "Givvly's most coveted presentation",
    feeText: "+₦12,500",
    description:
      "Handmade luxury emerald or burgundy velvet box with foil hot-stamping, pure silk ribbon, and hand-poured metallic wax seal.",
    colorBorder: "border-primary/40",
    accentBg: "bg-primary/10",
  },
  {
    style: "WOODEN_KEEPSAKE_CRATE",
    title: "Artisanal Celebration Wooden Chest",
    tagline: "Rustic luxury keepsake to keep forever",
    feeText: "+₦18,000",
    description:
      "Solid pine wooden trunk with slide-out acrylic lid, nestled inside natural wood shavings and adorned with dried florals.",
    colorBorder: "border-amber-500/40",
    accentBg: "bg-amber-500/10",
  },
  {
    style: "MINIMALIST_SATIN_WRAP",
    title: "Eco-Luxe Satin & Cotton Wrap",
    tagline: "Clean, organic, contemporary elegance",
    feeText: "+₦5,000",
    description:
      "Heavyweight textured cotton paper wrapping secured with raw satin ribbon and a fragrant dried botanical sprig.",
    colorBorder: "border-emerald-500/40",
    accentBg: "bg-emerald-500/10",
  },
  {
    style: "STANDARD_GIFT_BAG",
    title: "Standard Givvly Presentation Box",
    tagline: "Clean and safe delivery packaging",
    feeText: "Included Free",
    description:
      "Signature matte finish protective packaging with customized Givvly tissue and cushioned protective interior.",
    colorBorder: "border-border",
    accentBg: "bg-muted/40",
  },
];

type ItemFormState = {
  id: string;
  title: string;
  category: BespokeWishCategory;
  qty: number;
  targetBudgetHint: string;
  inspirationUrl: string;
  specs: string;
  imageUrl: string;
  uploadingImage?: boolean;
};

export function BespokeWishBuilder() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const createMutation = useCreateBespokeWishPackage();

  // Occasion & Recipient
  const [occasion, setOccasion] = React.useState("Birthday Celebration");
  const [recipientName, setRecipientName] = React.useState("");
  const [recipientPhone, setRecipientPhone] = React.useState("");
  const [recipientEmail, setRecipientEmail] = React.useState("");

  // Delivery
  const [selectedAddressId, setSelectedAddressId] = React.useState<string | null>(null);
  const [street, setStreet] = React.useState("");
  const [area, setArea] = React.useState("");
  const [city, setCity] = React.useState("Lagos");
  const [state, setState] = React.useState("Lagos");

  // Buyer Info
  const [buyerName, setBuyerName] = React.useState(user?.name ?? "");
  const [buyerEmail, setBuyerEmail] = React.useState(user?.email ?? "");
  const [buyerPhone, setBuyerPhone] = React.useState(user?.phone ?? "");

  // Packaging & Notes
  const [wrapStyle, setWrapStyle] = React.useState<BespokeWrapStyle>("SIGNATURE_VELVET_BOX");
  const [giftNote, setGiftNote] = React.useState("");
  const [packageBudgetHint, setPackageBudgetHint] = React.useState("");

  // Items
  const [items, setItems] = React.useState<ItemFormState[]>([
    {
      id: "item_1",
      title: "",
      category: "TECH_GADGETS",
      qty: 1,
      targetBudgetHint: "",
      inspirationUrl: "",
      specs: "",
      imageUrl: "",
    },
  ]);

  // Sync auth state if user logs in or profile changes
  React.useEffect(() => {
    if (user) {
      if (!buyerName && user.name) setBuyerName(user.name);
      if (!buyerEmail && user.email) setBuyerEmail(user.email);
      if (!buyerPhone && user.phone) setBuyerPhone(user.phone);
    }
  }, [user]);

  const handleSelectSavedAddress = (addr: SavedAddress) => {
    setSelectedAddressId(addr.id);
    setStreet(addr.street);
    setArea(addr.area || "");
    setCity(addr.city);
    setState(addr.state);
    if (addr.recipientName) setRecipientName(addr.recipientName);
    if (addr.recipientPhone) setRecipientPhone(addr.recipientPhone);
  };

  const handleClearAddressSelection = () => {
    setSelectedAddressId(null);
  };

  const handleAddItem = () => {
    if (items.length >= 10) {
      toast.error("You can add up to 10 items in a single bespoke package.");
      return;
    }
    setItems((prev) => [
      ...prev,
      {
        id: `item_${Date.now()}`,
        title: "",
        category: "TECH_GADGETS",
        qty: 1,
        targetBudgetHint: "",
        inspirationUrl: "",
        specs: "",
        imageUrl: "",
      },
    ]);
  };

  const handleRemoveItem = (id: string) => {
    if (items.length <= 1) {
      toast.error("Your wish package must contain at least one item.");
      return;
    }
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  const handleUpdateItem = (id: string, updates: Partial<ItemFormState>) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, ...updates } : it))
    );
  };

  const handleUploadItemImage = async (id: string, file: File) => {
    try {
      handleUpdateItem(id, { uploadingImage: true });
      const uploaded = await uploadMediaFile(file, "PRODUCT");
      handleUpdateItem(id, {
        imageUrl: uploaded.url,
        uploadingImage: false,
      });
      toast.success("Reference photo attached!");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to upload image";
      toast.error(msg);
      handleUpdateItem(id, { uploadingImage: false });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    const trimmedBuyerName = buyerName.trim();
    if (!trimmedBuyerName || trimmedBuyerName.length < 2) {
      toast.error("Please enter your name (at least 2 characters).");
      return;
    }

    const trimmedBuyerEmail = buyerEmail.trim();
    if (!trimmedBuyerEmail || !trimmedBuyerEmail.includes("@")) {
      toast.error("Please enter a valid email address so we can send your quotation.");
      return;
    }

    const trimmedBuyerPhone = buyerPhone.trim();
    if (!trimmedBuyerPhone || trimmedBuyerPhone.length < 7) {
      toast.error("Please enter a valid phone number for concierge coordination.");
      return;
    }

    const trimmedRecipientName = recipientName.trim();
    if (!trimmedRecipientName || trimmedRecipientName.length < 2) {
      toast.error("Please provide the recipient's full name.");
      return;
    }

    const trimmedRecipientPhone = recipientPhone.trim() || trimmedBuyerPhone;

    if (!street.trim() || !city.trim() || !state.trim()) {
      toast.error("Please complete the delivery address (Street, City, State).");
      return;
    }

    const validItems: BespokeWishItem[] = [];
    for (const item of items) {
      const trimmedTitle = item.title.trim();
      if (!trimmedTitle) {
        toast.error("All wish items must have a title or description.");
        return;
      }
      validItems.push({
        title: trimmedTitle,
        category: item.category,
        qty: Math.max(1, item.qty),
        inspirationUrl: item.inspirationUrl.trim() || undefined,
        specs: item.specs.trim() || undefined,
        imageUrl: item.imageUrl.trim() || undefined,
        targetBudgetHint: item.targetBudgetHint.trim() || undefined,
      });
    }

    try {
      const result = await createMutation.mutateAsync({
        buyerName: trimmedBuyerName,
        buyerEmail: trimmedBuyerEmail,
        buyerPhone: trimmedBuyerPhone,
        recipientName: trimmedRecipientName,
        recipientPhone: trimmedRecipientPhone,
        recipientEmail: recipientEmail.trim() || undefined,
        street: street.trim(),
        area: area.trim() || street.trim(),
        city: city.trim(),
        state: state.trim(),
        occasion,
        wrapStyle,
        giftNote: giftNote.trim() || undefined,
        targetBudgetHint: packageBudgetHint.trim() || undefined,
        items: validItems,
      });

      toast.success("Your Bespoke Wish Package has been submitted!");
      router.push(`/orders/quote/${result.trackingToken}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to submit wish package";
      toast.error(msg);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-4xl space-y-8 pb-16">
      {/* Intro Hero Card */}
      <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-background p-6 sm:p-10 shadow-soft">
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1 text-xs font-semibold text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            Givvly Concierge Wish Package
          </div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground sm:text-4xl">
            Design Your Bespoke Gift Package
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
            Can&apos;t find exactly what you want in standard stores? Describe the exact
            gift items you desire — with store links, screenshots, or custom specs.
            Our concierge team will verify availability, source authentic items,
            package them in Givvly luxury presentation, and send you an itemized
            quote to approve and pay. No celebration event required!
          </p>
          <div className="flex flex-wrap gap-4 pt-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-primary" />
              100% Authentic Sourcing
            </span>
            <span className="flex items-center gap-1.5">
              <Package className="h-4 w-4 text-primary" />
              Luxury Keepsake Packaging
            </span>
            <span className="flex items-center gap-1.5">
              <Truck className="h-4 w-4 text-primary" />
              Doorstep Hand-Delivery
            </span>
          </div>
        </div>
      </div>

      {/* Step 1: Occasion & Recipient */}
      <Card className="rounded-2xl border border-border/80 bg-card shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2 text-primary">
            <Calendar className="h-5 w-5" />
            <CardTitle className="text-lg">1. The Celebration & Recipient</CardTitle>
          </div>
          <CardDescription>
            Tell us about the milestone and who will be receiving this gift.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div>
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              What is the celebration?
            </Label>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {OCCASIONS.map((occ) => (
                <button
                  type="button"
                  key={occ}
                  onClick={() => setOccasion(occ)}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-all ${
                    occasion === occ
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {occ}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="recipientName">Recipient&apos;s Full Name *</Label>
              <Input
                id="recipientName"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                placeholder="e.g. Folake Adebayo"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="recipientPhone">Recipient&apos;s Phone (for delivery) *</Label>
              <Input
                id="recipientPhone"
                value={recipientPhone}
                onChange={(e) => setRecipientPhone(e.target.value)}
                placeholder="e.g. 08031234567"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="packageBudgetHint">
              Estimated Target Budget (Optional)
            </Label>
            <Input
              id="packageBudgetHint"
              value={packageBudgetHint}
              onChange={(e) => setPackageBudgetHint(e.target.value)}
              placeholder="e.g. ₦150,000 - ₦250,000 (Helps concierge select ideal specs)"
            />
            <p className="text-[11px] text-muted-foreground">
              This helps our concierge recommend the best models or suppliers that match your expectations.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Step 2: The Gift Wish Items */}
      <Card className="rounded-2xl border border-border/80 bg-card shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-primary">
              <Gift className="h-5 w-5" />
              <CardTitle className="text-lg">2. Gift Items in This Package</CardTitle>
            </div>
            <Badge variant="outline" className="text-xs">
              {items.length} of 10 items
            </Badge>
          </div>
          <CardDescription>
            Add the custom items you want our concierge to procure. You can include links, specifications, or photos.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {items.map((item, index) => (
            <div
              key={item.id}
              className="relative rounded-2xl border border-border/70 bg-muted/20 p-4 sm:p-5 transition-all hover:border-primary/30"
            >
              <div className="flex items-center justify-between pb-3 border-b border-border/60">
                <span className="flex items-center gap-2 text-xs font-bold text-foreground">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">
                    {index + 1}
                  </span>
                  Item #{index + 1}
                </span>
                {items.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveItem(item.id)}
                    className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="mr-1 h-3.5 w-3.5" />
                    Remove
                  </Button>
                )}
              </div>

              <div className="mt-4 space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="sm:col-span-2 space-y-1.5">
                    <Label htmlFor={`item-title-${item.id}`}>Item Title or Description *</Label>
                    <Input
                      id={`item-title-${item.id}`}
                      value={item.title}
                      onChange={(e) =>
                        handleUpdateItem(item.id, { title: e.target.value })
                      }
                      placeholder="e.g. Dyson Airwrap Multi-Styler Strawberry Bronze"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label>Quantity</Label>
                    <Input
                      type="number"
                      min={1}
                      max={10}
                      value={item.qty}
                      onChange={(e) =>
                        handleUpdateItem(item.id, {
                          qty: parseInt(e.target.value) || 1,
                        })
                      }
                    />
                  </div>
                </div>

                {/* Category Selector */}
                <div>
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Category
                  </Label>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {CATEGORIES.map((cat) => (
                      <button
                        type="button"
                        key={cat.key}
                        onClick={() =>
                          handleUpdateItem(item.id, { category: cat.key })
                        }
                        className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
                          item.category === cat.key
                            ? "bg-primary text-primary-foreground shadow-xs"
                            : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground"
                        }`}
                      >
                        <span>{cat.icon}</span>
                        <span>{cat.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Reference Link & Target Budget */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label
                      htmlFor={`item-link-${item.id}`}
                      className="inline-flex items-center gap-1 text-xs"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Reference Store Link (Optional)
                    </Label>
                    <Input
                      id={`item-link-${item.id}`}
                      value={item.inspirationUrl}
                      onChange={(e) =>
                        handleUpdateItem(item.id, { inspirationUrl: e.target.value })
                      }
                      placeholder="https://amazon.com/... or Instagram link"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label
                      htmlFor={`item-budget-${item.id}`}
                      className="text-xs"
                    >
                      Target Budget (Optional)
                    </Label>
                    <Input
                      id={`item-budget-${item.id}`}
                      value={item.targetBudgetHint}
                      onChange={(e) =>
                        handleUpdateItem(item.id, {
                          targetBudgetHint: e.target.value,
                        })
                      }
                      placeholder="e.g. ~₦120,000"
                    />
                  </div>
                </div>

                {/* Specs / Options */}
                <div className="space-y-1.5">
                  <Label htmlFor={`item-specs-${item.id}`} className="text-xs">
                    Specifications & Special Instructions (Size, Color, Monogram, etc.)
                  </Label>
                  <Textarea
                    id={`item-specs-${item.id}`}
                    rows={2}
                    value={item.specs}
                    onChange={(e) =>
                      handleUpdateItem(item.id, { specs: e.target.value })
                    }
                    placeholder="e.g. Size 42 EU, Midnight Navy color, include original gift receipt if possible."
                  />
                </div>

                {/* Reference Photo Upload or URL */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground">
                    Inspiration / Reference Photo (Optional)
                  </Label>
                  <div className="flex flex-wrap items-center gap-3">
                    {item.imageUrl ? (
                      <div className="relative h-16 w-16 overflow-hidden rounded-xl border border-primary/30">
                        <img
                          src={item.imageUrl}
                          alt="Reference preview"
                          className="h-full w-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            handleUpdateItem(item.id, { imageUrl: "" })
                          }
                          className="absolute right-1 top-1 rounded-full bg-black/60 p-0.5 text-white hover:bg-black"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <label className="flex h-16 cursor-pointer items-center gap-2 rounded-xl border border-dashed border-border px-4 py-2 hover:border-primary/50 hover:bg-muted/30">
                        {item.uploadingImage ? (
                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        ) : (
                          <Upload className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className="text-xs font-medium text-muted-foreground">
                          {item.uploadingImage ? "Uploading..." : "Upload photo"}
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={item.uploadingImage}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleUploadItemImage(item.id, file);
                          }}
                        />
                      </label>
                    )}
                    <span className="text-xs text-muted-foreground">or</span>
                    <Input
                      value={item.imageUrl}
                      onChange={(e) =>
                        handleUpdateItem(item.id, {
                          imageUrl: e.target.value,
                        })
                      }
                      placeholder="Paste image URL directly"
                      className="h-9 max-w-xs text-xs"
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}

          {items.length < 10 && (
            <Button
              type="button"
              variant="outline"
              onClick={handleAddItem}
              className="w-full border-dashed border-primary/30 text-primary hover:bg-primary/5"
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Add Another Gift Item to this Package
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Step 3: Givvly Signature Packaging & Calligraphy Note */}
      <Card className="rounded-2xl border border-border/80 bg-card shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2 text-primary">
            <Package className="h-5 w-5" />
            <CardTitle className="text-lg">3. Keepsake Presentation & Handwritten Note</CardTitle>
          </div>
          <CardDescription>
            Every Givvly gift is an unboxing ritual. Choose your presentation style.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {PACKAGING_OPTIONS.map((pkg) => {
              const isSelected = wrapStyle === pkg.style;
              return (
                <div
                  key={pkg.style}
                  onClick={() => setWrapStyle(pkg.style)}
                  className={`cursor-pointer rounded-2xl border p-4 transition-all ${
                    isSelected
                      ? `${pkg.colorBorder} ${pkg.accentBg} ring-2 ring-primary/20 shadow-xs`
                      : "border-border/80 hover:border-border hover:bg-muted/20"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-foreground">
                        {pkg.title}
                      </h4>
                      <p className="text-xs font-medium text-primary mt-0.5">
                        {pkg.feeText}
                      </p>
                    </div>
                    <div
                      className={`flex h-5 w-5 items-center justify-center rounded-full border ${
                        isSelected
                          ? "border-primary bg-primary text-white"
                          : "border-muted-foreground/30"
                      }`}
                    >
                      {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                    </div>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    {pkg.description}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Handwritten Card Message */}
          <div className="space-y-2 rounded-2xl border border-primary/20 bg-primary/5 p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <Label htmlFor="giftNote" className="font-semibold text-foreground text-xs sm:text-sm">
                Handwritten Calligraphy Card Note (Included Free)
              </Label>
              <span className="text-[11px] text-muted-foreground">
                {giftNote.length} / 500 chars
              </span>
            </div>
            <Textarea
              id="giftNote"
              rows={3}
              maxLength={500}
              value={giftNote}
              onChange={(e) => setGiftNote(e.target.value)}
              placeholder="e.g. Dearest Folake, wishing you a birthday as brilliant and graceful as you are. Enjoy every single moment of this new milestone! All our love, David & Anita."
              className="bg-card text-xs sm:text-sm"
            />
            <p className="text-[11px] text-muted-foreground">
              Our calligraphy artisans will handwrite your message on premium 350gsm hot-pressed cotton paper sealed with gold foil wax.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Step 4: Delivery Destination & Presaved Addresses */}
      <Card className="rounded-2xl border border-border/80 bg-card shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2 text-primary">
            <Truck className="h-5 w-5" />
            <CardTitle className="text-lg">4. Delivery Destination</CardTitle>
          </div>
          <CardDescription>
            Where should our concierge dispatch the package once ready?
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Saved Addresses integration */}
          <SavedAddressSelector
            selectedAddressId={selectedAddressId}
            onSelectAddress={handleSelectSavedAddress}
            onClearSelection={handleClearAddressSelection}
          />

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="street">Street Address *</Label>
              <Input
                id="street"
                value={street}
                onChange={(e) => {
                  setStreet(e.target.value);
                  setSelectedAddressId(null);
                }}
                placeholder="e.g. 14 Admiralty Way, Flat 3B"
                required
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="area">Area / Estate</Label>
                <Input
                  id="area"
                  value={area}
                  onChange={(e) => {
                    setArea(e.target.value);
                    setSelectedAddressId(null);
                  }}
                  placeholder="e.g. Lekki Phase 1"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  value={city}
                  onChange={(e) => {
                    setCity(e.target.value);
                    setSelectedAddressId(null);
                  }}
                  placeholder="e.g. Lagos"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="state">State *</Label>
                <Input
                  id="state"
                  value={state}
                  onChange={(e) => {
                    setState(e.target.value);
                    setSelectedAddressId(null);
                  }}
                  placeholder="e.g. Lagos"
                  required
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Step 5: Contact Info for Quotation Delivery */}
      <Card className="rounded-2xl border border-border/80 bg-card shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2 text-primary">
            <Send className="h-5 w-5" />
            <CardTitle className="text-lg">5. Where should we send your quote?</CardTitle>
          </div>
          <CardDescription>
            We will email you a private itemized quote link with payment instructions.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="buyerName">Your Name *</Label>
              <Input
                id="buyerName"
                value={buyerName}
                onChange={(e) => setBuyerName(e.target.value)}
                placeholder="e.g. David Enabulele"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="buyerEmail">Your Email *</Label>
              <Input
                id="buyerEmail"
                type="email"
                value={buyerEmail}
                onChange={(e) => setBuyerEmail(e.target.value)}
                placeholder="e.g. david@example.com"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="buyerPhone">WhatsApp / Phone *</Label>
              <Input
                id="buyerPhone"
                value={buyerPhone}
                onChange={(e) => setBuyerPhone(e.target.value)}
                placeholder="e.g. 08020000000"
                required
              />
            </div>
          </div>

          <div className="rounded-xl bg-muted/40 p-4 text-xs text-muted-foreground flex items-start gap-2.5">
            <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-foreground">How this works:</p>
              <p className="mt-0.5 leading-relaxed">
                1. Submit your custom wish package today (zero charge).
                <br />
                2. Our concierge sources authentic pricing and verified delivery timelines.
                <br />
                3. You receive an itemized quote link via email to review, adjust, and pay via Paystack.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Submit Action Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl border border-primary/20 bg-card p-5 shadow-soft">
        <div>
          <h4 className="font-heading font-bold text-foreground">
            Ready to submit {items.length} item{items.length === 1 ? "" : "s"}?
          </h4>
          <p className="text-xs text-muted-foreground">
            No upfront payment needed. We will prepare your bespoke quotation.
          </p>
        </div>

        <Button
          type="submit"
          size="lg"
          disabled={createMutation.isPending}
          className="w-full sm:w-auto min-w-[220px] font-semibold shadow-md"
        >
          {createMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Submitting Package...
            </>
          ) : (
            <>
              Send for Concierge Quote
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

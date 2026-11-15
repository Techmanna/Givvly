"use client";

import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, RefreshCw, Search, ShoppingBag, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { useCatalogProducts } from "@/features/catalog";
import type { CatalogProduct } from "@/features/catalog/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { Money } from "@/components/shared/Money";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { nairaToKobo } from "@/lib/format";
import {
  useCreateRegistryEntryMutation,
  useDeleteRegistryEntryMutation,
  useOwnerRegistry,
  useUpdateRegistryEntryMutation,
} from "../hooks/useRegistry";
import { createRegistryItemSchema } from "../schemas";
import type { CreateRegistryItemInput } from "../types";

export type OwnerRegistryManagerProps = {
  eventId: string;
};

function CatalogProductPicker({
  selectedProductId,
  onSelect,
  onClose,
}: {
  selectedProductId?: string;
  onSelect: (product: CatalogProduct) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const productsQuery = useCatalogProducts({
    q: search.trim() || undefined,
  });

  const products = (productsQuery.data ?? []).slice(0, 24);

  return (
    <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-3.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Givvly catalog products
        </p>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-7 px-2 text-xs"
          onClick={onClose}
        >
          <X className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
          Close
        </Button>
      </div>

      <div className="relative">
        <Search
          className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search Givvly products..."
          className="h-8 pl-8 text-xs"
        />
      </div>

      {productsQuery.isLoading ? (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : products.length === 0 ? (
        <p className="py-3 text-center text-xs text-muted-foreground">
          No matching Givvly products found.
        </p>
      ) : (
        <div className="grid max-h-64 grid-cols-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
          {products.map((product) => {
            const isSelected = product.id === selectedProductId;
            return (
              <button
                key={product.id}
                type="button"
                onClick={() => onSelect(product)}
                className={`flex items-center gap-3 rounded-md border p-2 text-left transition-colors ${
                  isSelected
                    ? "border-primary bg-primary/5"
                    : "border-border bg-background hover:border-primary/40"
                }`}
              >
                {product.imageUrl ? (
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="h-11 w-11 shrink-0 rounded object-cover"
                  />
                ) : (
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded bg-muted">
                    <ShoppingBag
                      className="h-4 w-4 text-muted-foreground"
                      aria-hidden="true"
                    />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-foreground">
                    {product.name}
                  </p>
                  <p className="text-xs font-semibold text-primary">
                    <Money amountKobo={product.priceKobo} />
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function OwnerRegistryManager({ eventId }: OwnerRegistryManagerProps) {
  const registryQuery = useOwnerRegistry(eventId);
  const createMutation = useCreateRegistryEntryMutation(eventId);
  const deleteMutation = useDeleteRegistryEntryMutation(eventId);
  const updateMutation = useUpdateRegistryEntryMutation(eventId);
  const [showCatalogPicker, setShowCatalogPicker] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<CatalogProduct | null>(
    null
  );

  const form = useForm<
    {
      title: string;
      priceNaira: number;
      isPool?: boolean;
      poolMode?: "PRODUCT" | "CASH";
      deadline?: string;
    },
    unknown,
    CreateRegistryItemInput
  >({
    resolver: zodResolver(createRegistryItemSchema),
    mode: "onBlur",
    defaultValues: {
      title: "",
      priceNaira: 50_000,
      isPool: false,
      poolMode: "CASH",
      deadline: "",
    },
  });

  const watchedIsPool = useWatch({ control: form.control, name: "isPool" });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await createMutation.mutateAsync({
        title: values.title.trim(),
        priceKobo: nairaToKobo(values.priceNaira),
        productId: selectedProduct?.id,
        isPool: values.isPool,
        poolMode: selectedProduct ? "PRODUCT" : values.poolMode,
        deadline: values.deadline || undefined,
      });
      toast.success(
        values.isPool
          ? "Group gift pool added to your event."
          : "Registry item added to your event."
      );
      setSelectedProduct(null);
      form.reset({
        title: "",
        priceNaira: 50_000,
        isPool: false,
        poolMode: "CASH",
        deadline: "",
      });
    } catch {
      toast.error("Could not add registry item. Please try again.");
    }
  });

  if (registryQuery.isLoading) {
    return (
      <div className="space-y-4" aria-busy="true">
        <Skeleton className="h-44 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (registryQuery.isError || !registryQuery.data) {
    return (
      <ErrorState
        title="Could not load registry"
        description="Check your connection and try again."
        onRetry={() => registryQuery.refetch()}
      />
    );
  }

  const { registry, pools } = registryQuery.data;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-heading text-xl font-semibold text-foreground">
          Registry and group gifts
        </h2>
        <p className="text-sm text-muted-foreground">
          Manage individual registry items (up to 50) and pooled group gifts.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <CardTitle className="text-base">
                Add registry item or group gift pool
              </CardTitle>
              <CardDescription>
                Add a custom item/fund or optionally pick a Givvly catalog
                product (₦500 – ₦5,000,000).
              </CardDescription>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setShowCatalogPicker((prev) => !prev)}
            >
              <ShoppingBag className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
              {showCatalogPicker
                ? "Hide Givvly catalog"
                : "Pick from Givvly catalog"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {showCatalogPicker ? (
            <CatalogProductPicker
              selectedProductId={selectedProduct?.id}
              onSelect={(product) => {
                setSelectedProduct(product);
                form.setValue("title", product.name.slice(0, 80), {
                  shouldValidate: true,
                });
                form.setValue(
                  "priceNaira",
                  Math.max(500, Math.round(product.priceKobo / 100)),
                  { shouldValidate: true }
                );
                setShowCatalogPicker(false);
              }}
              onClose={() => setShowCatalogPicker(false)}
            />
          ) : null}

          {selectedProduct ? (
            <div className="flex items-center justify-between gap-2 rounded-md border border-primary/25 bg-primary/5 px-3 py-2 text-xs">
              <span className="truncate font-medium text-foreground">
                Linked Givvly product: <strong>{selectedProduct.name}</strong>
              </span>
              <button
                type="button"
                onClick={() => setSelectedProduct(null)}
                className="shrink-0 font-medium text-primary hover:underline"
              >
                Clear
              </button>
            </div>
          ) : null}

          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="reg-item-title">Item or fund title</Label>
                <Input
                  id="reg-item-title"
                  maxLength={80}
                  {...form.register("title")}
                />
                {form.formState.errors.title ? (
                  <p className="text-xs text-destructive" role="alert">
                    {form.formState.errors.title.message}
                  </p>
                ) : null}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="reg-item-price">Target price (₦)</Label>
                <Input
                  id="reg-item-price"
                  type="number"
                  min={500}
                  max={5_000_000}
                  {...form.register("priceNaira")}
                />
                {form.formState.errors.priceNaira ? (
                  <p className="text-xs text-destructive" role="alert">
                    {form.formState.errors.priceNaira.message}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="reg-is-pool"
                checked={Boolean(watchedIsPool)}
                onCheckedChange={(checked) =>
                  form.setValue("isPool", Boolean(checked))
                }
              />
              <Label htmlFor="reg-is-pool" className="cursor-pointer text-xs">
                Make this a group gift pool (multiple guests contribute toward
                the goal)
              </Label>
            </div>

            <Button type="submit" size="sm" disabled={createMutation.isPending}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              <span>
                {createMutation.isPending
                  ? "Adding..."
                  : watchedIsPool
                    ? "Add group gift pool"
                    : "Add registry item"}
              </span>
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Group Gift Pools */}
      <section className="space-y-3">
        <h3 className="font-heading text-lg font-semibold text-foreground">
          Group gift pools ({pools.length})
        </h3>
        {pools.length === 0 ? (
          <EmptyState
            title="No group gift pools yet"
            description="Create a pool above so guests can chip in together for big-ticket items or a honeymoon fund."
          />
        ) : (
          <div className="space-y-3">
            {pools.map((pool) => {
              const pct =
                pool.targetKobo > 0
                  ? Math.min(
                      100,
                      Math.round((pool.raisedKobo / pool.targetKobo) * 100)
                    )
                  : 0;
              const isUnderfunded = pool.raisedKobo < pool.targetKobo;

              return (
                <Card key={pool.id}>
                  <CardContent className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-foreground">
                          {pool.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          <Money amountKobo={pool.raisedKobo} /> of{" "}
                          <Money amountKobo={pool.targetKobo} /> ({pct}%) · Mode:{" "}
                          {pool.mode}
                        </p>
                      </div>
                      <Badge
                        variant={
                          pool.raisedKobo >= pool.targetKobo
                            ? "success"
                            : "outline"
                        }
                      >
                        {pool.raisedKobo >= pool.targetKobo
                          ? "Order placed"
                          : "Open"}
                      </Badge>
                    </div>

                    <Progress value={pct} />

                    <div className="flex flex-wrap items-center justify-between gap-2">
                      {isUnderfunded && pool.mode === "PRODUCT" ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            updateMutation.mutate(
                              { itemId: pool.id, mode: "CASH" },
                              {
                                onSuccess: () =>
                                  toast.success(
                                    "Pool converted to cash payout."
                                  ),
                              }
                            );
                          }}
                        >
                          <RefreshCw
                            className="h-3.5 w-3.5"
                            aria-hidden="true"
                          />
                          <span>Convert to cash</span>
                        </Button>
                      ) : (
                        <span />
                      )}

                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() =>
                          deleteMutation.mutate(pool.id, {
                            onSuccess: () =>
                              toast.success("Group gift pool removed."),
                          })
                        }
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Remove</span>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* Standard Registry Items */}
      <section className="space-y-3">
        <h3 className="font-heading text-lg font-semibold text-foreground">
          Registry items ({registry.length})
        </h3>
        {registry.length === 0 ? (
          <EmptyState
            title="No individual registry items"
            description="Add items above for guests to reserve and buy."
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {registry.map((item) => (
              <Card key={item.id}>
                <CardContent className="flex items-center justify-between gap-3 p-4">
                  <div>
                    <p className="font-medium text-foreground">{item.title}</p>
                    <p className="text-xs font-semibold text-primary">
                      <Money amountKobo={item.priceKobo} />
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={item.status} />
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      aria-label={`Remove ${item.title}`}
                      onClick={() =>
                        deleteMutation.mutate(item.id, {
                          onSuccess: () =>
                            toast.success("Registry item removed."),
                        })
                      }
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}


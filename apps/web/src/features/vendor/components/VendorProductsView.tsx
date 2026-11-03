"use client";

import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Money } from "@/components/shared/Money";
import { Badge } from "@/components/ui/badge";
import { vendorProductSchema } from "../schemas";
import {
  useCreateVendorProduct,
  useToggleVendorProductStock,
  useVendorProducts,
} from "../hooks/useVendor";
import type { VendorProductInput } from "../types";

type VendorProductFormValues = Omit<VendorProductInput, "inStock"> & {
  inStock?: boolean;
};

export function VendorProductsView() {
  const { data: products = [], isLoading } = useVendorProducts();
  const createMutation = useCreateVendorProduct();
  const toggleStockMutation = useToggleVendorProductStock();

  const form = useForm<VendorProductFormValues, unknown, VendorProductInput>({
    resolver: zodResolver(vendorProductSchema),
    defaultValues: {
      name: "",
      description: "",
      priceNaira: 45_000,
      category: "Hampers",
      inStock: true,
    },
  });

  const inStock = useWatch({ control: form.control, name: "inStock" }) ?? true;

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await createMutation.mutateAsync(values);
      form.reset({
        name: "",
        description: "",
        priceNaira: 45_000,
        category: "Hampers",
        inStock: true,
      });
      toast.success("Product added to catalog");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not add product."
      );
    }
  });

  return (
    <div className="grid gap-8 lg:grid-cols-[360px_1fr]">
      <Card className="h-fit">
        <CardHeader>
          <CardTitle className="font-display text-lg">
            Add New Catalog Product
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="vendor-prod-name">Product name</Label>
              <Input
                id="vendor-prod-name"
                placeholder="e.g. Royal Champagne & Truffle Box"
                {...form.register("name")}
              />
              {form.formState.errors.name && (
                <p role="alert" className="text-xs text-danger">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="vendor-prod-price">Price (₦)</Label>
                <Input
                  id="vendor-prod-price"
                  type="number"
                  min={1000}
                  {...form.register("priceNaira", { valueAsNumber: true })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="vendor-prod-cat">Category</Label>
                <Input
                  id="vendor-prod-cat"
                  placeholder="Hampers"
                  {...form.register("category")}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="vendor-prod-desc">Description</Label>
              <Textarea
                id="vendor-prod-desc"
                rows={3}
                placeholder="Describe contents, dimensions, and packaging..."
                {...form.register("description")}
              />
              {form.formState.errors.description && (
                <p role="alert" className="text-xs text-danger">
                  {form.formState.errors.description.message}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between rounded-xl border border-border bg-surface-subtle p-3">
              <Label htmlFor="vendor-prod-stock" className="text-sm">
                Available in stock
              </Label>
              <Switch
                id="vendor-prod-stock"
                checked={inStock}
                onCheckedChange={(checked) =>
                  form.setValue("inStock", checked)
                }
              />
            </div>

            <Button
              type="submit"
              className="w-full gap-1.5"
              disabled={createMutation.isPending}
            >
              <Plus className="h-4 w-4" />
              {createMutation.isPending ? "Saving..." : "Publish Product"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {isLoading ? (
          <div className="h-48 animate-pulse rounded-2xl border border-border bg-surface-subtle" />
        ) : (
          products.map((product) => (
            <Card key={product.id}>
              <CardContent className="flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{product.category}</Badge>
                    <Badge variant={product.inStock ? "success" : "secondary"}>
                      {product.inStock ? "In stock" : "Out of stock"}
                    </Badge>
                  </div>
                  <p className="font-display text-lg font-semibold text-ink">
                    {product.name}
                  </p>
                  <p className="text-xs text-ink-muted line-clamp-2">
                    {product.description}
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  <Money
                    amountKobo={product.priceKobo}
                    className="font-display text-lg font-semibold text-ink"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      toggleStockMutation.mutate({
                        productId: product.id,
                        inStock: !product.inStock,
                      })
                    }
                  >
                    {product.inStock ? "Mark Sold Out" : "Restock"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}


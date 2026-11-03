"use client";

import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
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

export function OwnerRegistryManager({ eventId }: OwnerRegistryManagerProps) {
  const registryQuery = useOwnerRegistry(eventId);
  const createMutation = useCreateRegistryEntryMutation(eventId);
  const deleteMutation = useDeleteRegistryEntryMutation(eventId);
  const updateMutation = useUpdateRegistryEntryMutation(eventId);

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
        isPool: values.isPool,
        poolMode: values.poolMode,
        deadline: values.deadline || undefined,
      });
      toast.success(
        values.isPool
          ? "Group gift pool added to your event."
          : "Registry item added to your event."
      );
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
          <CardTitle className="text-base">
            Add registry item or group gift pool
          </CardTitle>
          <CardDescription>
            Target price between ₦500 and ₦5,000,000.
          </CardDescription>
        </CardHeader>
        <CardContent>
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


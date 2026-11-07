"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Calendar, CheckCircle2, Users } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Money } from "@/components/shared/Money";
import { ApiClientError } from "@/lib/api-client";
import { formatDate, formatNaira, nairaToKobo } from "@/lib/format";
import { useGiveDraftStore } from "@/stores/give-draft-store";
import { useContributeToPoolMutation } from "../hooks/useRegistry";
import { createPoolContributionSchema } from "../schemas";
import type { PoolContributionInput, PoolItem } from "../types";

export type PoolCardProps = {
  slug: string;
  pool: PoolItem;
};

export function PoolCard({ slug, pool }: PoolCardProps) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formAlert, setFormAlert] = useState<string | null>(null);
  const idempotencyKey = useGiveDraftStore((s) => s.draft.idempotencyKey);
  const rotateIdempotencyKey = useGiveDraftStore((s) => s.rotateIdempotencyKey);

  const contributeMutation = useContributeToPoolMutation(slug);

  const remainingKobo = Math.max(0, pool.targetKobo - pool.raisedKobo);
  const isFunded = remainingKobo === 0 || pool.status === "CLAIMED";
  const progressPercent =
    pool.targetKobo > 0
      ? Math.min(100, Math.round((pool.raisedKobo / pool.targetKobo) * 100))
      : 0;

  const defaultAmountNaira = Math.min(
    10_000,
    Math.max(500, Math.floor(remainingKobo / 100))
  );

  const form = useForm<
    {
      amountNaira: number;
      name?: string;
      email: string;
      message?: string;
      anonymous?: boolean;
    },
    unknown,
    PoolContributionInput
  >({
    resolver: zodResolver(createPoolContributionSchema(remainingKobo)),
    mode: "onBlur",
    defaultValues: {
      amountNaira: defaultAmountNaira,
      name: "",
      email: "",
      message: "",
      anonymous: false,
    },
  });

  const watchedAnonymous = useWatch({
    control: form.control,
    name: "anonymous",
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setFormAlert(null);
    try {
      const payment = await contributeMutation.mutateAsync({
        payload: {
          poolId: pool.id,
          amountKobo: nairaToKobo(values.amountNaira),
          name: values.anonymous ? undefined : values.name?.trim(),
          email: values.email.trim().toLowerCase(),
          message: values.message?.trim() || undefined,
          anonymous: values.anonymous,
        },
        idempotencyKey,
      });

      toast.success("Contribution confirmed!");
      setDialogOpen(false);
      router.push(
        `/e/${slug}/give/success?ref=${encodeURIComponent(payment.reference)}`
      );
    } catch (err) {
      if (err instanceof ApiClientError) {
        if (err.code === "POOL_OVERFUNDED") {
          setFormAlert(
            `Only ${formatNaira(remainingKobo)} remains to fund this group gift.`
          );
          return;
        }
        if (err.code === "PAYMENT_FAILED") {
          rotateIdempotencyKey();
        }
        setFormAlert(err.message);
        return;
      }
      setFormAlert("Check your connection and try again.");
    }
  });

  return (
    <>
      <Card className="shadow-none">
        <CardContent className="space-y-4 p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-semibold text-foreground">{pool.title}</p>
              <p className="text-xs text-muted-foreground">
                Group gift ({pool.mode === "PRODUCT" ? "Product" : "Cash fund"})
              </p>
            </div>
            {isFunded ? (
              <Badge variant="success">
                <CheckCircle2 className="mr-1 h-3 w-3" aria-hidden="true" />
                Order placed
              </Badge>
            ) : (
              <Badge variant="outline">{progressPercent}% funded</Badge>
            )}
          </div>

          <div className="space-y-1.5">
            <Progress
              value={progressPercent}
              aria-label={`${pool.title} funding progress`}
            />
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-foreground">
                <Money amountKobo={pool.raisedKobo} /> raised
              </span>
              <span className="text-muted-foreground">
                of <Money amountKobo={pool.targetKobo} /> goal
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 pt-1">
            {pool.deadline ? (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Closes {formatDate(pool.deadline, "d MMM yyyy")}</span>
              </span>
            ) : (
              <span />
            )}

            <Button
              type="button"
              size="sm"
              disabled={isFunded}
              onClick={() => setDialogOpen(true)}
            >
              <Users className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{isFunded ? "Fully funded" : "Contribute"}</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Contribute to {pool.title}</DialogTitle>
            <DialogDescription>
              Remaining amount:{" "}
              <span className="font-semibold text-foreground">
                {formatNaira(remainingKobo)}
              </span>
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            {formAlert ? (
              <div
                role="alert"
                className="rounded-control border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive"
              >
                {formAlert}
              </div>
            ) : null}

            <div className="space-y-1.5">
              <Label htmlFor={`pool-amount-${pool.id}`}>
                Contribution amount (₦)
              </Label>
              <Input
                id={`pool-amount-${pool.id}`}
                type="number"
                min={500}
                max={Math.floor(remainingKobo / 100)}
                {...form.register("amountNaira")}
              />
              {form.formState.errors.amountNaira ? (
                <p className="text-xs text-destructive" role="alert">
                  {form.formState.errors.amountNaira.message}
                </p>
              ) : null}
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id={`pool-anon-${pool.id}`}
                checked={watchedAnonymous}
                onCheckedChange={(checked) => {
                  const isAnon = Boolean(checked);
                  form.setValue("anonymous", isAnon, {
                    shouldValidate: true,
                  });
                  if (isAnon) {
                    form.clearErrors("name");
                  }
                }}
              />
              <Label
                htmlFor={`pool-anon-${pool.id}`}
                className="cursor-pointer text-xs"
              >
                Contribute anonymously
              </Label>
            </div>

            {!watchedAnonymous ? (
              <div className="space-y-1.5">
                <Label htmlFor={`pool-name-${pool.id}`}>Your name</Label>
                <Input
                  id={`pool-name-${pool.id}`}
                  maxLength={60}
                  {...form.register("name")}
                />
                {form.formState.errors.name ? (
                  <p className="text-xs text-destructive" role="alert">
                    {form.formState.errors.name.message}
                  </p>
                ) : null}
              </div>
            ) : null}

            <div className="space-y-1.5">
              <Label htmlFor={`pool-email-${pool.id}`}>
                Email address (for receipt)
              </Label>
              <Input
                id={`pool-email-${pool.id}`}
                type="email"
                maxLength={254}
                {...form.register("email")}
              />
              {form.formState.errors.email ? (
                <p className="text-xs text-destructive" role="alert">
                  {form.formState.errors.email.message}
                </p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor={`pool-msg-${pool.id}`}>Message (optional)</Label>
              <Textarea
                id={`pool-msg-${pool.id}`}
                rows={2}
                maxLength={500}
                {...form.register("message")}
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={contributeMutation.isPending}>
                {contributeMutation.isPending
                  ? "Processing..."
                  : "Send contribution"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}


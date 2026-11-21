"use client";

import * as React from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Pencil,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import { BankSelect } from "@/components/shared/BankSelect";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { toast } from "@/components/ui/sonner";
import { ApiClientError } from "@/lib/api-client";
import {
  useBanksQuery,
  useDeletePayoutAccountMutation,
  usePayoutAccountQuery,
  useResolveBankAccountMutation,
  useSavePayoutAccountMutation,
} from "../hooks/useEvents";
import { payoutSetupSchema } from "../schemas";
import type { PayoutSetupInput } from "../types";

export function PayoutSetupForm() {
  const banksQuery = useBanksQuery();
  const payoutQuery = usePayoutAccountQuery();
  const resolveMutation = useResolveBankAccountMutation();
  const saveMutation = useSavePayoutAccountMutation();
  const deleteMutation = useDeletePayoutAccountMutation();

  const [resolveError, setResolveError] = React.useState<string | null>(null);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [isEditing, setIsEditing] = React.useState(false);
  const [confirmingDelete, setConfirmingDelete] = React.useState(false);
  const editCardRef = React.useRef<HTMLDivElement>(null);

  const form = useForm<PayoutSetupInput>({
    resolver: zodResolver(payoutSetupSchema),
    defaultValues: {
      bankCode: "",
      accountNumber: "",
      accountName: "",
      confirmedOwnership: false,
    },
  });

  const bankCode = useWatch({ control: form.control, name: "bankCode" });
  const accountNumber = useWatch({
    control: form.control,
    name: "accountNumber",
  });
  const accountName = useWatch({ control: form.control, name: "accountName" });

  React.useEffect(() => {
    if (isEditing && typeof editCardRef.current?.scrollIntoView === "function") {
      editCardRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [isEditing]);

  const handleStartEdit = () => {
    const existing = payoutQuery.data;
    setResolveError(null);
    setFormError(null);
    setConfirmingDelete(false);
    form.reset({
      bankCode: existing?.bankCode ?? "",
      accountNumber: "",
      accountName: "",
      confirmedOwnership: false,
    });
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setResolveError(null);
    setFormError(null);
    form.reset({
      bankCode: "",
      accountNumber: "",
      accountName: "",
      confirmedOwnership: false,
    });
  };

  const handleDeleteAccount = async () => {
    setFormError(null);
    try {
      await deleteMutation.mutateAsync();
      setConfirmingDelete(false);
      setIsEditing(false);
      form.reset({
        bankCode: "",
        accountNumber: "",
        accountName: "",
        confirmedOwnership: false,
      });
      toast.success("Payout account removed.");
    } catch (error) {
      if (error instanceof ApiClientError) {
        toast.error(error.message);
      } else {
        toast.error("Could not delete payout account. Please try again.");
      }
    }
  };

  const triggerResolve = async (bCode: string, accNum: string) => {
    setResolveError(null);
    form.setValue("accountName", "");
    form.setValue("confirmedOwnership", false);

    if (!bCode || !/^\d{10}$/.test(accNum)) {
      return;
    }

    try {
      const resolved = await resolveMutation.mutateAsync({
        bankCode: bCode,
        accountNumber: accNum,
      });
      form.setValue("accountName", resolved.accountName, {
        shouldValidate: true,
      });
    } catch (error) {
      if (error instanceof ApiClientError) {
        setResolveError(
          error.message ||
            "Could not verify this account number. Check the digits or try again."
        );
      } else {
        setResolveError(
          "Bank verification timed out. Please press Retry to try again."
        );
      }
    }
  };

  const onSubmit = async (values: PayoutSetupInput) => {
    setFormError(null);
    try {
      const saved = await saveMutation.mutateAsync(values);
      toast.success(
        saved.status === "VERIFIED"
          ? "Payout details saved. Money gifts are on."
          : "Payout details saved and pending name review."
      );
      setIsEditing(false);
      form.reset({
        bankCode: "",
        accountNumber: "",
        accountName: "",
        confirmedOwnership: false,
      });
    } catch (error) {
      if (error instanceof ApiClientError) {
        setFormError(error.message);
      } else {
        setFormError("Check your connection and try again.");
      }
    }
  };

  if (banksQuery.isLoading || payoutQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full rounded-card" />
        <Skeleton className="h-64 w-full rounded-card" />
      </div>
    );
  }

  const existingAccount = payoutQuery.data;
  const showSetupForm = !existingAccount || isEditing;

  return (
    <div className="space-y-6">
      {existingAccount ? (
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-2">
            <div>
              <CardTitle className="text-lg">Current payout account</CardTitle>
              <CardDescription>{existingAccount.bankName}</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={existingAccount.status} />
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <p className="font-medium text-foreground">
                {existingAccount.accountName}
              </p>
              <p className="font-mono text-muted-foreground">
                ••••••{existingAccount.accountNumberLast4}
              </p>
            </div>
            {existingAccount.status === "VERIFIED" ? (
              <div className="flex items-center gap-2 pt-1 text-xs font-medium text-success">
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                <span>Money gifts on</span>
              </div>
            ) : (
              <div className="flex items-start gap-2 rounded-control bg-warning/10 p-3 text-xs text-foreground">
                <AlertTriangle
                  className="mt-0.5 h-4 w-4 shrink-0 text-warning"
                  aria-hidden="true"
                />
                <span>
                  The bank account name did not match your profile name. Our
                  team is reviewing it manually.
                </span>
              </div>
            )}

            {confirmingDelete ? (
              <div
                role="alert"
                className="flex flex-col gap-3 rounded-control border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive sm:flex-row sm:items-center sm:justify-between"
              >
                <span>
                  Remove this payout account? Money gifts and withdrawals will
                  be paused until you link a verified account.
                </span>
                <div className="flex shrink-0 items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setConfirmingDelete(false)}
                    disabled={deleteMutation.isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => void handleDeleteAccount()}
                    disabled={deleteMutation.isPending}
                  >
                    {deleteMutation.isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                    <span>Confirm remove</span>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={isEditing ? handleCancelEdit : handleStartEdit}
                >
                  {isEditing ? (
                    <>
                      <X className="h-3.5 w-3.5" />
                      <span>Cancel edit</span>
                    </>
                  ) : (
                    <>
                      <Pencil className="h-3.5 w-3.5" />
                      <span>Edit account</span>
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => setConfirmingDelete(true)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Delete account</span>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}

      {showSetupForm ? (
        <div ref={editCardRef}>
          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
              <div className="space-y-1.5">
                <CardTitle>
                  {existingAccount
                    ? "Update payout details"
                    : "Set up payout details"}
                </CardTitle>
                <CardDescription>
                  Required before guests can send money gifts to your events.
                </CardDescription>
              </div>
              {existingAccount ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleCancelEdit}
                >
                  <X className="h-4 w-4" />
                  <span>Close</span>
                </Button>
              ) : null}
            </CardHeader>
            <CardContent>
              {formError ? (
                <div
                  role="alert"
                  className="mb-4 rounded-control border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
                >
                  {formError}
                </div>
              ) : null}

              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-4"
                  noValidate
                >
                  <FormField
                    control={form.control}
                    name="bankCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel htmlFor="bank-select">Bank</FormLabel>
                        <FormControl>
                          <BankSelect
                            id="bank-select"
                            banks={banksQuery.data ?? []}
                            value={field.value}
                            onValueChange={(nextBankCode) => {
                              field.onChange(nextBankCode);
                              void triggerResolve(nextBankCode, accountNumber);
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="accountNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>10-digit account number</FormLabel>
                        <FormControl>
                          <Input
                            inputMode="numeric"
                            maxLength={10}
                            {...field}
                            onChange={(e) => {
                              const digitsOnly = e.target.value
                                .replace(/\D/g, "")
                                .slice(0, 10);
                              field.onChange(digitsOnly);
                              void triggerResolve(bankCode, digitsOnly);
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {resolveMutation.isPending ? (
                    <div
                      className="flex items-center gap-2 text-xs text-muted-foreground"
                      aria-live="polite"
                    >
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      <span>Resolving account name...</span>
                    </div>
                  ) : null}

                  {resolveError ? (
                    <div
                      role="alert"
                      className="flex items-center justify-between gap-3 rounded-control border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive"
                    >
                      <span>{resolveError}</span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          void triggerResolve(bankCode, accountNumber)
                        }
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        <span>Retry</span>
                      </Button>
                    </div>
                  ) : null}

                  {accountName ? (
                    <div className="space-y-3 rounded-control border border-border bg-muted/50 p-4">
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Resolved account name
                        </p>
                        <p
                          className="mt-0.5 font-medium text-foreground"
                          data-testid="resolved-account-name"
                        >
                          {accountName}
                        </p>
                      </div>

                      <FormField
                        control={form.control}
                        name="confirmedOwnership"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={(checked) =>
                                  field.onChange(checked === true)
                                }
                              />
                            </FormControl>
                            <div className="space-y-1 leading-tight">
                              <FormLabel className="text-sm font-normal">
                                This is my account
                              </FormLabel>
                              <FormMessage />
                            </div>
                          </FormItem>
                        )}
                      />
                    </div>
                  ) : null}

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={
                      !accountName ||
                      resolveMutation.isPending ||
                      saveMutation.isPending
                    }
                  >
                    {saveMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : null}
                    <span>
                      {existingAccount
                        ? "Update payout details"
                        : "Save payout details"}
                    </span>
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}

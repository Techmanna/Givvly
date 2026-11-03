"use client";

import * as React from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { PasswordField } from "@/components/shared/PasswordField";
import { useResetPasswordMutation } from "../hooks/useAuth";
import { resetPasswordSchema } from "../schemas";
import type { ResetPasswordInput } from "../types";
import { mapAuthErrorToForm } from "./mapAuthError";

export type ResetPasswordFormProps = {
  token: string;
};

export function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const resetMutation = useResetPasswordMutation();
  const [formError, setFormError] = React.useState<string | null>(null);
  const [succeeded, setSucceeded] = React.useState(false);

  const form = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    mode: "onBlur",
    defaultValues: {
      token,
      password: "",
      confirmPassword: "",
    },
  });

  React.useEffect(() => {
    form.setValue("token", token);
  }, [token, form]);

  React.useEffect(() => {
    return () => {
      form.reset();
    };
  }, [form]);

  if (!token) {
    return (
      <div role="alert" className="space-y-4 text-center">
        <p className="text-sm text-destructive">
          This password reset link is missing a valid token.
        </p>
        <Button asChild variant="outline" className="w-full">
          <Link href="/forgot-password">Request a new reset link</Link>
        </Button>
      </div>
    );
  }

  const onSubmit = async (values: ResetPasswordInput) => {
    setFormError(null);
    try {
      await resetMutation.mutateAsync(values);
      setSucceeded(true);
    } catch (error) {
      const mapped = mapAuthErrorToForm(error, form.setError, [
        "password",
        "confirmPassword",
        "token",
      ]);
      setFormError(mapped.formError);
    }
  };

  if (succeeded) {
    return (
      <div className="space-y-4 text-center" aria-live="polite">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted text-success">
          <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
        </div>
        <h2 className="font-heading text-xl font-semibold text-foreground">
          Password updated
        </h2>
        <p className="text-sm text-muted-foreground">
          Your password has been reset. You can now sign in with your new password.
        </p>
        <Button asChild className="w-full">
          <Link href="/login">Sign in</Link>
        </Button>
      </div>
    );
  }

  const isSubmitting = form.formState.isSubmitting || resetMutation.isPending;

  return (
    <div className="space-y-4">
      {formError ? (
        <div
          role="alert"
          className="rounded-control border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
        >
          {formError}
        </div>
      ) : null}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>New password</FormLabel>
                <FormControl>
                  <PasswordField
                    autoComplete="new-password"
                    showStrength
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  At least 10 characters with a letter and a number.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Confirm new password</FormLabel>
                <FormControl>
                  <PasswordField autoComplete="new-password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : null}
            <span>Reset password</span>
          </Button>
        </form>
      </Form>
    </div>
  );
}


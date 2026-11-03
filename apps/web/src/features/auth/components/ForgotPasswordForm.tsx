"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForgotPasswordMutation } from "../hooks/useAuth";
import { forgotPasswordSchema } from "../schemas";
import type { ForgotPasswordInput } from "../types";
import { mapAuthErrorToForm } from "./mapAuthError";

export function ForgotPasswordForm() {
  const forgotMutation = useForgotPasswordMutation();
  const [formError, setFormError] = React.useState<string | null>(null);
  const [submittedEmail, setSubmittedEmail] = React.useState<string | null>(null);

  const form = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    mode: "onBlur",
    defaultValues: {
      email: "",
    },
  });

  React.useEffect(() => {
    return () => {
      form.reset();
    };
  }, [form]);

  const onSubmit = async (values: ForgotPasswordInput) => {
    setFormError(null);
    try {
      await forgotMutation.mutateAsync(values);
      setSubmittedEmail(values.email);
    } catch (error) {
      const mapped = mapAuthErrorToForm(error, form.setError, ["email"]);
      setFormError(mapped.formError);
    }
  };

  if (submittedEmail) {
    return (
      <div className="space-y-3 text-center" aria-live="polite">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted text-primary">
          <MailCheck className="h-6 w-6" aria-hidden="true" />
        </div>
        <h2 className="font-heading text-xl font-semibold text-foreground">
          Check your email
        </h2>
        <p className="text-sm text-muted-foreground">
          If an account exists for{" "}
          <span className="font-medium text-foreground">{submittedEmail}</span>,
          we sent a link to reset your password.
        </p>
      </div>
    );
  }

  const isSubmitting = form.formState.isSubmitting || forgotMutation.isPending;

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
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email address</FormLabel>
                <FormControl>
                  <Input type="email" autoComplete="email" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : null}
            <span>Send reset link</span>
          </Button>
        </form>
      </Form>
    </div>
  );
}


"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
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
import { PasswordField } from "@/components/shared/PasswordField";
import { sanitizeNextPath } from "@/lib/format";
import { trackEvent } from "@/lib/analytics";
import { useLoginMutation } from "../hooks/useAuth";
import { loginSchema } from "../schemas";
import type { LoginInput } from "../types";
import { GoogleAuthButton } from "./GoogleAuthButton";
import { mapAuthErrorToForm } from "./mapAuthError";

export type LoginFormProps = {
  nextPath?: string | null;
};

export function LoginForm({ nextPath }: LoginFormProps) {
  const router = useRouter();
  const safeNext = sanitizeNextPath(nextPath, "/dashboard");
  const loginMutation = useLoginMutation();
  const [formError, setFormError] = React.useState<string | null>(null);

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    mode: "onBlur",
    defaultValues: {
      email: "",
      password: "",
    },
  });

  React.useEffect(() => {
    return () => {
      form.reset();
    };
  }, [form]);

  const onSubmit = async (values: LoginInput) => {
    setFormError(null);
    try {
      const res = await loginMutation.mutateAsync(values);
      const role = res?.user?.role;
      // Determine respective destination:
      // If an explicit destination path was requested (e.g. /events/new or /checkout/box),
      // honor that path.
      // Otherwise, redirect to the user's respective role dashboard:
      // - ADMIN -> /admin
      // - USER -> /dashboard
      let destination: string;
      if (nextPath && nextPath !== "/dashboard" && nextPath !== "/login") {
        destination = sanitizeNextPath(nextPath, "/dashboard");
      } else if (role === "ADMIN") {
        destination = "/admin";
      } else {
        destination = "/dashboard";
      }

      trackEvent("login_completed", {
        role: role ?? "USER",
        destination,
      });

      // Notify Next.js router
      router.replace(destination);
      router.refresh();

      // In real browser runtime, force full window transition to guarantee fresh cookie propagation across routes
      if (typeof window !== "undefined" && process.env.NODE_ENV !== "test") {
        window.location.href = destination;
      }
    } catch (error) {
      console.error("[LoginForm] Sign in error:", error);
      const mapped = mapAuthErrorToForm(error, form.setError, [
        "email",
        "password",
      ]);
      setFormError(
        mapped.formError ??
        "Invalid email or password. Please check your details and try again."
      );
    }
  };

  const handleQuickLogin = (email: string) => {
    trackEvent("demo_login_used", { email });
    form.setValue("email", email, { shouldValidate: true });
    form.setValue("password", "Password123!", { shouldValidate: true });
    form.handleSubmit(onSubmit)();
  };

  const isSubmitting = form.formState.isSubmitting || loginMutation.isPending;

  return (
    <div className="space-y-6">
      {/* Quick Mock Account Switcher */}
      {/* <div className="rounded-xl border border-secondary/30 bg-secondary/5 p-3.5 text-xs">
        <div className="flex items-center gap-1.5 font-semibold text-foreground mb-2">
          <span>Quick Demo Login (Mock Mode)</span>
        </div>
        <p className="text-muted-foreground mb-2.5">
          Select any mock account to test that role&apos;s dashboard directly:
        </p>
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isSubmitting}
            className="h-8 text-xs font-medium bg-card hover:bg-secondary/10 hover:border-secondary/40"
            onClick={() => handleQuickLogin("adaobi@givvly.store")}
          >
            User (Adaobi)
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isSubmitting}
            className="h-8 text-xs font-medium bg-card hover:bg-secondary/10 hover:border-secondary/40"
            onClick={() => handleQuickLogin("admin@givvly.store")}
          >
            Admin (Tunde)
          </Button>
        </div>
      </div> */}

      <GoogleAuthButton nextPath={safeNext} label="Sign in with Google" />

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-2 text-muted-foreground">
            Or with email
          </span>
        </div>
      </div>

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
                  <Input
                    type="email"
                    autoComplete="username"
                    spellCheck={false}
                    autoCapitalize="none"
                    enterKeyHint="next"
                    placeholder="you@example.com"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between">
                  <FormLabel>Password</FormLabel>
                  <Link
                    href="/forgot-password"
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <FormControl>
                  <PasswordField autoComplete="current-password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : null}
            <span>Sign in</span>
          </Button>
        </form>
      </Form>
    </div>
  );
}


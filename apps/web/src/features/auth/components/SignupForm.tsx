"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
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
import { toast } from "@/components/ui/sonner";
import { sanitizeNextPath } from "@/lib/format";
import { trackEvent } from "@/lib/analytics";
import {
  useResendVerificationMutation,
  useSignupMutation,
} from "../hooks/useAuth";
import { signupSchema } from "../schemas";
import type { SignupInput, SignupPayload } from "../types";
import { GoogleAuthButton } from "./GoogleAuthButton";
import { mapAuthErrorToForm } from "./mapAuthError";

export type SignupFormProps = {
  nextPath?: string | null;
};

export function SignupForm({ nextPath }: SignupFormProps) {
  const router = useRouter();
  const safeNext = sanitizeNextPath(nextPath, "/dashboard");
  const signupMutation = useSignupMutation();
  const resendMutation = useResendVerificationMutation();

  const [formError, setFormError] = React.useState<string | null>(null);
  const [emailTaken, setEmailTaken] = React.useState(false);
  const [submittedEmail, setSubmittedEmail] = React.useState<string | null>(null);
  const [cooldown, setCooldown] = React.useState(0);
  const [showOptionalPhone, setShowOptionalPhone] = React.useState(false);

  const form = useForm<SignupInput, unknown, SignupPayload>({
    resolver: zodResolver(signupSchema),
    mode: "onBlur",
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      password: "",
      terms: false,
    },
  });

  React.useEffect(() => {
    trackEvent("signup_started", { nextPath: safeNext });
  }, [safeNext]);

  React.useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  React.useEffect(() => {
    return () => {
      form.reset();
    };
  }, [form]);

  const onSubmit = async (values: SignupPayload) => {
    setFormError(null);
    setEmailTaken(false);

    try {
      const res = await signupMutation.mutateAsync(values);
      trackEvent("signup_completed", {
        hasPhone: Boolean(values.phone?.trim()),
        requiresVerification: Boolean(res.requiresVerification),
      });
      if (res.user && res.user.emailVerified && !res.requiresVerification) {
        router.push(safeNext);
        return;
      }
      setSubmittedEmail(values.email);
      setCooldown(60);
    } catch (error) {
      const mapped = mapAuthErrorToForm(error, form.setError, [
        "name",
        "email",
        "phone",
        "password",
        "terms",
      ]);
      setFormError(mapped.formError);
      if (mapped.code === "EMAIL_TAKEN") {
        setEmailTaken(true);
      }
    }
  };

  const handleResend = async () => {
    if (!submittedEmail || cooldown > 0) return;
    try {
      await resendMutation.mutateAsync(submittedEmail);
      setCooldown(60);
      toast.success("Verification email sent.");
    } catch {
      toast.error("Could not resend verification email. Please try again.");
    }
  };

  if (submittedEmail) {
    return (
      <div className="space-y-4 text-center" aria-live="polite">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted text-primary">
          <MailCheck className="h-6 w-6" aria-hidden="true" />
        </div>
        <h2 className="font-heading text-xl font-semibold text-foreground">
          Check your email
        </h2>
        <p className="text-sm text-muted-foreground">
          We sent a verification link to{" "}
          <span className="font-medium text-foreground">{submittedEmail}</span>.
          Click the link in the email to verify your account.
        </p>
        <div className="pt-2">
          <Button
            type="button"
            variant="outline"
            disabled={cooldown > 0 || resendMutation.isPending}
            onClick={handleResend}
            className="w-full"
          >
            {resendMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : null}
            {cooldown > 0
              ? `Resend email in ${cooldown}s`
              : "Resend verification email"}
          </Button>
        </div>
      </div>
    );
  }

  const isSubmitting = form.formState.isSubmitting || signupMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-primary/20 bg-primary/5 px-3.5 py-2.5 text-center text-xs text-muted-foreground">
        <span className="font-semibold text-foreground">Free forever for hosts</span>{" "}
        • Takes 30 seconds • Direct Nigerian bank payouts
      </div>

      <GoogleAuthButton nextPath={safeNext} label="Sign up with Google" />

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
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Full name</FormLabel>
                <FormControl>
                  <Input
                    autoComplete="name"
                    enterKeyHint="next"
                    placeholder="e.g. Adaobi Okafor"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email address</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    autoComplete="email"
                    spellCheck={false}
                    autoCapitalize="none"
                    enterKeyHint="next"
                    placeholder="you@example.com"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
                {emailTaken ? (
                  <p className="text-xs text-muted-foreground">
                    Already registered?{" "}
                    <Link
                      href={`/login?next=${encodeURIComponent(safeNext)}`}
                      className="font-medium text-primary underline underline-offset-4"
                    >
                      Sign in instead
                    </Link>
                  </p>
                ) : null}
              </FormItem>
            )}
          />

          {!showOptionalPhone ? (
            <div>
              <button
                type="button"
                onClick={() => {
                  setShowOptionalPhone(true);
                  trackEvent("signup_optional_phone_toggled", { expanded: true });
                }}
                className="text-xs font-medium text-primary hover:underline"
              >
                + Add Nigerian phone number for WhatsApp/SMS alerts (optional)
              </button>
            </div>
          ) : (
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone number (optional)</FormLabel>
                  <FormControl>
                    <Input
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      enterKeyHint="next"
                      placeholder="08031234567"
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormDescription>
                    Nigerian format (e.g. 08012345678) for instant gift alerts.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
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
            name="terms"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 pt-1">
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
                    I agree to the{" "}
                    <Link
                      href="/terms"
                      className="font-medium text-primary underline underline-offset-4"
                    >
                      Terms of Service
                    </Link>{" "}
                    and{" "}
                    <Link
                      href="/privacy"
                      className="font-medium text-primary underline underline-offset-4"
                    >
                      Privacy Policy
                    </Link>
                  </FormLabel>
                  <FormMessage />
                </div>
              </FormItem>
            )}
          />

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : null}
            <span>Create account</span>
          </Button>
        </form>
      </Form>
    </div>
  );
}


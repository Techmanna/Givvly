"use client";

import * as React from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/cn";

export interface PasswordFieldProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  showStrength?: boolean;
}

export function computePasswordStrength(password: string): {
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
} {
  if (!password) return { score: 0, label: "" };
  let score = 0;
  if (password.length >= 10) score += 1;
  if (/[A-Za-z]/.test(password) && /\d/.test(password)) score += 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password) || password.length >= 14) score += 1;

  const labels: Record<number, string> = {
    0: "Too short",
    1: "Weak",
    2: "Fair",
    3: "Good",
    4: "Strong",
  };

  const clamped = Math.min(4, Math.max(0, score)) as 0 | 1 | 2 | 3 | 4;
  return { score: clamped, label: labels[clamped] ?? "" };
}

export const PasswordField = React.forwardRef<
  HTMLInputElement,
  PasswordFieldProps
>(({ className, showStrength = false, value, ...props }, ref) => {
  const [visible, setVisible] = React.useState(false);
  const strValue = typeof value === "string" ? value : "";
  const strength = showStrength ? computePasswordStrength(strValue) : null;

  return (
    <div className="space-y-1.5">
      <div className="relative">
        <Input
          ref={ref}
          type={visible ? "text" : "password"}
          value={value}
          className={cn("pr-11", className)}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((prev) => !prev)}
          aria-label={visible ? "Hide password" : "Show password"}
          className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-control text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          {visible ? (
            <EyeOff className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Eye className="h-4 w-4" aria-hidden="true" />
          )}
        </button>
      </div>
      {showStrength && strValue.length > 0 && strength ? (
        <div className="space-y-1" aria-live="polite">
          <div className="grid grid-cols-4 gap-1">
            {[1, 2, 3, 4].map((step) => (
              <div
                key={step}
                className={cn(
                  "h-1.5 rounded-full transition-colors",
                  strength.score >= step
                    ? strength.score <= 1
                      ? "bg-destructive"
                      : strength.score === 2
                        ? "bg-warning"
                        : "bg-success"
                    : "bg-muted"
                )}
              />
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Password strength: <span className="font-medium text-foreground">{strength.label}</span>
          </p>
        </div>
      ) : null}
    </div>
  );
});

PasswordField.displayName = "PasswordField";


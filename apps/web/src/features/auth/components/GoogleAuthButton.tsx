"use client";

import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import { useGoogleAuthMutation } from "../hooks/useAuth";

export type GoogleAuthButtonProps = {
  nextPath?: string;
  label?: string;
};

export function GoogleAuthButton({
  nextPath,
  label = "Continue with Google",
}: GoogleAuthButtonProps) {
  const googleMutation = useGoogleAuthMutation();

  const handleGoogleSignIn = async () => {
    try {
      const res = await googleMutation.mutateAsync(nextPath);
      if (res.url) {
        window.location.href = res.url;
      }
    } catch {
      toast.error("Could not start Google sign-in. Please try again.");
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      className="w-full"
      disabled={googleMutation.isPending}
      onClick={handleGoogleSignIn}
    >
      {googleMutation.isPending ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      ) : (
        <svg
          className="h-4 w-4"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            fill="currentColor"
            d="M21.35 11.1h-9.17v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44C8.36 19.27 5 15.25 5 12c0-3.25 3.36-7.27 7.2-7.27c3.09 0 4.9 1.97 4.9 1.97L19 4.72S16.56 2 12.1 2C6.42 2 2.03 6.8 2.03 12c0 5.05 4.13 10 10.22 10c5.35 0 9.25-3.67 9.25-9.09c0-1.15-.15-1.81-.15-1.81Z"
          />
        </svg>
      )}
      <span>{label}</span>
    </Button>
  );
}


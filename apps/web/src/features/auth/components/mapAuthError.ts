import type { FieldValues, Path, UseFormSetError } from "react-hook-form";
import { isApiClientError, type ApiClientError } from "@/lib/api-client";
import { toast } from "@/components/ui/sonner";

/**
 * Maps `ApiClientError` validation details to react-hook-form fields (`setError`)
 * and returns a form-level alert message when appropriate (Section 8.3 & 10.2).
 */
export function mapAuthErrorToForm<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  knownFields: readonly Path<T>[]
): { formError: string | null; code?: string } {
  if (!isApiClientError(error)) {
    return {
      formError: "Check your connection and try again.",
    };
  }

  if (error.code === "RATE_LIMITED" || error.status === 429) {
    toast.error(error.message || "Too many attempts. Please wait a moment and try again.");
    return { formError: error.message || "Too many attempts. Please wait a moment.", code: error.code };
  }

  if (error.code === "ACCOUNT_LOCKED" || error.status === 423) {
    return {
      formError:
        error.message ||
        "Your account is temporarily locked due to multiple failed attempts. Please try again later.",
      code: error.code,
    };
  }

  if (error.code === "INVALID_CREDENTIALS" || error.status === 401) {
    return {
      formError: "Invalid email or password. Please check your details and try again.",
      code: error.code,
    };
  }

  if (error.code === "EMAIL_TAKEN" && knownFields.includes("email" as Path<T>)) {
    setError("email" as Path<T>, {
      type: "server",
      message: "An account with this email already exists.",
    });
    return { formError: null, code: error.code };
  }

  if (error.details) {
    const unknownMessages: string[] = [];
    for (const [field, messages] of Object.entries(error.details)) {
      const firstMessage = messages?.[0];
      if (!firstMessage) continue;
      if (knownFields.includes(field as Path<T>)) {
        setError(field as Path<T>, {
          type: "server",
          message: firstMessage,
        });
      } else {
        unknownMessages.push(firstMessage);
      }
    }
    if (unknownMessages.length > 0) {
      return { formError: unknownMessages.join(" "), code: error.code };
    }
    return { formError: null, code: error.code };
  }

  return {
    formError: error.message || "Something went wrong. Please try again.",
    code: error.code,
  };
}


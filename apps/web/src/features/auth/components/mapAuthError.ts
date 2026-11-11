import type { FieldValues, Path, UseFormSetError } from "react-hook-form";
import { isApiClientError, type ApiClientError } from "@/lib/api-client";
import { toast } from "@/components/ui/sonner";

export function humanizeValidationMessage(raw: string): string {
  if (!raw || typeof raw !== "string") {
    return "Please check this field and try again.";
  }
  let cleaned = raw.trim();

  // Replace technical camelCase field names with user-friendly terms
  cleaned = cleaned.replace(/\bnewPassword\b/g, "Password");
  cleaned = cleaned.replace(/\bcurrentPassword\b/g, "Current password");
  cleaned = cleaned.replace(/\boldPassword\b/g, "Current password");
  cleaned = cleaned.replace(/\bconfirmPassword\b/g, "Confirm password");
  cleaned = cleaned.replace(/\bbuyerEmail\b/g, "Email address");
  cleaned = cleaned.replace(/\buserEmail\b/g, "Email address");
  cleaned = cleaned.replace(/\bemail\b/g, "Email address");
  cleaned = cleaned.replace(/\bphone\b/g, "Phone number");
  cleaned = cleaned.replace(/\brecipientName\b/g, "Recipient name");
  cleaned = cleaned.replace(/\brecipientPhone\b/g, "Recipient phone");
  cleaned = cleaned.replace(/\brecipientEmail\b/g, "Recipient email");

  // Technical validator phrases
  cleaned = cleaned.replace(/must be longer than or equal to (\d+) characters/gi, "must be at least $1 characters long");
  cleaned = cleaned.replace(/must be shorter than or equal to (\d+) characters/gi, "cannot exceed $1 characters");
  cleaned = cleaned.replace(/must be a string/gi, "is required");
  cleaned = cleaned.replace(/must not be empty/gi, "is required");
  cleaned = cleaned.replace(/should not be empty/gi, "is required");
  cleaned = cleaned.replace(/must be an email/gi, "must be a valid email address");
  cleaned = cleaned.replace(/must be a boolean value/gi, "must be selected");
  cleaned = cleaned.replace(/must be a number conforming to the specified constraints/gi, "must be a valid number");

  cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  if (!/[.!?]$/.test(cleaned)) {
    cleaned += ".";
  }
  return cleaned;
}

const FIELD_ALIASES: Record<string, string> = {
  newPassword: "password",
  new_password: "password",
  currentPassword: "currentPassword",
  oldPassword: "currentPassword",
  confirmPassword: "confirmPassword",
  confirm_password: "confirmPassword",
  buyerEmail: "email",
  userEmail: "email",
  buyerPhone: "phone",
  userPhone: "phone",
};

/**
 * Maps `ApiClientError` validation details to react-hook-form fields (`setError`)
 * and returns a user-friendly form-level alert message when appropriate.
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
    const msg = error.message || "Too many attempts. Please wait a moment and try again.";
    toast.error(msg);
    return { formError: msg, code: error.code };
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

  const lowerMessage = (error.message || "").toLowerCase();
  if (
    lowerMessage.includes("expired") ||
    (lowerMessage.includes("invalid") && lowerMessage.includes("token")) ||
    lowerMessage.includes("verification token") ||
    lowerMessage.includes("reset token")
  ) {
    return {
      formError: "This link is invalid or has expired. Please request a new one.",
      code: error.code,
    };
  }

  const isEmailConflict =
    error.code === "EMAIL_TAKEN" ||
    error.code === "Conflict" ||
    error.status === 409 ||
    lowerMessage.includes("email already exists");

  if (isEmailConflict && knownFields.includes("email" as Path<T>)) {
    setError("email" as Path<T>, {
      type: "server",
      message: "An account with this email already exists.",
    });
    return { formError: null, code: "EMAIL_TAKEN" };
  }

  const rawDetails: unknown = error.details;
  if (rawDetails) {
    if (typeof rawDetails === "string" && rawDetails.trim()) {
      return { formError: humanizeValidationMessage(rawDetails), code: error.code };
    }

    if (Array.isArray(rawDetails)) {
      const rawMessages = rawDetails.filter(
        (m): m is string => typeof m === "string" && Boolean(m.trim())
      );

      const cleanedMessages = rawMessages.map(humanizeValidationMessage);
      // Prioritize specific constraints over generic "is required."
      const filteredMessages = cleanedMessages.filter((msg, idx, arr) => {
        if (msg.endsWith("is required.")) {
          const prefix = msg.replace(/ is required\.$/, "");
          const hasMoreSpecific = arr.some(
            (other, otherIdx) =>
              otherIdx !== idx && other.startsWith(prefix) && other !== msg
          );
          return !hasMoreSpecific;
        }
        return true;
      });

      const unmappedMessages: string[] = [];
      const setFieldNames = new Set<string>();

      for (const friendly of filteredMessages) {
        const lower = friendly.toLowerCase();

        let mapped = false;
        if (
          knownFields.includes("password" as Path<T>) &&
          lower.includes("password")
        ) {
          if (!setFieldNames.has("password")) {
            setError("password" as Path<T>, {
              type: "server",
              message: friendly,
            });
            setFieldNames.add("password");
          }
          mapped = true;
        } else if (
          knownFields.includes("confirmPassword" as Path<T>) &&
          lower.includes("confirmpassword")
        ) {
          if (!setFieldNames.has("confirmPassword")) {
            setError("confirmPassword" as Path<T>, {
              type: "server",
              message: friendly,
            });
            setFieldNames.add("confirmPassword");
          }
          mapped = true;
        } else if (
          knownFields.includes("email" as Path<T>) &&
          lower.includes("email")
        ) {
          if (!setFieldNames.has("email")) {
            setError("email" as Path<T>, {
              type: "server",
              message: friendly,
            });
            setFieldNames.add("email");
          }
          mapped = true;
        } else if (
          knownFields.includes("phone" as Path<T>) &&
          lower.includes("phone")
        ) {
          if (!setFieldNames.has("phone")) {
            setError("phone" as Path<T>, {
              type: "server",
              message: friendly,
            });
            setFieldNames.add("phone");
          }
          mapped = true;
        } else if (
          knownFields.includes("name" as Path<T>) &&
          lower.includes("name")
        ) {
          if (!setFieldNames.has("name")) {
            setError("name" as Path<T>, {
              type: "server",
              message: friendly,
            });
            setFieldNames.add("name");
          }
          mapped = true;
        }

        if (!mapped) {
          unmappedMessages.push(friendly);
        }
      }

      if (unmappedMessages.length > 0) {
        return { formError: unmappedMessages.join(" "), code: error.code };
      }
      return { formError: null, code: error.code };
    }

    if (typeof rawDetails === "object" && !Array.isArray(rawDetails)) {
      const unknownMessages: string[] = [];
      for (const [rawField, rawMessages] of Object.entries(
        rawDetails as Record<string, unknown>
      )) {
        const field = FIELD_ALIASES[rawField] || rawField;
        const messages = Array.isArray(rawMessages)
          ? rawMessages
          : typeof rawMessages === "string"
            ? [rawMessages]
            : [];
        const firstMessage = messages[0];
        if (!firstMessage || typeof firstMessage !== "string") continue;
        const friendly = humanizeValidationMessage(firstMessage);
        if (knownFields.includes(field as Path<T>)) {
          setError(field as Path<T>, {
            type: "server",
            message: friendly,
          });
        } else {
          unknownMessages.push(friendly);
        }
      }
      if (unknownMessages.length > 0) {
        return { formError: unknownMessages.join(" "), code: error.code };
      }
      return { formError: null, code: error.code };
    }
  }

  return {
    formError: humanizeValidationMessage(
      error.message || "Something went wrong. Please check your details and try again."
    ),
    code: error.code,
  };
}


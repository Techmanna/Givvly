import { z } from "zod";
import { NIGERIAN_PHONE_REGEX } from "./auth";

export const RSVP_RESPONSES = ["YES", "NO", "MAYBE"] as const;
export type RsvpResponse = (typeof RSVP_RESPONSES)[number];

export const rsvpFormSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Enter your full name (at least 2 characters)")
      .max(60, "Name must be 60 characters or fewer"),
    response: z.enum(RSVP_RESPONSES, {
      errorMap: () => ({ message: "Choose whether you will attend" }),
    }),
    plusOneName: z
      .string()
      .trim()
      .max(60, "Plus-one name must be 60 characters or fewer")
      .optional()
      .or(z.literal("")),
    email: z
      .string()
      .trim()
      .email("Enter a valid email address")
      .max(254)
      .optional()
      .or(z.literal("")),
    phone: z
      .string()
      .trim()
      .refine((v) => !v || NIGERIAN_PHONE_REGEX.test(v), {
        message: "Enter a valid phone number (e.g. 08031234567 or +2348031234567)",
      })
      .optional()
      .or(z.literal("")),
  })
  .refine(
    (data) => {
      if (data.plusOneName && data.plusOneName.trim().length === 1) {
        return false;
      }
      return true;
    },
    {
      path: ["plusOneName"],
      message: "Plus-one name must be at least 2 characters",
    }
  )
  .refine(
    (data) => Boolean(data.email?.trim() || data.phone?.trim()),
    {
      path: ["email"],
      message: "Provide an email address or phone number for your confirmation",
    }
  );

export type RsvpFormInput = z.infer<typeof rsvpFormSchema>;

export type SubmitRsvpRequest = {
  name: string;
  response: RsvpResponse;
  plusOneName?: string;
  email?: string;
  phone?: string;
};

export type RsvpRecord = {
  id: string;
  eventId: string;
  name: string;
  response: RsvpResponse;
  plusOneName?: string;
  email?: string;
  phone?: string;
  createdAt: string;
};


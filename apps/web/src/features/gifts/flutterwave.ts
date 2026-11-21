import { env, isMockApiEnabled } from "@/lib/env";
import type { OpenGatewayCheckoutParams } from "./monnify";

type FlutterwaveCallbackData = {
  status?: string;
  tx_ref?: string;
  transaction_id?: number;
  flw_ref?: string;
};

type FlutterwaveModalHandle = {
  close?: () => void;
};

type FlutterwaveCheckoutOptions = {
  public_key: string;
  tx_ref: string;
  amount: number;
  currency: string;
  payment_options?: string;
  customer: {
    email: string;
    name?: string;
  };
  customizations?: {
    title?: string;
    description?: string;
  };
  callback: (data: FlutterwaveCallbackData) => void;
  onclose: (incomplete?: boolean) => void;
};

declare global {
  interface Window {
    FlutterwaveCheckout?: (
      options: FlutterwaveCheckoutOptions
    ) => FlutterwaveModalHandle | void;
  }
}

const FLUTTERWAVE_SCRIPT_SRC = "https://checkout.flutterwave.com/v3.js";
let flutterwaveScriptPromise: Promise<boolean> | null = null;

export function loadFlutterwaveScript(): Promise<boolean> {
  if (typeof window === "undefined") {
    return Promise.resolve(false);
  }
  if (isMockApiEnabled()) {
    return Promise.resolve(true);
  }
  if (window.FlutterwaveCheckout) {
    return Promise.resolve(true);
  }
  if (flutterwaveScriptPromise) {
    return flutterwaveScriptPromise;
  }

  flutterwaveScriptPromise = new Promise<boolean>((resolve) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${FLUTTERWAVE_SCRIPT_SRC}"]`
    );
    if (existing) {
      existing.addEventListener("load", () =>
        resolve(Boolean(window.FlutterwaveCheckout))
      );
      existing.addEventListener("error", () => resolve(false));
      return;
    }

    const script = document.createElement("script");
    script.src = FLUTTERWAVE_SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve(Boolean(window.FlutterwaveCheckout));
    script.onerror = () => {
      flutterwaveScriptPromise = null;
      resolve(false);
    };
    document.head.appendChild(script);
  });

  return flutterwaveScriptPromise;
}

export async function openFlutterwaveCheckout(
  params: OpenGatewayCheckoutParams
): Promise<{ opened: boolean }> {
  if (isMockApiEnabled()) {
    params.onComplete(params.reference);
    return { opened: true };
  }

  const candidateFromAccessCode =
    params.accessCode &&
    /^FLWPUBK(_TEST)?-[A-Za-z0-9]+-X$/i.test(params.accessCode.trim())
      ? params.accessCode.trim()
      : undefined;
  const candidateFromEnv = env.NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY?.trim();
  const validEnvKey =
    candidateFromEnv &&
    /^FLWPUBK(_TEST)?-[A-Za-z0-9]+-X$/i.test(candidateFromEnv) &&
    !candidateFromEnv.includes("mock_")
      ? candidateFromEnv
      : undefined;

  const publicKey = candidateFromAccessCode || validEnvKey;
  if (!publicKey) {
    // Hosted link (data.link) fallback when no valid public key is available on client
    return { opened: false };
  }

  const loaded = await loadFlutterwaveScript();
  if (!loaded || !window.FlutterwaveCheckout) {
    return { opened: false };
  }

  try {
    let modal: FlutterwaveModalHandle | void;
    modal = window.FlutterwaveCheckout({
      public_key: publicKey,
      tx_ref: params.reference,
      amount: Number((params.amountKobo / 100).toFixed(2)),
      currency: (params.currency || "NGN").toUpperCase(),
      payment_options:
        "card, account, banktransfer, ussd, mobilemoneyghana, mpesa",
      customer: {
        email: params.email,
        name: params.customerName || "Givvly Guest",
      },
      customizations: {
        title: "Givvly",
        description: params.description || "Givvly Payment",
      },
      callback: (data) => {
        const st = String(data?.status || "").toLowerCase();
        if (st === "successful" || st === "completed") {
          modal?.close?.();
          params.onComplete(data?.tx_ref || params.reference);
        }
      },
      onclose: (incomplete) => {
        if (incomplete !== false) {
          params.onDismiss();
        }
      },
    });
    return { opened: true };
  } catch {
    return { opened: false };
  }
}

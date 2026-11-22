import { env, isMockApiEnabled } from "@/lib/env";
import { openPaystackCheckout } from "./paystack";
import { openFlutterwaveCheckout } from "./flutterwave";

type MonnifyInitOptions = {
  amount: number;
  currency: string;
  reference: string;
  customerFullName?: string;
  customerEmail: string;
  apiKey: string;
  contractCode: string;
  paymentDescription?: string;
  isTestMode?: boolean;
  onLoadStart?: () => void;
  onLoadComplete?: () => void;
  onComplete: (response: { paymentReference?: string; transactionReference?: string }) => void;
  onClose: (data?: unknown) => void;
};

type MonnifySdkGlobal = {
  initialize: (options: MonnifyInitOptions) => void;
};

declare global {
  interface Window {
    MonnifySDK?: MonnifySdkGlobal;
  }
}

const MONNIFY_SCRIPT_SRC = "https://sdk.monnify.com/plugin/monnify.js";
let monnifyScriptPromise: Promise<boolean> | null = null;

export function loadMonnifyScript(): Promise<boolean> {
  if (typeof window === "undefined") {
    return Promise.resolve(false);
  }
  if (isMockApiEnabled()) {
    return Promise.resolve(true);
  }
  if (window.MonnifySDK) {
    return Promise.resolve(true);
  }
  if (monnifyScriptPromise) {
    return monnifyScriptPromise;
  }

  monnifyScriptPromise = new Promise<boolean>((resolve) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${MONNIFY_SCRIPT_SRC}"]`
    );
    if (existing) {
      existing.addEventListener("load", () =>
        resolve(Boolean(window.MonnifySDK))
      );
      existing.addEventListener("error", () => resolve(false));
      return;
    }

    const script = document.createElement("script");
    script.src = MONNIFY_SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve(Boolean(window.MonnifySDK));
    script.onerror = () => {
      monnifyScriptPromise = null;
      resolve(false);
    };
    document.head.appendChild(script);
  });

  return monnifyScriptPromise;
}

export type OpenGatewayCheckoutParams = {
  email: string;
  customerName?: string;
  amountKobo: number;
  currency?: string;
  reference: string;
  accessCode?: string;
  authorizationUrl?: string;
  provider?: string;
  description?: string;
  onComplete: (reference: string) => void;
  onDismiss: () => void;
};

export async function openMonnifyCheckout(
  params: OpenGatewayCheckoutParams
): Promise<{ opened: boolean }> {
  if (isMockApiEnabled()) {
    params.onComplete(params.reference);
    return { opened: true };
  }

  const apiKey = env.NEXT_PUBLIC_MONNIFY_API_KEY;
  const contractCode = env.NEXT_PUBLIC_MONNIFY_CONTRACT_CODE;

  if (!apiKey || !contractCode) {
    // Hosted checkoutUrl fallback when inline SDK keys are not set on the client
    return { opened: false };
  }

  const loaded = await loadMonnifyScript();
  if (!loaded || !window.MonnifySDK) {
    return { opened: false };
  }

  try {
    window.MonnifySDK.initialize({
      amount: Number((params.amountKobo / 100).toFixed(2)),
      currency: "NGN",
      reference: params.reference,
      customerFullName: params.customerName || "Givvly Guest",
      customerEmail: params.email,
      apiKey,
      contractCode,
      paymentDescription: params.description || "Givvly Payment",
      isTestMode: env.NEXT_PUBLIC_MONNIFY_TEST_MODE,
      onComplete: (res) => {
        params.onComplete(res?.paymentReference || params.reference);
      },
      onClose: () => {
        params.onDismiss();
      },
    });
    return { opened: true };
  } catch {
    return { opened: false };
  }
}

/**
 * Opens the active payment gateway checkout (Flutterwave by default, or Monnify/Paystack when specified).
 */
export async function openGatewayCheckout(
  params: OpenGatewayCheckoutParams
): Promise<{ opened: boolean }> {
  const explicitProvider = params.provider?.toUpperCase();
  let resolvedProvider = explicitProvider;

  if (!resolvedProvider) {
    if (params.authorizationUrl?.includes("paystack.com")) {
      resolvedProvider = "PAYSTACK";
    } else if (params.authorizationUrl?.includes("monnify.com")) {
      resolvedProvider = "MONNIFY";
    } else if (params.authorizationUrl?.includes("flutterwave.com")) {
      resolvedProvider = "FLUTTERWAVE";
    } else {
      resolvedProvider = env.NEXT_PUBLIC_DEFAULT_PAYMENT_GATEWAY || "FLUTTERWAVE";
    }
  }

  if (resolvedProvider === "PAYSTACK") {
    return openPaystackCheckout({
      email: params.email,
      amountKobo: params.amountKobo,
      reference: params.reference,
      accessCode: params.accessCode || "",
      onComplete: params.onComplete,
      onDismiss: params.onDismiss,
    });
  }

  if (resolvedProvider === "MONNIFY") {
    return openMonnifyCheckout(params);
  }

  return openFlutterwaveCheckout(params);
}

/**
 * Resolves the human-readable payment gateway name from an explicit provider,
 * an authorization URL, or NEXT_PUBLIC_DEFAULT_PAYMENT_GATEWAY.
 */
export function getDefaultGatewayDisplayName(providerOrUrl?: string): string {
  const normalized = providerOrUrl?.toLowerCase() ?? "";
  let resolved: string;

  if (normalized.includes("paystack")) {
    resolved = "PAYSTACK";
  } else if (normalized.includes("monnify")) {
    resolved = "MONNIFY";
  } else if (normalized.includes("flutterwave")) {
    resolved = "FLUTTERWAVE";
  } else {
    resolved = (env.NEXT_PUBLIC_DEFAULT_PAYMENT_GATEWAY || "FLUTTERWAVE").toUpperCase();
  }

  switch (resolved) {
    case "PAYSTACK":
      return "Paystack";
    case "MONNIFY":
      return "Monnify";
    case "FLUTTERWAVE":
    default:
      return "Flutterwave";
  }
}

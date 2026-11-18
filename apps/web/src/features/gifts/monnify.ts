import { env, isMockApiEnabled } from "@/lib/env";
import { openPaystackCheckout } from "./paystack";

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
 * Opens the active payment gateway checkout (Monnify by default, or Paystack if URL/provider specifies it).
 */
export async function openGatewayCheckout(
  params: OpenGatewayCheckoutParams
): Promise<{ opened: boolean }> {
  const isPaystack =
    params.provider?.toUpperCase() === "PAYSTACK" ||
    Boolean(params.authorizationUrl?.includes("paystack.com"));

  if (isPaystack) {
    return openPaystackCheckout({
      email: params.email,
      amountKobo: params.amountKobo,
      reference: params.reference,
      accessCode: params.accessCode || "",
      onComplete: params.onComplete,
      onDismiss: params.onDismiss,
    });
  }

  return openMonnifyCheckout(params);
}

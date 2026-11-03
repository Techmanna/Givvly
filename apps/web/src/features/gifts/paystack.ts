import { env, isMockApiEnabled } from "@/lib/env";

type PaystackHandlerOptions = {
  key: string;
  email: string;
  amount: number;
  ref: string;
  access_code?: string;
  callback: (response: { reference: string }) => void;
  onClose: () => void;
};

type PaystackPopGlobal = {
  setup: (options: PaystackHandlerOptions) => { openIframe: () => void };
};

declare global {
  interface Window {
    PaystackPop?: PaystackPopGlobal;
  }
}

const PAYSTACK_SCRIPT_SRC = "https://js.paystack.co/v1/inline.js";
let scriptPromise: Promise<boolean> | null = null;

/**
 * Dynamically loads Paystack Inline JS only when the Give flow is opened (Section 11.5).
 */
export function loadPaystackScript(): Promise<boolean> {
  if (typeof window === "undefined") {
    return Promise.resolve(false);
  }
  if (isMockApiEnabled()) {
    return Promise.resolve(true);
  }
  if (window.PaystackPop) {
    return Promise.resolve(true);
  }
  if (scriptPromise) {
    return scriptPromise;
  }

  scriptPromise = new Promise<boolean>((resolve) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${PAYSTACK_SCRIPT_SRC}"]`
    );
    if (existing) {
      existing.addEventListener("load", () => resolve(Boolean(window.PaystackPop)));
      existing.addEventListener("error", () => resolve(false));
      return;
    }

    const script = document.createElement("script");
    script.src = PAYSTACK_SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve(Boolean(window.PaystackPop));
    script.onerror = () => {
      scriptPromise = null;
      resolve(false);
    };
    document.head.appendChild(script);
  });

  return scriptPromise;
}

export type OpenPaystackCheckoutParams = {
  email: string;
  amountKobo: number;
  reference: string;
  accessCode: string;
  onComplete: (reference: string) => void;
  onDismiss: () => void;
};

export async function openPaystackCheckout(
  params: OpenPaystackCheckoutParams
): Promise<{ opened: boolean }> {
  if (isMockApiEnabled()) {
    params.onComplete(params.reference);
    return { opened: true };
  }

  const loaded = await loadPaystackScript();
  if (!loaded || !window.PaystackPop) {
    return { opened: false };
  }

  try {
    const handler = window.PaystackPop.setup({
      key: env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY,
      email: params.email,
      amount: params.amountKobo,
      ref: params.reference,
      access_code: params.accessCode,
      callback: (res) => {
        params.onComplete(res.reference || params.reference);
      },
      onClose: () => {
        params.onDismiss();
      },
    });
    handler.openIframe();
    return { opened: true };
  } catch {
    return { opened: false };
  }
}


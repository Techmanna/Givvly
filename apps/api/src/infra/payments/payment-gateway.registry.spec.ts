import { PaymentGatewayRegistry } from "./payment-gateway.registry";
import { PaystackGateway } from "./adapters/paystack.gateway";
import { PaymentGateway } from "./payment-gateway.interface";

describe("PaymentGatewayRegistry", () => {
  let registry: PaymentGatewayRegistry;
  let mockPaystack: any;

  beforeEach(() => {
    mockPaystack = {
      providerName: "PAYSTACK",
      supportedCurrencies: ["NGN", "USD", "GHS", "KES"],
      supportsCurrency: jest.fn((curr: string) =>
        ["NGN", "USD", "GHS", "KES"].includes(curr.toUpperCase())
      ),
      supportsPayouts: true,
    };

    registry = new PaymentGatewayRegistry(mockPaystack as PaystackGateway);
  });

  it("retrieves Paystack by default", () => {
    const gateway = registry.getGateway();
    expect(gateway.providerName).toBe("PAYSTACK");
  });

  it("resolves gateway for NGN to PAYSTACK", () => {
    const gateway = registry.getGatewayForCurrency("NGN");
    expect(gateway.providerName).toBe("PAYSTACK");
  });

  it("allows registering and resolving additional gateways seamlessly (e.g. STRIPE)", () => {
    const mockStripe: PaymentGateway = {
      providerName: "STRIPE",
      supportedCurrencies: ["USD", "EUR", "GBP"],
      supportsPayouts: true,
      supportsCurrency: (curr: string) =>
        ["USD", "EUR", "GBP"].includes(curr.toUpperCase()),
      initializePayment: jest.fn(),
      verifyPayment: jest.fn(),
      verifyWebhookSignature: jest.fn(),
      parseWebhookEvent: jest.fn(),
    };

    registry.registerGateway(mockStripe);

    expect(registry.listSupportedGateways()).toContain("STRIPE");
    expect(registry.getGateway("STRIPE").providerName).toBe("STRIPE");
    expect(registry.getGatewayForCurrency("EUR").providerName).toBe("STRIPE");
  });
});


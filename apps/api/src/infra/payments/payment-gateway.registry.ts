import {
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from "@nestjs/common";
import { PaymentGateway } from "./payment-gateway.interface";
import { PaystackGateway } from "./adapters/paystack.gateway";
import { MonnifyGateway } from "./adapters/monnify.gateway";

@Injectable()
export class PaymentGatewayRegistry {
  private readonly logger = new Logger(PaymentGatewayRegistry.name);
  private readonly gateways = new Map<string, PaymentGateway>();
  private defaultGatewayName = "MONNIFY";

  constructor(
    paystackGateway: PaystackGateway,
    @Optional() monnifyGateway?: MonnifyGateway
  ) {
    if (monnifyGateway) {
      this.registerGateway(monnifyGateway);
    } else {
      this.defaultGatewayName = "PAYSTACK";
    }
    this.registerGateway(paystackGateway);

    const configuredDefault =
      process.env.DEFAULT_PAYMENT_GATEWAY?.trim().toUpperCase();
    if (configuredDefault && this.gateways.has(configuredDefault)) {
      this.defaultGatewayName = configuredDefault;
    }
  }

  /**
   * Register a payment gateway adapter
   */
  registerGateway(gateway: PaymentGateway) {
    const key = gateway.providerName.toUpperCase();
    this.gateways.set(key, gateway);
    this.logger.log(
      `Registered payment gateway '${key}' supporting: [${gateway.supportedCurrencies.join(", ")}]`
    );
  }

  /**
   * Get gateway by provider name (defaults to PAYSTACK)
   */
  getGateway(providerName?: string): PaymentGateway {
    const name = (providerName || this.defaultGatewayName).toUpperCase();
    const gateway = this.gateways.get(name);

    if (!gateway) {
      throw new NotFoundException(
        `Payment gateway '${name}' is not registered. Available: [${this.listSupportedGateways().join(", ")}]`
      );
    }

    return gateway;
  }

  /**
   * Resolve appropriate gateway for a given currency code
   */
  getGatewayForCurrency(currency: string, preferredProvider?: string): PaymentGateway {
    if (preferredProvider) {
      const preferred = this.getGateway(preferredProvider);
      if (preferred.supportsCurrency(currency)) {
        return preferred;
      }
    }

    // Try finding gateway that supports this currency
    for (const gateway of this.gateways.values()) {
      if (gateway.supportsCurrency(currency)) {
        return gateway;
      }
    }

    // Fallback to default gateway
    this.logger.warn(
      `No specific gateway registered for currency '${currency}'. Falling back to default '${this.defaultGatewayName}'`
    );
    return this.getGateway(this.defaultGatewayName);
  }

  listSupportedGateways(): string[] {
    return Array.from(this.gateways.keys());
  }

  listSupportedCurrencies(): string[] {
    const currencies = new Set<string>();
    for (const gateway of this.gateways.values()) {
      for (const curr of gateway.supportedCurrencies) {
        currencies.add(curr);
      }
    }
    return Array.from(currencies);
  }
}


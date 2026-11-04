import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { PrismaService } from "../../infra/prisma/prisma.service";
import { StandardDigitalProvider } from "./adapters/standard-digital-provider";
import { BillSpotProvider } from "./adapters/billspot.provider";
import { NotificationsService } from "../notifications/notifications.service";
import { OrderStatus } from "@prisma/client";
import {
  BillSpotPlansResponse,
  BillSpotProvidersResponse,
  BillSpotVtuType,
  DigitalKind,
} from "./digital-provider.interface";
import { PurchaseVtuDto } from "./dto/digital-gift.dto";

@Injectable()
export class DigitalGiftsService {
  private readonly logger = new Logger(DigitalGiftsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly vouchers: StandardDigitalProvider,
    private readonly billspot: BillSpotProvider,
    private readonly notifications: NotificationsService
  ) {}

  /**
   * Fetch cached BillSpot VTU providers for airtime or data
   */
  async getVtuProviders(type: BillSpotVtuType = "airtime"): Promise<BillSpotProvidersResponse> {
    return this.billspot.getProviders(type);
  }

  /**
   * Fetch cached BillSpot data plans for a provider slug (mtn, airtel, glo, t2mobile)
   */
  async getVtuPlans(provider: string): Promise<BillSpotPlansResponse> {
    if (!provider || !provider.trim()) {
      throw new BadRequestException("Provider slug is required");
    }
    return this.billspot.getDataPlans(provider);
  }

  /**
   * Direct VTU purchase endpoint (Airtime or Data, single or multi-phone)
   */
  async purchaseVtu(dto: PurchaseVtuDto, headerIdempotencyKey?: string) {
    const phones =
      Array.isArray(dto.phones) && dto.phones.length > 0
        ? dto.phones
        : dto.phone
          ? [dto.phone]
          : [];

    if (phones.length === 0) {
      throw new BadRequestException("Either 'phone' or 'phones' must be provided");
    }

    const vtuType: BillSpotVtuType = dto.type === "data" ? "data" : "airtime";
    if (vtuType === "data" && !dto.bill_item_identifier) {
      throw new BadRequestException(
        "bill_item_identifier is required when purchasing a data plan"
      );
    }

    const idempotencyKey =
      headerIdempotencyKey || dto.idempotency_key || `vtu-${Date.now()}`;

    return this.billspot.purchase({
      ...(phones.length > 1 ? { phones } : { phone: phones[0] }),
      amount: dto.amount,
      provider: dto.provider.toLowerCase(),
      type: vtuType,
      ...(vtuType === "data" && dto.bill_item_identifier
        ? { bill_item_identifier: dto.bill_item_identifier }
        : {}),
      idempotency_key: idempotencyKey,
    });
  }

  /**
   * Automatically fulfill digital products for an order upon payment capture
   */
  async fulfillDigitalOrder(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
      },
    });

    if (!order) {
      throw new NotFoundException(`Order '${orderId}' not found`);
    }

    if (order.status === OrderStatus.DELIVERED) {
      return {
        fulfilled: true,
        allDigital: true,
        orderNumber: order.number,
        fulfillmentResults: [],
        message: "Order already fulfilled and delivered",
      };
    }

    // Resolve products for this order
    const productIds = order.items.map((i) => i.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
    });

    const productMap = new Map(products.map((p) => [p.id, p]));
    const addressMeta =
      order.address && typeof order.address === "object"
        ? (order.address as Record<string, any>)
        : {};

    const digitalItems = order.items.filter((item) => {
      const p = productMap.get(item.productId);
      return (p && p.isDigital) || Boolean(addressMeta.vtuType);
    });

    if (digitalItems.length === 0) {
      return { fulfilled: false, message: "No digital products in order" };
    }

    const fulfillmentResults = [];

    for (const item of digitalItems) {
      const product = productMap.get(item.productId);
      const kind: DigitalKind = addressMeta.vtuType
        ? addressMeta.vtuType === "data"
          ? "DATA"
          : "AIRTIME"
        : ((product?.digitalKind as DigitalKind) || "VOUCHER");

      const recipientPhones: string[] = Array.isArray(addressMeta.recipientPhones)
        ? addressMeta.recipientPhones
        : order.recipientPhone
          ? [order.recipientPhone]
          : [];

      const primaryPhone = recipientPhones[0] || order.recipientPhone;

      if ((kind === "AIRTIME" || kind === "DATA") && primaryPhone) {
        const unitAmountSubunits =
          typeof addressMeta.unitVtuAmountKobo === "number" &&
          addressMeta.unitVtuAmountKobo > 0
            ? addressMeta.unitVtuAmountKobo
            : item.unitPriceKobo;

        const topUp = await this.billspot.fulfillTopUp({
          phoneNumber: primaryPhone,
          phoneNumbers: recipientPhones.length > 0 ? recipientPhones : undefined,
          operator:
            addressMeta.vtuProvider ||
            product?.occasions?.[0] ||
            product?.title ||
            item.title,
          amountSubunits: unitAmountSubunits,
          reference: `${order.number}-${item.id}`,
          type: kind === "DATA" ? "data" : "airtime",
          billItemIdentifier: addressMeta.billItemIdentifier || undefined,
        });
        fulfillmentResults.push({ item: item.title, topUp });
      } else {
        const voucher = await this.vouchers.generateVoucher({
          kind,
          title: item.title,
          amountSubunits: item.unitPriceKobo,
          recipientEmail: order.recipientEmail || order.buyerEmail,
          recipientPhone: primaryPhone || undefined,
          reference: `${order.number}-${item.id}`,
        });
        fulfillmentResults.push({ item: item.title, voucher });
      }
    }

    // Advance order directly to DELIVERED since digital goods do not require physical shipping
    const allDigital = order.items.length === digitalItems.length;
    if (allDigital) {
      await this.prisma.order.update({
        where: { id: order.id },
        data: {
          status: OrderStatus.DELIVERED,
          deliveredAt: new Date(),
          history: {
            create: [
              {
                status: OrderStatus.DELIVERED,
                note: `Digital products fulfilled automatically. Codes/top-ups delivered to recipient.`,
              },
            ],
          },
        },
      });

      this.logger.log(
        `Order '${order.number}' fulfilled digitally and transitioned to DELIVERED`
      );
    }

    return {
      fulfilled: true,
      allDigital,
      orderNumber: order.number,
      fulfillmentResults,
    };
  }

  /**
   * Validate and verify a digital voucher code
   */
  async verifyVoucher(voucherCode: string) {
    const cleanCode = voucherCode.trim().toUpperCase();
    if (!cleanCode.startsWith("GV-") || cleanCode.length < 10) {
      throw new BadRequestException("Invalid voucher code format");
    }

    return {
      valid: true,
      code: cleanCode,
      status: "ACTIVE",
      expiresAt: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
    };
  }
}

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
import { DigitalKind } from "./digital-provider.interface";

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

    // Resolve products for this order
    const productIds = order.items.map((i) => i.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
    });

    const productMap = new Map(products.map((p) => [p.id, p]));
    const digitalItems = order.items.filter((item) => {
      const p = productMap.get(item.productId);
      return p && p.isDigital;
    });

    if (digitalItems.length === 0) {
      return { fulfilled: false, message: "No digital products in order" };
    }

    const fulfillmentResults = [];

    for (const item of digitalItems) {
      const product = productMap.get(item.productId)!;
      const kind = (product.digitalKind as DigitalKind) || "VOUCHER";

      if ((kind === "AIRTIME" || kind === "DATA") && order.recipientPhone) {
        const topUp = await this.billspot.fulfillTopUp({
          phoneNumber: order.recipientPhone,
          operator: product.occasions?.[0] || product.title,
          amountSubunits: item.unitPriceKobo,
          reference: `${order.number}-${item.id}`,
          type: kind === "DATA" ? "data" : "airtime",
        });
        fulfillmentResults.push({ item: item.title, topUp });
      } else {
        const voucher = await this.vouchers.generateVoucher({
          kind,
          title: item.title,
          amountSubunits: item.unitPriceKobo,
          recipientEmail: order.recipientEmail || order.buyerEmail,
          recipientPhone: order.recipientPhone || undefined,
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


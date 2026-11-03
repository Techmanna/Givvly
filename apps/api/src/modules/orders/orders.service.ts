import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Logger,
} from "@nestjs/common";
import { PrismaService } from "../../infra/prisma/prisma.service";
import { PaymentGatewayRegistry } from "../../infra/payments/payment-gateway.registry";
import { OrderStatus, PaymentStatus, DisputeStatus, Direction } from "@prisma/client";
import { LedgerService } from "../ledger/ledger.service";
import { CreateOrderDto } from "./dto/create-order.dto";
import { ReviewOrderDto, DisputeOrderDto } from "./dto/order-feedback.dto";
import { canOrderTransition } from "./order-state-machine";
import { generateOrderWhatsAppLink } from "./utils/whatsapp-order.util";
import * as crypto from "crypto";

const PACKAGING_EXTRA_KOBO: Record<string, number> = {
  "blush-gold": 0,
  "woven-cane": 850_000, // ₦8,500
  "midnight-plum": 500_000, // ₦5,000
  "minimalist-kraft": 0,
};

const STANDARD_DELIVERY_FEE_KOBO = 250_000; // ₦2,500
const FREE_DELIVERY_THRESHOLD_KOBO = 10_000_000; // ₦100,000

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentGatewayRegistry: PaymentGatewayRegistry,
    private readonly ledger: LedgerService
  ) {}

  /**
   * Direct checkout for gift items / boxes
   */
  async createOrder(
    dto: CreateOrderDto,
    user?: { id: string; email: string; name?: string }
  ) {
    const buyerEmail =
      user?.email ||
      dto.buyerEmail ||
      dto.recipient?.email ||
      "guest@givvly.ng";

    // Resolve items
    const rawItems: Array<{ productId: string; qty: number }> = [];
    if (dto.items && dto.items.length > 0) {
      rawItems.push(...dto.items);
    } else if (dto.productId) {
      rawItems.push({ productId: dto.productId, qty: dto.qty || 1 });
    } else if (dto.productSlug) {
      const prod = await this.prisma.product.findUnique({
        where: { slug: dto.productSlug },
      });
      if (!prod) {
        throw new NotFoundException(`Product '${dto.productSlug}' not found`);
      }
      rawItems.push({ productId: prod.id, qty: dto.qty || 1 });
    } else {
      throw new BadRequestException("At least one product item is required");
    }

    // Fetch products and verify availability
    const productIds = rawItems.map((i) => i.productId);
    const products = await this.prisma.product.findMany({
      where: {
        id: { in: productIds },
        active: true,
      },
    });

    if (products.length !== productIds.length) {
      throw new BadRequestException("One or more selected products are inactive or do not exist");
    }

    const productMap = new Map(products.map((p) => [p.id, p]));

    // Check stock
    for (const item of rawItems) {
      const p = productMap.get(item.productId)!;
      if (p.stock !== null && p.stock < item.qty) {
        throw new ConflictException(
          `Product '${p.title}' has insufficient stock (available: ${p.stock})`
        );
      }
    }

    // Calculate subtotal
    let subtotalKobo = 0;
    const orderItemsData = rawItems.map((item) => {
      const p = productMap.get(item.productId)!;
      const unitPriceKobo = p.priceKobo;
      subtotalKobo += unitPriceKobo * item.qty;
      return {
        productId: p.id,
        title: p.title,
        unitPriceKobo,
        qty: item.qty,
      };
    });

    // Calculate packaging fee
    const packagingId = dto.packagingId || "blush-gold";
    const packagingExtraKobo =
      (PACKAGING_EXTRA_KOBO[packagingId] ?? 0) + (dto.wrapping ? 250_000 : 0);

    // Calculate delivery fee (free if all products digital or subtotal exceeds threshold)
    const allDigital = products.every((p) => p.isDigital);
    const deliveryFeeKobo =
      allDigital || subtotalKobo >= FREE_DELIVERY_THRESHOLD_KOBO
        ? 0
        : STANDARD_DELIVERY_FEE_KOBO;

    const totalKobo = subtotalKobo + deliveryFeeKobo + packagingExtraKobo;
    const currency = (dto.currency || "NGN").toUpperCase();

    // Generate unique order number and tracking token
    const orderYear = new Date().getFullYear();
    const orderHex = crypto.randomBytes(3).toString("hex").toUpperCase();
    const orderNumber = `GV-${orderYear}-${orderHex}`;
    const trackingToken = `trk_${crypto.randomBytes(12).toString("hex")}`;
    const paymentReference = `ord_${crypto.randomBytes(12).toString("hex")}`;
    const recipientName =
      dto.recipient?.name || dto.recipientName || "Valued Recipient";
    const recipientPhone = dto.recipient?.phone || dto.recipientPhone;
    const recipientEmail = dto.recipient?.email;

    // Create Order, OrderItems, OrderStatusHistory and Payment record in a transaction
    const { order, payment } = await this.prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          number: orderNumber,
          buyerUserId: user?.id,
          buyerEmail,
          eventId: dto.eventId,
          recipientName,
          recipientPhone,
          recipientEmail,
          address: dto.address ? (dto.address as any) : undefined,
          giftNote: dto.giftNote,
          wrapStyle: dto.wrapStyle || packagingId,
          status: OrderStatus.PENDING_PAYMENT,
          subtotalKobo: subtotalKobo + packagingExtraKobo,
          deliveryFeeKobo,
          totalKobo,
          trackingToken,
          items: {
            create: orderItemsData,
          },
          history: {
            create: [
              {
                status: OrderStatus.PENDING_PAYMENT,
                note: "Order created, awaiting payment authorization",
                actorId: user?.id,
              },
            ],
          },
        },
        include: {
          items: true,
        },
      });

      const newPayment = await tx.payment.create({
        data: {
          reference: paymentReference,
          currency,
          amountKobo: totalKobo,
          feeKobo: 0,
          status: PaymentStatus.INITIATED,
          payerEmail: buyerEmail,
          provider: "PAYSTACK",
          metadata: {
            orderId: newOrder.id,
            orderNumber: newOrder.number,
            itemsCount: orderItemsData.length,
            payerName: user?.name || "Direct Customer",
          },
        },
      });

      await tx.order.update({
        where: { id: newOrder.id },
        data: { paymentId: newPayment.id },
      });

      return { order: newOrder, payment: newPayment };
    });

    // Initialize Payment Gateway
    const gateway = this.paymentGatewayRegistry.getGateway("PAYSTACK");
    const paymentInit = await gateway.initializePayment({
      reference: payment.reference,
      amountSubunits: payment.amountKobo,
      customerEmail: buyerEmail,
      customerName: user?.name,
      currency,
      metadata: {
        orderId: order.id,
        orderNumber: order.number,
        buyerUserId: user?.id,
      },
    });

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        accessCode: paymentInit.accessCode,
      },
    });

    const whatsappLink = generateOrderWhatsAppLink({
      orderNumber: order.number,
      trackingToken: order.trackingToken,
      items: orderItemsData,
      totalKobo,
      currency,
      recipientName,
      deliveryCity: dto.address?.city,
      giftNote: dto.giftNote,
    });

    this.logger.log(
      `Order created: number=${order.number}, total=${totalKobo} ${currency}, ref=${payment.reference}`
    );

    return {
      order: {
        id: order.id,
        number: order.number,
        status: order.status,
        subtotalKobo: order.subtotalKobo,
        deliveryFeeKobo: order.deliveryFeeKobo,
        totalKobo: order.totalKobo,
        trackingToken: order.trackingToken,
        recipientName: order.recipientName,
        items: order.items,
        createdAt: order.createdAt,
      },
      payment: {
        reference: payment.reference,
        accessCode: paymentInit.accessCode,
        authorizationUrl: paymentInit.authorizationUrl,
        amountKobo: totalKobo,
        currency,
      },
      whatsappLink,
    };
  }

  /**
   * Re-initialize payment for a PENDING_PAYMENT order
   */
  async repayOrder(orderId: string, user?: { id: string; email: string }) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true, payment: true },
    });

    if (!order) {
      throw new NotFoundException(`Order with id '${orderId}' not found`);
    }

    if (user && order.buyerUserId && order.buyerUserId !== user.id) {
      throw new ForbiddenException("You cannot pay for this order");
    }

    if (order.status !== OrderStatus.PENDING_PAYMENT) {
      throw new BadRequestException(
        `Order is not awaiting payment (status: ${order.status})`
      );
    }

    const newReference = `ord_${crypto.randomBytes(12).toString("hex")}`;
    const currency = order.payment?.currency || "NGN";

    const gateway = this.paymentGatewayRegistry.getGateway("PAYSTACK");
    const paymentInit = await gateway.initializePayment({
      reference: newReference,
      amountSubunits: order.totalKobo,
      customerEmail: order.buyerEmail,
      currency,
      metadata: {
        orderId: order.id,
        orderNumber: order.number,
        buyerUserId: user?.id,
      },
    });

    const newPayment = await this.prisma.payment.create({
      data: {
        reference: newReference,
        currency,
        amountKobo: order.totalKobo,
        feeKobo: 0,
        status: PaymentStatus.INITIATED,
        payerEmail: order.buyerEmail,
        accessCode: paymentInit.accessCode,
        provider: "PAYSTACK",
        metadata: {
          orderId: order.id,
          orderNumber: order.number,
        },
      },
    });

    await this.prisma.order.update({
      where: { id: order.id },
      data: { paymentId: newPayment.id },
    });

    return {
      order: {
        id: order.id,
        number: order.number,
        status: order.status,
        subtotalKobo: order.subtotalKobo,
        deliveryFeeKobo: order.deliveryFeeKobo,
        totalKobo: order.totalKobo,
        trackingToken: order.trackingToken,
        recipientName: order.recipientName,
        items: (order.items || []).map((i) => ({
          name: i.title,
          title: i.title,
          qty: i.qty,
          unitPriceKobo: i.unitPriceKobo,
        })),
        createdAt: order.createdAt,
      },
      reference: newReference,
      accessCode: paymentInit.accessCode,
      authorizationUrl: paymentInit.authorizationUrl,
      amountKobo: order.totalKobo,
      currency,
    };
  }

  /**
   * List orders for authenticated buyer
   */
  async getBuyerOrders(userId: string, status?: OrderStatus) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    const where: any = {
      OR: [
        { buyerUserId: userId },
        ...(user?.email ? [{ buyerEmail: user.email }] : []),
      ],
    };
    if (status) {
      where.status = status;
    }

    const orders = await this.prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        items: true,
        history: { orderBy: { createdAt: "asc" } },
        review: true,
        disputes: true,
      },
    });

    return orders.map((order) => ({
      ...order,
      items: (order.items || []).map((i) => ({
        ...i,
        name: i.title,
      })),
      timeline: (order.history || []).map((h) => ({
        status: h.status,
        at:
          typeof h.createdAt === "string"
            ? h.createdAt
            : h.createdAt?.toISOString?.() ?? String(h.createdAt),
      })),
    }));
  }

  /**
   * Get order details by ID
   */
  async getOrderById(orderId: string, user: { id: string; role: string }) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        history: { orderBy: { createdAt: "asc" } },
        review: true,
        disputes: true,
      },
    });

    if (!order) {
      throw new NotFoundException(`Order with id '${orderId}' not found`);
    }

    const userObj = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { email: true },
    });

    if (
      user.role !== "ADMIN" &&
      order.buyerUserId &&
      order.buyerUserId !== user.id &&
      order.buyerEmail !== userObj?.email
    ) {
      throw new ForbiddenException("You do not have access to this order");
    }

    return {
      ...order,
      items: (order.items || []).map((i) => ({
        ...i,
        name: i.title,
      })),
      timeline: (order.history || []).map((h) => ({
        status: h.status,
        at:
          typeof h.createdAt === "string"
            ? h.createdAt
            : h.createdAt?.toISOString?.() ?? String(h.createdAt),
      })),
    };
  }

  /**
   * Verify and confirm payment for an order
   */
  async verifyOrderPayment(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { payment: true, items: true },
    });

    if (!order) {
      throw new NotFoundException(`Order with id '${orderId}' not found`);
    }

    if (
      order.status === OrderStatus.CONFIRMED ||
      order.status === OrderStatus.PACKED ||
      order.status === OrderStatus.SHIPPED ||
      order.status === OrderStatus.DELIVERED
    ) {
      return { order, verified: true, status: order.status };
    }

    if (!order.payment) {
      throw new BadRequestException("No payment associated with this order");
    }

    const gateway = this.paymentGatewayRegistry.getGateway("PAYSTACK");
    const verifyRes = await gateway.verifyPayment(order.payment.reference);

    if (verifyRes.status === "success") {
      await this.prisma.$transaction(async (tx) => {
        await tx.payment.update({
          where: { id: order.payment!.id },
          data: {
            status: PaymentStatus.SUCCESS,
            paidAt: new Date(),
            channel: verifyRes.channel || "card",
            providerFeeKobo: verifyRes.feesSubunits,
          },
        });

        await tx.order.update({
          where: { id: order.id },
          data: {
            status: OrderStatus.CONFIRMED,
            history: {
              create: [
                {
                  status: OrderStatus.CONFIRMED,
                  note: `Payment verified successfully via ${gateway.providerName} (ref: ${order.payment!.reference})`,
                },
              ],
            },
          },
        });

        // Decrement stock for tracked products
        for (const item of order.items) {
          const product = await tx.product.findUnique({
            where: { id: item.productId },
          });
          if (product && product.stock !== null) {
            await tx.product.update({
              where: { id: item.productId },
              data: {
                stock: Math.max(0, product.stock - item.qty),
              },
            });
          }
        }

        // Post balanced ledger capture
        const currency = order.payment?.currency || "NGN";
        await this.ledger.postTransaction(
          {
            reference: `payment:${order.payment!.id}:order_capture`,
            kind: "PAYMENT_CAPTURE",
            description: `Direct Order ${order.number} capture (${currency}) via ${gateway.providerName}`,
            paymentId: order.payment!.id,
            entries: [
              {
                accountCode: `PROVIDER_CLEARING:${currency}`,
                direction: Direction.DEBIT,
                amountKobo: order.payment!.amountKobo,
              },
              {
                accountCode: `PLATFORM_REVENUE:${currency}`,
                direction: Direction.CREDIT,
                amountKobo: order.payment!.amountKobo,
              },
            ],
          },
          tx
        );
      });

      const updated = await this.prisma.order.findUnique({
        where: { id: order.id },
        include: { items: true, history: true },
      });

      return { order: updated, verified: true, status: OrderStatus.CONFIRMED };
    }

    return { order, verified: false, status: order.status };
  }

  /**
   * Cancel an order (Buyer can cancel if PENDING_PAYMENT or CONFIRMED before PACKED)
   */
  async cancelOrder(
    orderId: string,
    user: { id: string; role: string },
    reason?: string
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) {
      throw new NotFoundException(`Order with id '${orderId}' not found`);
    }

    const isAuthorized =
      user.role === "ADMIN" || order.buyerUserId === user.id;
    if (!isAuthorized) {
      throw new ForbiddenException("You cannot cancel this order");
    }

    const role = user.role === "ADMIN" ? "ADMIN" : "BUYER";
    const allowed = canOrderTransition(order.status, OrderStatus.CANCELLED, role);
    if (!allowed) {
      throw new ConflictException(
        `Order cannot be cancelled from current status '${order.status}'`
      );
    }

    return this.prisma.$transaction(async (tx) => {
      // If order was already confirmed, restore product stock
      if (order.status === OrderStatus.CONFIRMED) {
        for (const item of order.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.qty } },
          });
        }
      }

      const updated = await tx.order.update({
        where: { id: order.id },
        data: {
          status: OrderStatus.CANCELLED,
          history: {
            create: [
              {
                status: OrderStatus.CANCELLED,
                note: reason || `Cancelled by ${role.toLowerCase()}`,
                actorId: user.id,
              },
            ],
          },
        },
        include: { items: true, history: true },
      });

      return updated;
    });
  }

  /**
   * Add a review for a DELIVERED order
   */
  async createReview(
    orderId: string,
    userId: string,
    dto: ReviewOrderDto
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true, review: true },
    });

    if (!order) {
      throw new NotFoundException(`Order with id '${orderId}' not found`);
    }

    if (order.buyerUserId !== userId) {
      throw new ForbiddenException("Only the order buyer can write a review");
    }

    if (order.status !== OrderStatus.DELIVERED) {
      throw new BadRequestException("Reviews can only be submitted after delivery");
    }

    if (order.review) {
      throw new ConflictException("A review has already been submitted for this order");
    }

    return this.prisma.$transaction(async (tx) => {
      const review = await tx.review.create({
        data: {
          orderId: order.id,
          userId,
          vendorId: order.vendorId || "givvly-curated",
          rating: dto.rating,
          comment: dto.comment,
        },
      });

      // Update rating for the products in this order
      for (const item of order.items) {
        const prod = await tx.product.findUnique({
          where: { id: item.productId },
        });
        if (prod) {
          const currentCount = prod.ratingCount;
          const newCount = currentCount + 1;
          const newAvg = (prod.ratingAvg * currentCount + dto.rating) / newCount;

          await tx.product.update({
            where: { id: item.productId },
            data: {
              ratingAvg: Math.round(newAvg * 10) / 10,
              ratingCount: newCount,
            },
          });
        }
      }

      return review;
    });
  }

  /**
   * Open a dispute on an order (within 14 days of delivery or while shipped)
   */
  async createDispute(
    orderId: string,
    userId: string,
    dto: DisputeOrderDto
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException(`Order with id '${orderId}' not found`);
    }

    if (order.buyerUserId !== userId) {
      throw new ForbiddenException("Only the order buyer can open a dispute");
    }

    const allowed = canOrderTransition(order.status, OrderStatus.DISPUTED, "BUYER");
    if (!allowed) {
      throw new ConflictException(
        `Disputes can only be opened for shipped or delivered orders (current status: ${order.status})`
      );
    }

    // Check 14-day window if delivered
    if (order.deliveredAt) {
      const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
      if (order.deliveredAt < fourteenDaysAgo) {
        throw new BadRequestException("The 14-day dispute window for this order has expired");
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const dispute = await tx.dispute.create({
        data: {
          orderId: order.id,
          openedById: userId,
          type: dto.type,
          description: dto.description,
          status: DisputeStatus.OPEN,
        },
      });

      await tx.order.update({
        where: { id: order.id },
        data: {
          status: OrderStatus.DISPUTED,
          history: {
            create: [
              {
                status: OrderStatus.DISPUTED,
                note: `Dispute opened: ${dto.type} - ${dto.description.substring(0, 80)}...`,
                actorId: userId,
              },
            ],
          },
        },
      });

      return dispute;
    });
  }

  /**
   * Public tracking by unguessable trackingToken or order number
   */
  async trackOrderByToken(token: string) {
    const include = {
      items: {
        select: {
          title: true,
          qty: true,
          unitPriceKobo: true,
        },
      },
      history: {
        select: {
          status: true,
          note: true,
          createdAt: true,
        },
        orderBy: { createdAt: "asc" as const },
      },
    };

    const order =
      typeof this.prisma.order.findFirst === "function"
        ? await this.prisma.order.findFirst({
            where: {
              OR: [{ trackingToken: token }, { number: token }, { id: token }],
            },
            include,
          })
        : await this.prisma.order.findUnique({
            where: { trackingToken: token },
            include,
          });

    if (!order) {
      throw new NotFoundException("Order tracking record not found");
    }

    const address = order.address as any;
    const deliveryCity = address?.city;
    const deliveryState = address?.state;

    return {
      id: order.id,
      number: order.number,
      orderNumber: order.number,
      status: order.status,
      recipientName: order.recipientName,
      deliveryLocation:
        deliveryCity && deliveryState
          ? `${deliveryCity}, ${deliveryState}`
          : undefined,
      items: (order.items || []).map((i) => ({
        name: i.title,
        title: i.title,
        qty: i.qty,
        unitPriceKobo: i.unitPriceKobo,
      })),
      history: order.history,
      timeline: (order.history || []).map((h) => ({
        status: h.status,
        at:
          typeof h.createdAt === "string"
            ? h.createdAt
            : h.createdAt?.toISOString?.() ?? String(h.createdAt),
      })),
      totalKobo: order.totalKobo,
      createdAt: order.createdAt,
      deliveredAt: order.deliveredAt,
      whatsappSupportLink: generateOrderWhatsAppLink({
        orderNumber: order.number,
        trackingToken: order.trackingToken,
        items: order.items,
        totalKobo: order.totalKobo,
        recipientName: order.recipientName,
        deliveryCity,
      }),
    };
  }
}

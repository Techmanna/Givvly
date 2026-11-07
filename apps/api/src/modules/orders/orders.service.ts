import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Logger,
  Optional,
} from "@nestjs/common";
import { PrismaService } from "../../infra/prisma/prisma.service";
import { PaymentGatewayRegistry } from "../../infra/payments/payment-gateway.registry";
import { OrderStatus, PaymentStatus, DisputeStatus, Direction } from "@prisma/client";
import { LedgerService } from "../ledger/ledger.service";
import { DigitalGiftsService } from "../digital-gifts/digital-gifts.service";
import { NotificationsService } from "../notifications/notifications.service";
import { CreateOrderDto } from "./dto/create-order.dto";
import { ReviewOrderDto, DisputeOrderDto } from "./dto/order-feedback.dto";
import { canOrderTransition } from "./order-state-machine";
import { generateOrderWhatsAppLink } from "./utils/whatsapp-order.util";
import * as crypto from "crypto";

const STANDARD_DELIVERY_FEE_KOBO = 250_000; // ₦2,500
const FREE_DELIVERY_THRESHOLD_KOBO = 10_000_000; // ₦100,000

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentGatewayRegistry: PaymentGatewayRegistry,
    private readonly ledger: LedgerService,
    @Optional() private readonly digitalGifts?: DigitalGiftsService,
    @Optional() private readonly notifications?: NotificationsService
  ) { }

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
      "guest@givvly.vercel.app";

    const recipientPhones = Array.isArray(dto.recipientPhones)
      ? dto.recipientPhones.map((p) => p.trim()).filter(Boolean).slice(0, 50)
      : [];

    // Resolve items
    const rawItems: Array<{ productId: string; qty: number }> = [];
    if (dto.items && dto.items.length > 0) {
      rawItems.push(...dto.items);
    } else if (dto.productId) {
      rawItems.push({ productId: dto.productId, qty: dto.qty || 1 });
    } else if (dto.productSlug || dto.vtuType) {
      const isVtuSlug =
        Boolean(dto.vtuType) ||
        dto.productSlug === "airtime" ||
        dto.productSlug === "data" ||
        dto.productSlug?.startsWith("billspot-vtu-");
      const effectiveVtuType =
        dto.vtuType ||
        (dto.productSlug?.includes("data") ? "data" : "airtime");
      const slugToFind = isVtuSlug
        ? `billspot-vtu-${effectiveVtuType}-${(dto.vtuProvider || "mtn").toLowerCase()}`
        : dto.productSlug!;
      let prod = await this.prisma.product.findUnique({
        where: { slug: slugToFind },
      });

      if (!prod && isVtuSlug) {
        const isData = effectiveVtuType === "data";
        const providerUpper = (dto.vtuProvider || "MTN").toUpperCase();
        prod = await this.prisma.product.create({
          data: {
            slug: slugToFind,
            title: `${providerUpper} Instant ${isData ? "Data Bundle" : "Airtime Top-Up"}`,
            description: `Instant ${providerUpper} ${isData ? "mobile data bundle" : "airtime top-up"} delivered via BillSpot VTU.`,
            priceKobo: dto.customAmountKobo || 500_000,
            images: [],
            occasions: [dto.vtuProvider || "mtn", "Digital", "Instant"],
            relationships: ["Anyone"],
            isDigital: true,
            digitalKind: isData ? "DATA" : "AIRTIME",
            active: true,
          },
        });
      }

      if (!prod) {
        throw new NotFoundException(`Product '${slugToFind}' not found`);
      }
      rawItems.push({ productId: prod.id, qty: dto.qty || 1 });
    } else {
      throw new BadRequestException("At least one product item is required");
    }

    // Fetch products and verify availability (deduplicated IDs)
    const productIds = Array.from(new Set(rawItems.map((i) => i.productId)));
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

    // Aggregate requested quantity per productId and check stock
    const requestedQtyByProduct = new Map<string, number>();
    for (const item of rawItems) {
      requestedQtyByProduct.set(
        item.productId,
        (requestedQtyByProduct.get(item.productId) ?? 0) + item.qty
      );
    }

    for (const [prodId, totalQty] of requestedQtyByProduct.entries()) {
      const p = productMap.get(prodId)!;
      if (p.stock !== null && p.stock < totalQty) {
        throw new ConflictException(
          `Product '${p.title}' has insufficient stock (available: ${p.stock})`
        );
      }
    }

    // Resolve optional BillSpot data plan or custom airtime pricing
    let resolvedVtuPlanTitle: string | undefined;
    let resolvedUnitVtuKobo: number | undefined = dto.customAmountKobo;

    if (dto.vtuType === "data" && dto.billItemIdentifier && this.digitalGifts) {
      const plansRes = await this.digitalGifts.getVtuPlans(dto.vtuProvider || "mtn");
      const matched = plansRes.plans.find(
        (pl) => pl.bill_item_identifier === dto.billItemIdentifier
      );
      if (matched) {
        resolvedUnitVtuKobo = Math.round(matched.amount * 100);
        resolvedVtuPlanTitle = `${plansRes.provider.name} ${matched.name}`;
      }
    } else if (dto.vtuType === "airtime" && dto.customAmountKobo) {
      const providerLabel = (dto.vtuProvider || "MTN").toUpperCase();
      resolvedVtuPlanTitle = `${providerLabel} ₦${Math.round(dto.customAmountKobo / 100).toLocaleString()} Airtime Top-Up`;
    }

    const phonesCount = Math.max(1, recipientPhones.length);

    // Calculate subtotal
    let subtotalKobo = 0;
    const orderItemsData = rawItems.map((item) => {
      const p = productMap.get(item.productId)!;
      const isVtuItem =
        Boolean(dto.vtuType) ||
        p.digitalKind === "AIRTIME" ||
        p.digitalKind === "DATA";
      const baseUnitPriceKobo =
        isVtuItem && resolvedUnitVtuKobo ? resolvedUnitVtuKobo : p.priceKobo;
      const effectiveQty = isVtuItem && phonesCount > 1 ? phonesCount : item.qty;
      subtotalKobo += baseUnitPriceKobo * effectiveQty;
      return {
        productId: p.id,
        title: isVtuItem && resolvedVtuPlanTitle ? resolvedVtuPlanTitle : p.title,
        unitPriceKobo: baseUnitPriceKobo,
        qty: effectiveQty,
      };
    });

    // Calculate optional gift wrapping fee
    const allDigital = products.every((p) => p.isDigital) || Boolean(dto.vtuType);
    const packagingId = dto.packagingId || "standard";
    const packagingExtraKobo = allDigital ? 0 : dto.wrapping ? 250_000 : 0;

    // Calculate delivery fee (free if all products digital or subtotal exceeds threshold)
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
    const recipientPhone =
      dto.recipient?.phone || dto.recipientPhone || recipientPhones[0];
    const recipientEmail = dto.recipient?.email;

    const addressPayload =
      dto.address || dto.vtuType || dto.vtuProvider || dto.billItemIdentifier || recipientPhones.length > 0
        ? {
          ...(dto.address ? (dto.address as any) : {}),
          ...(dto.vtuType ? { vtuType: dto.vtuType } : {}),
          ...(dto.vtuProvider ? { vtuProvider: dto.vtuProvider } : {}),
          ...(dto.billItemIdentifier ? { billItemIdentifier: dto.billItemIdentifier } : {}),
          ...(resolvedUnitVtuKobo ? { unitVtuAmountKobo: resolvedUnitVtuKobo } : {}),
          ...(recipientPhones.length > 0 ? { recipientPhones } : {}),
        }
        : undefined;

    // Initialize Payment Gateway before DB transaction to avoid holding DB locks over HTTP I/O
    // and to eliminate post-creation update round trips
    const gateway = this.paymentGatewayRegistry.getGateway("PAYSTACK");
    const paymentInit = await gateway.initializePayment({
      reference: paymentReference,
      amountSubunits: totalKobo,
      customerEmail: buyerEmail,
      customerName: user?.name,
      currency,
      metadata: {
        orderNumber,
        buyerUserId: user?.id,
      },
    });

    // Create Payment, Order, OrderItems, and OrderStatusHistory atomically in a single transaction
    const { order, payment } = await this.prisma.$transaction(async (tx) => {
      const newPayment = await tx.payment.create({
        data: {
          reference: paymentReference,
          currency,
          amountKobo: totalKobo,
          feeKobo: 0,
          status: PaymentStatus.INITIATED,
          accessCode: paymentInit.accessCode,
          authorizationUrl: paymentInit.authorizationUrl,
          payerEmail: buyerEmail,
          provider: "PAYSTACK",
          metadata: {
            orderNumber,
            itemsCount: orderItemsData.length,
            payerName: user?.name || "Direct Customer",
          },
        },
      });

      const newOrder = await tx.order.create({
        data: {
          number: orderNumber,
          buyerUserId: user?.id,
          buyerEmail,
          eventId: dto.eventId,
          recipientName,
          recipientPhone,
          recipientEmail,
          address: addressPayload as any,
          giftNote: dto.giftNote,
          wrapStyle: dto.wrapStyle || packagingId,
          status: OrderStatus.PENDING_PAYMENT,
          subtotalKobo: subtotalKobo + packagingExtraKobo,
          deliveryFeeKobo,
          totalKobo,
          paymentId: newPayment.id,
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

      return { order: newOrder, payment: newPayment };
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

    await this.prisma.$transaction(async (tx) => {
      const newPayment = await tx.payment.create({
        data: {
          reference: newReference,
          currency,
          amountKobo: order.totalKobo,
          feeKobo: 0,
          status: PaymentStatus.INITIATED,
          payerEmail: order.buyerEmail,
          accessCode: paymentInit.accessCode,
          authorizationUrl: paymentInit.authorizationUrl,
          provider: "PAYSTACK",
          metadata: {
            orderId: order.id,
            orderNumber: order.number,
          },
        },
      });

      await tx.order.update({
        where: { id: order.id },
        data: { paymentId: newPayment.id },
      });
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

    if (
      user.role !== "ADMIN" &&
      order.buyerUserId &&
      order.buyerUserId !== user.id
    ) {
      const userObj = await this.prisma.user?.findUnique({
        where: { id: user.id },
        select: { email: true },
      });
      if (order.buyerEmail !== userObj?.email) {
        throw new ForbiddenException("You do not have access to this order");
      }
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
      let updatedOrder = await this.prisma.$transaction(async (tx) => {
        await tx.payment.update({
          where: { id: order.payment!.id },
          data: {
            status: PaymentStatus.SUCCESS,
            paidAt: new Date(),
            channel: verifyRes.channel || "card",
            providerFeeKobo: verifyRes.feesSubunits,
          },
        });

        const confirmedOrder = await tx.order.update({
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
          include: { items: true, history: true },
        });

        // Batch fetch and concurrently decrement stock for tracked products
        const itemProductIds = Array.from(
          new Set(order.items.map((item) => item.productId))
        );
        const products =
          typeof tx.product.findMany === "function"
            ? await tx.product.findMany({
              where: { id: { in: itemProductIds } },
              select: { id: true, stock: true },
            })
            : (
              await Promise.all(
                itemProductIds.map((id) =>
                  tx.product.findUnique({ where: { id } })
                )
              )
            ).filter(Boolean);
        const productById = new Map(
          (products as Array<{ id: string; stock: number | null }>).map((p) => [
            p.id,
            p,
          ])
        );

        await Promise.all(
          order.items.map(async (item) => {
            const product = productById.get(item.productId);
            if (product && product.stock !== null) {
              await tx.product.update({
                where: { id: item.productId },
                data: {
                  stock: Math.max(0, product.stock - item.qty),
                },
              });
            }
          })
        );

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

        return confirmedOrder;
      });

      if (this.digitalGifts) {
        try {
          const digitalRes = await this.digitalGifts.fulfillDigitalOrder(order.id);
          if (digitalRes.fulfilled) {
            updatedOrder =
              (await this.prisma.order.findUnique({
                where: { id: order.id },
                include: { items: true, history: true },
              })) ?? updatedOrder;
          }
        } catch (err: any) {
          this.logger.warn(
            `Digital fulfillment after verifyOrderPayment encountered an error for order ${order.number}: ${err.message}`
          );
        }
      }

      if (this.notifications && order.buyerEmail) {
        try {
          const trackingUrl = `https://givvly.vercel.app/track/${order.trackingToken}`;
          await this.notifications.sendOrderConfirmedEmail(
            order.buyerEmail,
            order.buyerUserId || undefined,
            order.recipientName || "Valued Customer",
            order.number,
            order.totalKobo,
            order.payment?.currency || "NGN",
            trackingUrl
          );
        } catch (err: any) {
          this.logger.warn(
            `Could not dispatch order confirmation email for ${order.number}: ${err.message}`
          );
        }
      }

      return {
        order: updatedOrder,
        verified: true,
        status: updatedOrder?.status || OrderStatus.CONFIRMED,
      };
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
      // If order was already confirmed, restore product stock concurrently
      if (order.status === OrderStatus.CONFIRMED) {
        await Promise.all(
          order.items.map((item) =>
            tx.product.update({
              where: { id: item.productId },
              data: { stock: { increment: item.qty } },
            })
          )
        );
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
      const itemProductIds = Array.from(
        new Set(order.items.map((item) => item.productId))
      );

      const [review, products] = await Promise.all([
        tx.review.create({
          data: {
            orderId: order.id,
            userId,
            vendorId: order.vendorId || "givvly-curated",
            rating: dto.rating,
            comment: dto.comment,
          },
        }),
        typeof tx.product.findMany === "function"
          ? tx.product.findMany({
            where: { id: { in: itemProductIds } },
            select: { id: true, ratingAvg: true, ratingCount: true },
          })
          : Promise.all(
            itemProductIds.map((id) =>
              tx.product.findUnique({ where: { id } })
            )
          ),
      ]);

      const productMap = new Map(
        (products ?? [])
          .filter(Boolean)
          .map((p: any) => [p.id, p])
      );

      // Update rating for all products in this order concurrently
      await Promise.all(
        itemProductIds.map(async (productId) => {
          const prod = productMap.get(productId);
          if (prod) {
            const currentCount = prod.ratingCount ?? 0;
            const currentAvg = prod.ratingAvg ?? 0;
            const newCount = currentCount + 1;
            const newAvg = (currentAvg * currentCount + dto.rating) / newCount;

            await tx.product.update({
              where: { id: productId },
              data: {
                ratingAvg: Math.round(newAvg * 10) / 10,
                ratingCount: newCount,
              },
            });
          }
        })
      );

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

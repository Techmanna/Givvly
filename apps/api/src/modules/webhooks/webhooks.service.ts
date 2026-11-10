import {
  Injectable,
  Logger,
  Optional,
  UnauthorizedException,
} from "@nestjs/common";
import { PrismaService } from "@/infra/prisma/prisma.service";
import { PaymentGatewayRegistry } from "@/infra/payments/payment-gateway.registry";
import { NormalizedWebhookEvent } from "@/infra/payments/payment-gateway.interface";
import { LedgerService } from "@/modules/ledger/ledger.service";
import { DigitalGiftsService } from "../digital-gifts/digital-gifts.service";
import { NotificationsService } from "../notifications/notifications.service";
import {
  Direction,
  GiftStatus,
  GiftType,
  ItemStatus,
  OrderStatus,
  PaymentStatus,
  PayoutStatus,
  PoolMode,
  PoolStatus,
  PostStatus,
} from "@prisma/client";
import * as crypto from "node:crypto";

export type WebhookStatus =
  | "RECEIVED"
  | "PROCESSING"
  | "PROCESSED"
  | "FAILED"
  | "IGNORED";

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gatewayRegistry: PaymentGatewayRegistry,
    private readonly ledger: LedgerService,
    @Optional() private readonly digitalGifts?: DigitalGiftsService,
    @Optional() private readonly notifications?: NotificationsService
  ) { }

  /**
   * Generic provider-decoupled webhook entry point
   */
  async handleWebhook(
    providerName: string,
    headers: Record<string, string | string[] | undefined>,
    rawBody: Buffer | string | undefined,
    payload: any
  ) {
    const gateway = this.gatewayRegistry.getGateway(providerName);

    // 1. Decoupled signature verification via adapter
    if (!rawBody || !gateway.verifyWebhookSignature(headers, rawBody)) {
      this.logger.warn(
        `Webhook for provider '${gateway.providerName}' received with invalid cryptographic signature`
      );
      throw new UnauthorizedException("Invalid webhook signature");
    }

    // 2. Parse into provider-agnostic normalized event
    const event: NormalizedWebhookEvent = gateway.parseWebhookEvent(
      headers,
      payload
    );

    if (event.eventType === "UNKNOWN") {
      this.logger.log(`Ignoring unsupported webhook event from ${gateway.providerName}`);
      return { received: true, ignored: true };
    }

    const eventKey = `${event.eventType}:${event.reference}`;
    this.logger.log(
      `Processing webhook from ${gateway.providerName}: type=${event.eventType}, key=${eventKey}`
    );

    // 3. Upsert WebhookEvent for audit and idempotency
    const webhookEvent = await this.prisma.webhookEvent.upsert({
      where: {
        provider_eventKey: {
          provider: gateway.providerName,
          eventKey,
        },
      },
      update: {
        attempts: { increment: 1 },
      },
      create: {
        provider: gateway.providerName,
        eventKey,
        eventType: event.eventType,
        payload: payload,
        status: "PROCESSING",
        attempts: 1,
      },
    });

    if (webhookEvent.status === "PROCESSED") {
      this.logger.log(
        `Webhook '${eventKey}' was already processed. Skipping duplicate execution.`
      );
      return { received: true, alreadyProcessed: true };
    }

    try {
      // 4. Route normalized event
      switch (event.eventType) {
        case "PAYMENT_SUCCESS":
          await this.handlePaymentSuccess(event, gateway.providerName);
          break;

        case "TRANSFER_SUCCESS":
          await this.handleTransferSuccess(event);
          break;

        case "TRANSFER_FAILED":
        case "TRANSFER_REVERSED":
          await this.handleTransferFailed(event);
          break;

        default:
          await this.prisma.webhookEvent.update({
            where: { id: webhookEvent.id },
            data: { status: "IGNORED" },
          });
          return { received: true, ignored: true };
      }

      // Mark processed
      await this.prisma.webhookEvent.update({
        where: { id: webhookEvent.id },
        data: {
          status: "PROCESSED",
          processedAt: new Date(),
        },
      });

      return { received: true, processed: true };
    } catch (err: any) {
      this.logger.error(`Failed to process webhook '${eventKey}':`, err);
      await this.prisma.webhookEvent.update({
        where: { id: webhookEvent.id },
        data: {
          status: "FAILED",
          error: err?.message || String(err),
        },
      });
      throw err;
    }
  }

  /**
   * Backward-compatible entry point for Paystack
   */
  async handlePaystackWebhook(
    signature: string | undefined,
    rawBody: Buffer | string | undefined,
    payload: any
  ) {
    return this.handleWebhook(
      "PAYSTACK",
      { "x-paystack-signature": signature },
      rawBody,
      payload
    );
  }

  /**
   * Process generic payment success: verify amounts & currency, mark gift PAID, post ledger, queue payout
   */
  private async handlePaymentSuccess(
    event: NormalizedWebhookEvent,
    providerName: string
  ) {
    const reference = event.reference;
    const amountSubunits = event.amountSubunits;

    let pendingGiftNotification: {
      payerEmail?: string;
      giverDisplayName: string;
      eventName: string;
      eventSlug?: string;
      eventId?: string;
      amountKobo: number;
      currency: string;
      reference: string;
      message?: string;
      owner?: { id: string; email: string; name: string };
    } | null = null;
    let pendingDigitalOrderId: string | null = null;
    let pendingOrderNotification: {
      buyerEmail: string;
      buyerUserId?: string;
      recipientName: string;
      orderNumber: string;
      totalKobo: number;
      currency: string;
      trackingToken: string;
    } | null = null;

    await this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({
        where: { reference },
        include: {
          order: {
            include: {
              items: true,
            },
          },
          gift: {
            include: {
              event: {
                include: {
                  owner: {
                    include: {
                      payoutAccounts: {
                        where: { isDefault: true },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!payment) {
        throw new Error(
          `Payment with reference '${reference}' not found in database.`
        );
      }

      if (payment.status === PaymentStatus.SUCCESS) {
        this.logger.log(`Payment '${reference}' is already marked SUCCESS.`);
        return;
      }

      // Invariant: Verify amount charged matches expected amount
      if (amountSubunits !== undefined && amountSubunits !== payment.amountKobo) {
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: PaymentStatus.FAILED,
            failureReason: `AMOUNT_MISMATCH: expected ${payment.amountKobo}, received ${amountSubunits}`,
          },
        });
        throw new Error(
          `Security invariant violation: amount mismatch on '${reference}'. Expected ${payment.amountKobo}, got ${amountSubunits}`
        );
      }

      // Invariant: Verify currency matches
      if (
        event.currency &&
        payment.currency &&
        event.currency.toUpperCase() !== payment.currency.toUpperCase()
      ) {
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: PaymentStatus.FAILED,
            failureReason: `CURRENCY_MISMATCH: expected ${payment.currency}, received ${event.currency}`,
          },
        });
        throw new Error(
          `Security invariant violation: currency mismatch on '${reference}'. Expected ${payment.currency}, got ${event.currency}`
        );
      }

      const paidAt = event.paidAt ?? new Date();
      const channel = event.channel || "card";
      const providerFeeKobo =
        typeof event.feesSubunits === "number" ? event.feesSubunits : null;

      // 1. Update Payment status
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.SUCCESS,
          paidAt,
          channel,
          providerFeeKobo,
        },
      });

      const currency = payment.currency || "NGN";

      // 2. If associated with Gift, update Gift & post Ledger
      if (payment.gift) {
        const gift = payment.gift;
        const targetEvent = gift.event;
        const owner = targetEvent?.owner;

        await tx.gift.update({
          where: { id: gift.id },
          data: {
            status: GiftStatus.PAID,
          },
        });

        const ownerId = owner?.id ?? "unknown_owner";

        // 3. Post-capture actions & ledger posting according to gift type
        if (gift.type === GiftType.POOL && gift.poolId) {
          const pool = await tx.pool.findUnique({
            where: { id: gift.poolId },
          });

          if (pool) {
            const newRaised = pool.raisedKobo + gift.amountKobo;
            const isFunded = newRaised >= pool.targetKobo;

            await tx.pool.update({
              where: { id: pool.id },
              data: {
                raisedKobo: { increment: gift.amountKobo },
                status: isFunded ? PoolStatus.FUNDED : pool.status,
              },
            });

            if (pool.mode === PoolMode.PRODUCT) {
              // PRODUCT mode: Hold in POOL_ESCROW
              await this.ledger.postTransaction(
                {
                  reference: `payment:${payment.id}:capture`,
                  kind: "PAYMENT_CAPTURE",
                  description: `Group gift contribution for '${pool.title}' held in escrow (${currency}) via ${providerName}`,
                  paymentId: payment.id,
                  entries: [
                    {
                      accountCode: `PROVIDER_CLEARING:${currency}`,
                      direction: Direction.DEBIT,
                      amountKobo: payment.amountKobo,
                    },
                    {
                      accountCode: `POOL_ESCROW:${pool.id}:${currency}`,
                      direction: Direction.CREDIT,
                      amountKobo: gift.amountKobo,
                    },
                    {
                      accountCode: `PLATFORM_REVENUE:${currency}`,
                      direction: Direction.CREDIT,
                      amountKobo: payment.feeKobo,
                    },
                  ],
                },
                tx
              );

              // Auto-order if pool reached target
              if (isFunded && !pool.orderId) {
                const orderYear = new Date().getFullYear();
                const orderHex = crypto.randomBytes(3).toString("hex").toUpperCase();
                const orderNumber = `GV-${orderYear}-${orderHex}`;
                const trackingToken = `trk_${crypto.randomBytes(12).toString("hex")}`;

                const order = await tx.order.create({
                  data: {
                    number: orderNumber,
                    buyerEmail: payment.payerEmail,
                    eventId: targetEvent?.id,
                    recipientName: targetEvent?.owner.name ?? "Celebration Host",
                    recipientPhone: targetEvent?.owner.phone,
                    recipientEmail: targetEvent?.owner.email,
                    status: OrderStatus.CONFIRMED,
                    subtotalKobo: pool.targetKobo,
                    totalKobo: pool.targetKobo,
                    feeKobo: 0,
                    trackingToken,
                    items: {
                      create: [
                        {
                          productId: pool.productId ?? pool.id,
                          title: pool.title,
                          unitPriceKobo: pool.targetKobo,
                          qty: 1,
                        },
                      ],
                    },
                    history: {
                      create: [
                        {
                          status: OrderStatus.CONFIRMED,
                          note: `Group gift '${pool.title}' reached target, order auto-created`,
                        },
                      ],
                    },
                  },
                });

                await tx.pool.update({
                  where: { id: pool.id },
                  data: { orderId: order.id },
                });

                this.logger.log(
                  `Group gift '${pool.title}' fully funded! Auto-created order ${order.number}`
                );
              }
            } else {
              // CASH mode: Credit host payable directly
              await this.ledger.postTransaction(
                {
                  reference: `payment:${payment.id}:capture`,
                  kind: "PAYMENT_CAPTURE",
                  description: `Group cash contribution for '${pool.title}' (${currency}) via ${providerName}`,
                  paymentId: payment.id,
                  entries: [
                    {
                      accountCode: `PROVIDER_CLEARING:${currency}`,
                      direction: Direction.DEBIT,
                      amountKobo: payment.amountKobo,
                    },
                    {
                      accountCode: `OWNER_PAYABLE:${ownerId}:${currency}`,
                      ownerId,
                      direction: Direction.CREDIT,
                      amountKobo: gift.amountKobo,
                    },
                    {
                      accountCode: `PLATFORM_REVENUE:${currency}`,
                      direction: Direction.CREDIT,
                      amountKobo: payment.feeKobo,
                    },
                  ],
                },
                tx
              );

              if (owner) {
                const payoutAccount = owner.payoutAccounts[0];
                const payoutReference = `payout_${gift.id.replace(/-/g, "")}`;
                const existingPayout = await tx.payout.findUnique({
                  where: { reference: payoutReference },
                });

                if (!existingPayout && payoutAccount) {
                  await tx.payout.create({
                    data: {
                      reference: payoutReference,
                      giftId: gift.id,
                      eventId: targetEvent?.id,
                      poolId: pool.id,
                      userId: owner.id,
                      payoutAccountId: payoutAccount.id,
                      amountKobo: gift.amountKobo,
                      status: PayoutStatus.QUEUED,
                    },
                  });
                }
              }
            }
          }
        } else {
          // Standard Money or Item Gift ledger capture
          await this.ledger.postTransaction(
            {
              reference: `payment:${payment.id}:capture`,
              kind: "PAYMENT_CAPTURE",
              description: `Captured gift for event '${targetEvent?.name ?? "Celebration"}' (${currency}) via ${providerName}`,
              paymentId: payment.id,
              entries: [
                {
                  accountCode: `PROVIDER_CLEARING:${currency}`,
                  direction: Direction.DEBIT,
                  amountKobo: payment.amountKobo,
                },
                {
                  accountCode: `OWNER_PAYABLE:${ownerId}:${currency}`,
                  ownerId,
                  direction: Direction.CREDIT,
                  amountKobo: gift.amountKobo,
                },
                {
                  accountCode: `PLATFORM_REVENUE:${currency}`,
                  direction: Direction.CREDIT,
                  amountKobo: payment.feeKobo,
                },
              ],
            },
            tx
          );

          if (gift.type === GiftType.PRODUCT && gift.registryItemId) {
            // Mark Registry Item CLAIMED
            const registryItem = await tx.registryItem.update({
              where: { id: gift.registryItemId },
              data: {
                status: ItemStatus.CLAIMED,
                claimedGiftId: gift.id,
                reservationToken: null,
                reservedUntil: null,
              },
            });

            // Generate unique Order number & tracking token
            const orderYear = new Date().getFullYear();
            const orderHex = crypto.randomBytes(3).toString("hex").toUpperCase();
            const orderNumber = `GV-${orderYear}-${orderHex}`;
            const trackingToken = `trk_${crypto.randomBytes(12).toString("hex")}`;

            // Create Confirmed Order for fulfillment
            const order = await tx.order.create({
              data: {
                number: orderNumber,
                buyerUserId: gift.giverUserId,
                buyerEmail: payment.payerEmail,
                eventId: targetEvent?.id,
                recipientName: targetEvent?.owner.name ?? "Celebration Host",
                recipientPhone: targetEvent?.owner.phone,
                recipientEmail: targetEvent?.owner.email,
                giftNote: gift.message,
                status: OrderStatus.CONFIRMED,
                subtotalKobo: gift.amountKobo,
                totalKobo: payment.amountKobo,
                feeKobo: payment.feeKobo,
                paymentId: payment.id,
                trackingToken,
                items: {
                  create: [
                    {
                      productId: registryItem.productId ?? registryItem.id,
                      title: registryItem.title,
                      unitPriceKobo: gift.amountKobo,
                      qty: 1,
                    },
                  ],
                },
                history: {
                  create: [
                    {
                      status: OrderStatus.CONFIRMED,
                      note: `Registry gift purchase captured (${payment.reference})`,
                    },
                  ],
                },
              },
            });

            // Link gift to order
            await tx.gift.update({
              where: { id: gift.id },
              data: { orderId: order.id },
            });

            this.logger.log(
              `Registry gift order created: order=${order.number}, item='${registryItem.title}'`
            );
          } else if (gift.type === GiftType.MONEY && owner) {
            // For money gifts, queue host payout
            const payoutAccount = owner.payoutAccounts[0];
            const payoutReference = `payout_${gift.id.replace(/-/g, "")}`;

            const existingPayout = await tx.payout.findUnique({
              where: { reference: payoutReference },
            });

            if (!existingPayout && payoutAccount) {
              await tx.payout.create({
                data: {
                  reference: payoutReference,
                  giftId: gift.id,
                  eventId: targetEvent?.id,
                  userId: owner.id,
                  payoutAccountId: payoutAccount.id,
                  amountKobo: gift.amountKobo,
                  status: PayoutStatus.QUEUED,
                },
              });
              this.logger.log(
                `Payout queued for owner '${owner.id}', amount=${gift.amountKobo} ${currency}`
              );
            }
          }
        }

        // 4. Create Wall of Love post if gift has message
        const showOnWall = (payment.metadata as any)?.showOnWall ?? true;
        if (showOnWall && gift.message && gift.message.trim().length > 0 && targetEvent) {
          await tx.wallPost.create({
            data: {
              eventId: targetEvent.id,
              authorName: gift.anonymous ? "Anonymous" : gift.giverName ?? "A Friend",
              authorEmail: gift.giverEmail,
              text: gift.message,
              giftId: gift.id,
              status: PostStatus.VISIBLE,
            },
          });
        }

        // 5. Queue post-commit email and in-app notifications (do not block DB transaction with SMTP I/O)
        if (this.notifications && (payment.payerEmail || owner)) {
          pendingGiftNotification = {
            payerEmail: payment.payerEmail || undefined,
            giverDisplayName: gift.anonymous ? "A Friend" : gift.giverName || "A Friend",
            eventName: targetEvent?.name || "Celebration",
            eventSlug: targetEvent?.slug,
            eventId: targetEvent?.id,
            amountKobo: gift.amountKobo,
            currency,
            reference: payment.reference,
            message: gift.message || undefined,
            owner: owner
              ? { id: owner.id, email: owner.email || "", name: owner.name || "Host" }
              : undefined,
          };
        }
      }

      // 3. If associated with Direct Order, confirm order, update inventory & post ledger
      if (payment.order && payment.order.status === OrderStatus.PENDING_PAYMENT) {
        const order = payment.order;

        await tx.order.update({
          where: { id: order.id },
          data: {
            status: OrderStatus.CONFIRMED,
            history: {
              create: [
                {
                  status: OrderStatus.CONFIRMED,
                  note: `Payment captured successfully via ${providerName} (ref: ${payment.reference})`,
                },
              ],
            },
          },
        });

        // Batch fetch and concurrently decrement stock for tracked products
        const itemProductIds = Array.from(
          new Set(order.items.map((item) => item.productId))
        );
        const products =
          typeof tx.product?.findMany === "function"
            ? await tx.product.findMany({
              where: { id: { in: itemProductIds } },
              select: { id: true, stock: true },
            })
            : (
              await Promise.all(
                itemProductIds.map((id) =>
                  tx.product?.findUnique?.({ where: { id } })
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
        await this.ledger.postTransaction(
          {
            reference: `payment:${payment.id}:order_capture`,
            kind: "PAYMENT_CAPTURE",
            description: `Direct Order ${order.number} capture (${currency}) via ${providerName}`,
            paymentId: payment.id,
            entries: [
              {
                accountCode: `PROVIDER_CLEARING:${currency}`,
                direction: Direction.DEBIT,
                amountKobo: payment.amountKobo,
              },
              {
                accountCode: `PLATFORM_REVENUE:${currency}`,
                direction: Direction.CREDIT,
                amountKobo: payment.amountKobo,
              },
            ],
          },
          tx
        );

        this.logger.log(`Direct order '${order.number}' confirmed and captured`);

        if (order.buyerEmail) {
          pendingOrderNotification = {
            buyerEmail: order.buyerEmail,
            buyerUserId: order.buyerUserId || undefined,
            recipientName: order.recipientName || "Valued Customer",
            orderNumber: order.number,
            totalKobo: order.totalKobo,
            currency,
            trackingToken: order.trackingToken,
          };
        }

        // 4. Mark digital order for post-commit fulfillment
        if (this.digitalGifts) {
          pendingDigitalOrderId = order.id;
        }
      }

      // 4. If associated with a direct Wallet Top-Up, credit OWNER_PAYABLE idempotently
      const paymentMeta = (payment.metadata as Record<string, any> | null) || {};
      if (!payment.gift && !payment.order && paymentMeta.kind === "WALLET_TOPUP" && paymentMeta.userId) {
        const walletUserId = String(paymentMeta.userId);
        await this.ledger.postTransaction(
          {
            reference: `wallet:topup:${payment.reference}`,
            kind: "WALLET_TOPUP",
            description: `Wallet top-up via ${providerName} (${payment.reference})`,
            paymentId: payment.id,
            entries: [
              {
                accountCode: `PROVIDER_CLEARING:${currency}`,
                direction: Direction.DEBIT,
                amountKobo: payment.amountKobo,
              },
              {
                accountCode: `OWNER_PAYABLE:${walletUserId}`,
                ownerId: walletUserId,
                direction: Direction.CREDIT,
                amountKobo: payment.amountKobo,
              },
            ],
          },
          tx
        );
        this.logger.log(
          `Wallet top-up credited via webhook for user='${walletUserId}', amount=${payment.amountKobo} kobo`
        );
      }
    });

    // Post-commit asynchronous side effects (notifications & digital fulfillment)
    const notifTask = pendingGiftNotification as {
      payerEmail?: string;
      giverDisplayName: string;
      eventName: string;
      eventSlug?: string;
      eventId?: string;
      amountKobo: number;
      currency: string;
      reference: string;
      message?: string;
      owner?: { id: string; email: string; name: string };
    } | null;

    if (this.notifications && notifTask) {
      try {
        await Promise.all([
          ...(notifTask.payerEmail
            ? [
              this.notifications.sendGiftReceiptEmail(
                notifTask.payerEmail,
                notifTask.giverDisplayName,
                notifTask.eventName,
                notifTask.amountKobo,
                notifTask.currency,
                notifTask.reference
              ),
            ]
            : []),
          ...(notifTask.owner
            ? [
              this.notifications.sendHostGiftReceivedEmail(
                notifTask.owner.email,
                notifTask.owner.id,
                notifTask.owner.name,
                notifTask.giverDisplayName,
                notifTask.amountKobo,
                notifTask.currency,
                notifTask.message,
                notifTask.eventName,
                notifTask.eventSlug,
                notifTask.eventId
              ),
            ]
            : []),
        ]);
      } catch (err: any) {
        this.logger.warn(`Could not dispatch gift notifications: ${err.message}`);
      }
    }

    const orderNotifTask = pendingOrderNotification as {
      buyerEmail: string;
      buyerUserId?: string;
      recipientName: string;
      orderNumber: string;
      totalKobo: number;
      currency: string;
      trackingToken: string;
    } | null;

    if (this.notifications && orderNotifTask) {
      try {
        const trackingUrl = `https://givvly.store/track/${orderNotifTask.trackingToken}`;
        await this.notifications.sendOrderConfirmedEmail(
          orderNotifTask.buyerEmail,
          orderNotifTask.buyerUserId,
          orderNotifTask.recipientName,
          orderNotifTask.orderNumber,
          orderNotifTask.totalKobo,
          orderNotifTask.currency,
          trackingUrl
        );
      } catch (err: any) {
        this.logger.warn(
          `Could not dispatch direct order confirmation email for ${orderNotifTask.orderNumber}: ${err.message}`
        );
      }
    }

    if (this.digitalGifts && pendingDigitalOrderId) {
      try {
        await this.digitalGifts.fulfillDigitalOrder(pendingDigitalOrderId);
      } catch (err: any) {
        this.logger.error(
          `Error fulfilling digital order ${pendingDigitalOrderId}: ${err.message}`
        );
      }
    }

    this.logger.log(
      `Successfully verified and processed payment success for ref=${reference} via ${providerName}`
    );
  }

  /**
   * Process generic transfer success: update payout status to SUCCESS, write ledger
   */
  private async handleTransferSuccess(event: NormalizedWebhookEvent) {
    const reference = event.reference;

    await this.prisma.$transaction(async (tx) => {
      const payout = await tx.payout.findUnique({
        where: { reference },
      });

      if (!payout) {
        this.logger.warn(`Payout with reference '${reference}' not found in database.`);
        return;
      }

      if (payout.status === PayoutStatus.SUCCESS) {
        return;
      }

      await tx.payout.update({
        where: { id: payout.id },
        data: {
          status: PayoutStatus.SUCCESS,
          completedAt: new Date(),
        },
      });

      const currency = "NGN";
      const isWalletWithdrawal =
        payout.reference.startsWith("wdr_") ||
        payout.reference.startsWith("po_wal_");

      if (isWalletWithdrawal) {
        await this.ledger.postTransaction(
          {
            reference: `wallet:withdraw:${payout.reference}:confirm`,
            kind: "WALLET_WITHDRAW_CONFIRM",
            description: `Wallet withdrawal settled to bank account (${payout.reference})`,
            payoutId: payout.id,
            entries: [
              {
                accountCode: `WALLET_RESERVE:${payout.userId}`,
                ownerId: payout.userId,
                direction: Direction.DEBIT,
                amountKobo: payout.amountKobo,
              },
              {
                accountCode: `PROVIDER_CLEARING:${currency}`,
                direction: Direction.CREDIT,
                amountKobo: payout.amountKobo,
              },
            ],
          },
          tx
        );
      } else {
        await this.ledger.postTransaction(
          {
            reference: `payout:${payout.id}:sent`,
            kind: "PAYOUT",
            description: `Disbursement completed for payout ${payout.reference}`,
            payoutId: payout.id,
            entries: [
              {
                accountCode: `OWNER_PAYABLE:${payout.userId}:${currency}`,
                ownerId: payout.userId,
                direction: Direction.DEBIT,
                amountKobo: payout.amountKobo,
              },
              {
                accountCode: `PROVIDER_CLEARING:${currency}`,
                direction: Direction.CREDIT,
                amountKobo: payout.amountKobo,
              },
            ],
          },
          tx
        );
      }
    });

    this.logger.log(`Payout successfully completed: ref=${reference}`);
  }

  /**
   * Process generic transfer failure or reversal
   */
  private async handleTransferFailed(event: NormalizedWebhookEvent) {
    const reference = event.reference;
    const failureReason = event.failureReason || `Transfer ${event.eventType}`;

    await this.prisma.$transaction(async (tx) => {
      const payout = await tx.payout.findUnique({
        where: { reference },
      });

      if (!payout) {
        return;
      }

      await tx.payout.update({
        where: { id: payout.id },
        data: {
          status:
            event.eventType === "TRANSFER_REVERSED"
              ? PayoutStatus.REVERSED
              : PayoutStatus.FAILED,
          failureReason,
        },
      });

      if (
        payout.reference.startsWith("wdr_") ||
        payout.reference.startsWith("po_wal_")
      ) {
        await this.ledger.postTransaction(
          {
            reference: `wallet:withdraw:${payout.reference}:cancel`,
            kind: "WALLET_WITHDRAW_CANCEL",
            description: `Compensating reversal for failed bank transfer (${payout.reference})`,
            payoutId: payout.id,
            entries: [
              {
                accountCode: `WALLET_RESERVE:${payout.userId}`,
                ownerId: payout.userId,
                direction: Direction.DEBIT,
                amountKobo: payout.amountKobo,
              },
              {
                accountCode: `OWNER_PAYABLE:${payout.userId}`,
                ownerId: payout.userId,
                direction: Direction.CREDIT,
                amountKobo: payout.amountKobo,
              },
            ],
          },
          tx
        );
      }
    });

    this.logger.warn(`Payout '${reference}' failed: ${failureReason}`);
  }
}

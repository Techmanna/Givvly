import {
  Injectable,
  NotFoundException,
  Logger,
} from "@nestjs/common";
import { PrismaService } from "../../infra/prisma/prisma.service";
import { EmailService } from "./email.service";
import { Channel, NotifStatus } from "@prisma/client";
import { UpdateNotificationPreferencesDto } from "./dto/notification-preferences.dto";
import { formatSubunitsToDisplay } from "../orders/utils/whatsapp-order.util";

export interface NotifyParams {
  userId?: string;
  toAddress?: string;
  channel: Channel;
  type: string;
  category: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  html?: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService
  ) { }

  /**
   * Check user preferences for category & channel.
   * If a specific category preference is set (e.g. GIFTS, EVENTS), it is respected.
   * If not set, falls back to the channel-level GENERAL preference (e.g. global email/in-app toggle).
   * Transactional security alerts always bypass preferences.
   */
  private async isNotificationEnabled(
    userId: string | undefined,
    channel: Channel,
    category: string
  ): Promise<boolean> {
    if (!userId) return true; // Direct/guest communications are sent by default
    if (category === "SECURITY") return true; // Security emails are mandatory transactions

    const specificPref = await this.prisma.notificationPref.findUnique({
      where: {
        userId_channel_category: {
          userId,
          channel,
          category,
        },
      },
    });

    if (specificPref !== null) {
      return specificPref.enabled;
    }

    if (category !== "GENERAL") {
      const generalPref = await this.prisma.notificationPref.findUnique({
        where: {
          userId_channel_category: {
            userId,
            channel,
            category: "GENERAL",
          },
        },
      });

      if (generalPref !== null) {
        return generalPref.enabled;
      }
    }

    return true;
  }

  /**
   * Unified notification dispatcher
   */
  async notify(params: NotifyParams) {
    const isEnabled = await this.isNotificationEnabled(
      params.userId,
      params.channel,
      params.category
    );

    if (!isEnabled) {
      this.logger.log(
        `Notification suppressed by user preference: user=${params.userId}, channel=${params.channel}, category=${params.category}`
      );
      return null;
    }

    let status: NotifStatus = NotifStatus.QUEUED;
    let providerRef: string | undefined;
    let error: string | undefined;
    let sentAt: Date | undefined;

    if (params.channel === Channel.EMAIL && params.toAddress) {
      try {
        const html =
          params.html ||
          this.emailService.renderTemplate(
            params.title,
            `<h2>${params.title}</h2><p>${params.body}</p>`
          );

        const res = await this.emailService.send({
          to: params.toAddress,
          subject: params.title,
          text: params.body,
          html,
        });

        status = NotifStatus.SENT;
        providerRef = res.messageId;
        sentAt = new Date();
      } catch (err: any) {
        status = NotifStatus.FAILED;
        error = err.message;
      }
    }

    return this.prisma.notification.create({
      data: {
        userId: params.userId,
        toAddress: params.toAddress,
        channel: params.channel,
        type: params.type,
        title: params.title,
        body: params.body,
        data: params.data ? (params.data as any) : undefined,
        status,
        providerRef,
        error,
        sentAt,
      },
    });
  }

  // ==================== EMAIL NOTIFICATION HELPERS ====================

  async sendWelcomeVerificationEmail(to: string, name: string, verificationUrl: string) {
    const title = "Verify your Givvly account";
    const body = `Hi ${name}, welcome to Givvly! Please verify your email to begin creating your wishlist and celebrations.`;
    const html = this.emailService.renderTemplate(
      title,
      `
      <h2>Welcome to Givvly, ${name}! 🎉</h2>
      <p>Thank you for joining Givvly. To activate your account and start creating registries, please verify your email address:</p>
      <p style="text-align: center;">
        <a href="${verificationUrl}" class="btn">Verify My Email</a>
      </p>
      <p style="font-size: 13px; color: #78716c; margin-top: 24px;">If you didn't create an account, you can safely ignore this message.</p>
      `
    );

    return this.notify({
      toAddress: to,
      channel: Channel.EMAIL,
      type: "AUTH_VERIFY_EMAIL",
      category: "SECURITY",
      title,
      body,
      html,
    });
  }

  async sendPasswordResetEmail(to: string, name: string, resetUrl: string) {
    const title = "Reset your Givvly password";
    const body = `Hi ${name}, click the link to reset your Givvly password.`;
    const html = this.emailService.renderTemplate(
      title,
      `
      <h2>Password Reset Request 🔐</h2>
      <p>Hello ${name}, we received a request to reset your Givvly password. Click the button below to proceed:</p>
      <p style="text-align: center;">
        <a href="${resetUrl}" class="btn">Reset Password</a>
      </p>
      <p style="font-size: 13px; color: #78716c; margin-top: 24px;">This link will expire in 1 hour. If you did not request this, please ensure your account is secure.</p>
      `
    );

    return this.notify({
      toAddress: to,
      channel: Channel.EMAIL,
      type: "AUTH_PASSWORD_RESET",
      category: "SECURITY",
      title,
      body,
      html,
    });
  }

  async sendGiftReceiptEmail(
    to: string,
    giverName: string,
    eventName: string,
    amountKobo: number,
    currency = "NGN",
    reference: string
  ) {
    const formattedAmount = formatSubunitsToDisplay(amountKobo, currency);
    const title = `Gift Receipt: ${formattedAmount} for ${eventName}`;
    const body = `Thank you ${giverName}! Your gift of ${formattedAmount} for "${eventName}" has been confirmed. Ref: ${reference}.`;
    const html = this.emailService.renderTemplate(
      title,
      `
      <h2>Thank You for Gifting with Givvly! 🎁</h2>
      <p>Dear ${giverName},</p>
      <p>Your contribution of <strong>${formattedAmount}</strong> for <strong>${eventName}</strong> was received successfully.</p>
      <div style="background: #f5f5f4; border-radius: 8px; padding: 16px; margin: 20px 0;">
        <p style="margin: 0 0 8px;"><strong>Event:</strong> ${eventName}</p>
        <p style="margin: 0 0 8px;"><strong>Amount:</strong> ${formattedAmount}</p>
        <p style="margin: 0;"><strong>Reference:</strong> ${reference}</p>
      </div>
      <p>Your warmth and generosity make celebrations memorable.</p>
      `
    );

    return this.notify({
      toAddress: to,
      channel: Channel.EMAIL,
      type: "GIFT_RECEIPT",
      category: "GIFTS",
      title,
      body,
      html,
      data: { eventName, amountKobo, currency, reference },
    });
  }

  async sendHostGiftReceivedEmail(
    to: string,
    hostUserId: string,
    hostName: string,
    giverName: string,
    amountKobo: number,
    currency = "NGN",
    message?: string,
    eventName?: string,
    eventSlug?: string,
    eventId?: string
  ) {
    const formattedAmount = formatSubunitsToDisplay(amountKobo, currency);
    const title = `New Gift: ${formattedAmount} from ${giverName}! 🎁`;
    const body = `${giverName} just gifted you ${formattedAmount} for ${eventName || "your celebration"}.`;
    const targetUrl = eventSlug ? `/e/${eventSlug}` : eventId ? `/events/${eventId}` : "/dashboard";
    const html = this.emailService.renderTemplate(
      title,
      `
      <h2>You Received a New Gift! 🥳🎁</h2>
      <p>Hi ${hostName},</p>
      <p><strong>${giverName}</strong> just sent you a gift of <strong>${formattedAmount}</strong> for <strong>${eventName || "your celebration"}</strong>!</p>
      ${message
        ? `<blockquote style="border-left: 3px solid #d97706; margin: 20px 0; padding-left: 16px; color: #44403c; font-style: italic;">"${message}"</blockquote>`
        : ""
      }
      <p style="text-align: center;">
        <a href="${targetUrl}" class="btn">View Celebration</a>
      </p>
      <p style="font-size: 13px; color: #78716c; margin-top: 24px;">Check your celebration dashboard to send a thank-you note or track your payout.</p>
      `
    );

    // Dispatch email and in-app notifications concurrently
    await Promise.all([
      ...(to
        ? [
            this.notify({
              userId: hostUserId,
              toAddress: to,
              channel: Channel.EMAIL,
              type: "HOST_GIFT_RECEIVED",
              category: "GIFTS",
              title,
              body,
              html,
              data: { giverName, amountKobo, currency, message, eventName, eventId, eventSlug, href: targetUrl },
            }),
          ]
        : []),
      this.notify({
        userId: hostUserId,
        channel: Channel.IN_APP,
        type: "HOST_GIFT_RECEIVED",
        category: "GIFTS",
        title,
        body,
        data: { giverName, amountKobo, currency, message, eventName, eventId, eventSlug, href: targetUrl },
      }),
    ]);
  }

  async sendHostWallPostEmail(
    to: string,
    hostUserId: string,
    hostName: string,
    authorName: string,
    text: string,
    eventName: string,
    eventSlug: string,
    eventId: string
  ) {
    const title = `New Wall Message from ${authorName}! 💬`;
    const snippet = text.length > 120 ? `${text.slice(0, 117)}...` : text;
    const body = `${authorName} left a message on "${eventName}": "${snippet}"`;
    const eventUrl = `/e/${eventSlug}#wall`;

    const html = this.emailService.renderTemplate(
      title,
      `
      <h2>New Message on Your Celebration Wall! 💬</h2>
      <p>Hi ${hostName},</p>
      <p><strong>${authorName}</strong> just posted a new message on your celebration <strong>${eventName}</strong>:</p>
      <blockquote style="border-left: 3px solid #d97706; margin: 20px 0; padding-left: 16px; color: #44403c; font-style: italic;">
        "${text}"
      </blockquote>
      <p style="text-align: center;">
        <a href="${eventUrl}" class="btn">View Celebration Wall</a>
      </p>
      `
    );

    await Promise.all([
      ...(to
        ? [
            this.notify({
              userId: hostUserId,
              toAddress: to,
              channel: Channel.EMAIL,
              type: "WALL_POST_CREATED",
              category: "EVENTS",
              title,
              body,
              html,
              data: { authorName, text, eventName, eventSlug, eventId, href: eventUrl },
            }),
          ]
        : []),
      this.notify({
        userId: hostUserId,
        channel: Channel.IN_APP,
        type: "WALL_POST_CREATED",
        category: "EVENTS",
        title,
        body,
        data: { authorName, text, eventName, eventSlug, eventId, href: eventUrl },
      }),
    ]);
  }

  async sendEventDayNotification(
    to: string,
    hostUserId: string,
    hostName: string,
    eventName: string,
    eventSlug: string,
    eventId: string
  ) {
    const title = `It's Celebration Day! 🎉 Today is ${eventName}`;
    const body = `Wishing you a joyful and memorable celebration today! Your guests can view your story, sign your wall, and gift.`;
    const eventUrl = `/e/${eventSlug}`;

    const html = this.emailService.renderTemplate(
      title,
      `
      <h2>It's Your Big Day! 🎈🥳</h2>
      <p>Hi ${hostName},</p>
      <p>Today is the day! Wishing you the most joyful, vibrant, and unforgettable celebration for <strong>${eventName}</strong>.</p>
      <p>Your celebration page is live for guests to view your story, post blessings on your wall, and send gifts.</p>
      <p style="text-align: center;">
        <a href="${eventUrl}" class="btn">Open Celebration Page</a>
      </p>
      `
    );

    await Promise.all([
      ...(to
        ? [
            this.notify({
              userId: hostUserId,
              toAddress: to,
              channel: Channel.EMAIL,
              type: "EVENT_DAY_REACHED",
              category: "EVENTS",
              title,
              body,
              html,
              data: { eventName, eventSlug, eventId, href: eventUrl },
            }),
          ]
        : []),
      this.notify({
        userId: hostUserId,
        channel: Channel.IN_APP,
        type: "EVENT_DAY_REACHED",
        category: "EVENTS",
        title,
        body,
        data: { eventName, eventSlug, eventId, href: eventUrl },
      }),
    ]);
  }

  async sendEventEndedNotification(
    to: string,
    hostUserId: string,
    hostName: string,
    eventName: string,
    eventSlug: string,
    eventId: string
  ) {
    const title = `Celebration Concluded: ${eventName} 🥂`;
    const body = `Your celebration date has ended. It is now archived from public listings, but your celebration page remains active so guests can still view keepsakes and gift.`;
    const eventUrl = `/e/${eventSlug}`;

    const html = this.emailService.renderTemplate(
      title,
      `
      <h2>Congratulations on Your Celebration! 🥂✨</h2>
      <p>Hi ${hostName},</p>
      <p>Your celebration <strong>${eventName}</strong> date has concluded. We hope it was everything you dreamed of and more!</p>
      <p>As scheduled, the event is now archived from the public explore directory, but <strong>your celebration page and registry remain active</strong>.</p>
      <p>Guests can continue to visit your page directly, view your story and wall messages, and send lingering gifts.</p>
      <p style="text-align: center;">
        <a href="${eventUrl}" class="btn">View Celebration Page</a>
      </p>
      `
    );

    await Promise.all([
      ...(to
        ? [
            this.notify({
              userId: hostUserId,
              toAddress: to,
              channel: Channel.EMAIL,
              type: "EVENT_ENDED_ARCHIVED",
              category: "EVENTS",
              title,
              body,
              html,
              data: { eventName, eventSlug, eventId, href: eventUrl },
            }),
          ]
        : []),
      this.notify({
        userId: hostUserId,
        channel: Channel.IN_APP,
        type: "EVENT_ENDED_ARCHIVED",
        category: "EVENTS",
        title,
        body,
        data: { eventName, eventSlug, eventId, href: eventUrl },
      }),
    ]);
  }

  async sendHostRsvpNotification(
    to: string,
    hostUserId: string,
    hostName: string,
    guestName: string,
    response: string,
    eventName: string,
    eventSlug: string,
    eventId: string
  ) {
    const title = `New RSVP: ${guestName} (${response}) 💌`;
    const body = `${guestName} responded ${response} to "${eventName}".`;
    const rsvpUrl = `/events/${eventId}/rsvps`;

    await Promise.all([
      this.notify({
        userId: hostUserId,
        channel: Channel.IN_APP,
        type: "RSVP_RECEIVED",
        category: "EVENTS",
        title,
        body,
        data: { guestName, response, eventName, eventSlug, eventId, href: rsvpUrl },
      }),
    ]);
  }

  async sendPayoutNotification(
    to: string,
    userId: string,
    userName: string,
    amountKobo: number,
    currency = "NGN",
    bankName: string,
    accountLast4: string,
    reference: string
  ) {
    const formattedAmount = formatSubunitsToDisplay(amountKobo, currency);
    const title = `Payout Initiated: ${formattedAmount} 💳`;
    const body = `A transfer of ${formattedAmount} to ${bankName} (•••• ${accountLast4}) has been queued. Ref: ${reference}`;
    const walletUrl = "/account/wallet";

    const html = this.emailService.renderTemplate(
      title,
      `
      <h2>Your Payout is on the Way! 💳</h2>
      <p>Hi ${userName},</p>
      <p>A transfer of <strong>${formattedAmount}</strong> to your bank account at <strong>${bankName} (•••• ${accountLast4})</strong> has been initiated.</p>
      <div style="background: #f5f5f4; border-radius: 8px; padding: 16px; margin: 20px 0;">
        <p style="margin: 0 0 8px;"><strong>Amount:</strong> ${formattedAmount}</p>
        <p style="margin: 0 0 8px;"><strong>Bank:</strong> ${bankName} (•••• ${accountLast4})</p>
        <p style="margin: 0;"><strong>Reference:</strong> ${reference}</p>
      </div>
      <p style="text-align: center;">
        <a href="${walletUrl}" class="btn">View Wallet & Settlements</a>
      </p>
      `
    );

    await Promise.all([
      ...(to
        ? [
            this.notify({
              userId,
              toAddress: to,
              channel: Channel.EMAIL,
              type: "PAYOUT_INITIATED",
              category: "WALLET",
              title,
              body,
              html,
              data: { amountKobo, currency, bankName, accountLast4, reference, href: walletUrl },
            }),
          ]
        : []),
      this.notify({
        userId,
        channel: Channel.IN_APP,
        type: "PAYOUT_INITIATED",
        category: "WALLET",
        title,
        body,
        data: { amountKobo, currency, bankName, accountLast4, reference, href: walletUrl },
      }),
    ]);
  }

  async sendOrderConfirmedEmail(
    to: string,
    buyerUserId: string | undefined,
    buyerName: string,
    orderNumber: string,
    totalKobo: number,
    currency = "NGN",
    trackingUrl: string
  ) {
    const formattedAmount = formatSubunitsToDisplay(totalKobo, currency);
    const title = `Order Confirmed: ${orderNumber}`;
    const body = `Thank you ${buyerName}! Your order ${orderNumber} (${formattedAmount}) is confirmed and being prepared.`;
    const html = this.emailService.renderTemplate(
      title,
      `
      <h2>Order Confirmed! 📦</h2>
      <p>Hi ${buyerName},</p>
      <p>We've received your order <strong>${orderNumber}</strong> for <strong>${formattedAmount}</strong>. It is now being curated with love.</p>
      <p style="text-align: center;">
        <a href="${trackingUrl}" class="btn">Track Your Order</a>
      </p>
      `
    );

    return this.notify({
      userId: buyerUserId,
      toAddress: to,
      channel: Channel.EMAIL,
      type: "ORDER_CONFIRMED",
      category: "ORDERS",
      title,
      body,
      html,
      data: { orderNumber, totalKobo, currency, trackingUrl },
    });
  }

  // ==================== IN-APP NOTIFICATIONS ====================

  async getNotifications(
    userId: string,
    unreadOnly = false,
    limit = 20,
    page = 1
  ) {
    const where: any = { userId };
    if (unreadOnly) {
      where.readAt = null;
    }

    const safeLimit = Math.min(100, Math.max(1, limit));
    const safePage = Math.max(1, page);
    const skip = (safePage - 1) * safeLimit;

    const [dbNotifications, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: safeLimit,
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({
        where: { userId, readAt: null },
      }),
    ]);

    const notifications = dbNotifications.map((n) => ({
      ...n,
      read: Boolean(n.readAt),
      href: (n.data as any)?.href || (n.data as any)?.url || undefined,
    }));

    const totalPages = Math.ceil(total / safeLimit);
    const hasMore = safePage < totalPages;

    return {
      notifications,
      unreadCount,
      total,
      page: safePage,
      limit: safeLimit,
      totalPages,
      hasMore,
    };
  }

  async markAsRead(notificationId: string, userId: string) {
    if (typeof (this.prisma.notification as any).updateManyAndReturn === "function") {
      const [notification] =
        await (this.prisma.notification as any).updateManyAndReturn({
          where: {
            id: notificationId,
            userId,
          },
          data: {
            readAt: new Date(),
            status: NotifStatus.READ,
          },
        });

      if (!notification) {
        throw new NotFoundException("Notification not found");
      }

      return notification;
    }

    const notif = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });
    if (!notif || notif.userId !== userId) {
      throw new NotFoundException("Notification not found");
    }
    return this.prisma.notification.update({
      where: { id: notificationId },
      data: {
        readAt: new Date(),
        status: NotifStatus.READ,
      },
    });
  }

  async markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: {
        readAt: new Date(),
        status: NotifStatus.READ,
      },
    });
  }

  // ==================== PREFERENCES ====================

  async getPreferences(userId: string) {
    const userPrefs = await this.prisma.notificationPref.findMany({
      where: { userId },
    });

    return userPrefs;
  }

  async updatePreferences(
    userId: string,
    dto: UpdateNotificationPreferencesDto,
  ) {
    const preferenceUpdates = [
      ...(dto.prefs ?? []).map((pref) => ({
        channel: pref.channel,
        category: pref.category,
        enabled: pref.enabled,
      })),

      ...(typeof dto.email === "boolean"
        ? [{ channel: "EMAIL" as const, category: "GENERAL" as const, enabled: dto.email }]
        : []),

      ...(typeof dto.whatsappOrSms === "boolean"
        ? [{ channel: "WHATSAPP" as const, category: "GENERAL" as const, enabled: dto.whatsappOrSms }]
        : []),

      ...(typeof dto.inApp === "boolean"
        ? [{ channel: "IN_APP" as const, category: "GENERAL" as const, enabled: dto.inApp }]
        : []),
    ];

    // Deduplicate by channel + category.
    // General fields take precedence over dto.prefs.
    const updates = new Map(
      preferenceUpdates.map((pref) => [
        `${pref.channel}:${pref.category}`,
        pref,
      ]),
    );

    const operations = Array.from(updates.values()).map((pref) =>
      this.prisma.notificationPref.upsert({
        where: {
          userId_channel_category: {
            userId,
            channel: pref.channel,
            category: pref.category,
          },
        },
        create: {
          userId,
          channel: pref.channel,
          category: pref.category,
          enabled: pref.enabled,
        },
        update: {
          enabled: pref.enabled,
        },
      }),
    );

    return Promise.all(operations);
  }
}


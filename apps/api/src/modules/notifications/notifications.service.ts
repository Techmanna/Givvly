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
   * Check user preferences for category & channel
   */
  private async isNotificationEnabled(
    userId: string | undefined,
    channel: Channel,
    category: string
  ): Promise<boolean> {
    if (!userId) return true; // Direct/guest communications are sent by default

    const pref = await this.prisma.notificationPref.findUnique({
      where: {
        userId_channel_category: {
          userId,
          channel,
          category,
        },
      },
    });

    return pref ? pref.enabled : true;
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
    eventName?: string
  ) {
    const formattedAmount = formatSubunitsToDisplay(amountKobo, currency);
    const title = `New Gift: ${formattedAmount} from ${giverName}!`;
    const body = `${giverName} just gifted you ${formattedAmount} for ${eventName || "your celebration"}.`;
    const html = this.emailService.renderTemplate(
      title,
      `
      <h2>You Received a New Gift! 🥳</h2>
      <p>Hi ${hostName},</p>
      <p><strong>${giverName}</strong> just sent you a gift of <strong>${formattedAmount}</strong>!</p>
      ${message
        ? `<blockquote style="border-left: 3px solid #d97706; margin: 20px 0; padding-left: 16px; color: #44403c; font-style: italic;">"${message}"</blockquote>`
        : ""
      }
      <p>Check your celebration dashboard to send a thank-you note or track your payout.</p>
      `
    );

    // Dispatch email and in-app notifications concurrently
    await Promise.all([
      this.notify({
        userId: hostUserId,
        toAddress: to,
        channel: Channel.EMAIL,
        type: "HOST_GIFT_RECEIVED",
        category: "GIFTS",
        title,
        body,
        html,
        data: { giverName, amountKobo, currency, message, eventName },
      }),
      this.notify({
        userId: hostUserId,
        channel: Channel.IN_APP,
        type: "HOST_GIFT_RECEIVED",
        category: "GIFTS",
        title,
        body,
        data: { giverName, amountKobo, currency, message, eventName },
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

  async getNotifications(userId: string, unreadOnly = false, limit = 20) {
    const where: any = { userId };
    if (unreadOnly) {
      where.readAt = null;
    }

    const [notifications, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
      }),
      this.prisma.notification.count({
        where: { userId, readAt: null },
      }),
    ]);

    return { notifications, unreadCount };
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


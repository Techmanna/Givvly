import { Test, TestingModule } from "@nestjs/testing";
import { NotificationsService } from "./notifications.service";
import { EmailService } from "./email.service";
import { PrismaService } from "../../infra/prisma/prisma.service";
import { Channel, NotifStatus } from "@prisma/client";

describe("NotificationsService", () => {
  let service: NotificationsService;
  let emailService: any;
  let prisma: any;

  beforeEach(async () => {
    emailService = {
      send: jest.fn().mockResolvedValue({ messageId: "msg_123" }),
      renderTemplate: jest.fn().mockImplementation((title, body) => `<html>${title}: ${body}</html>`),
    };

    prisma = {
      notificationPref: {
        findUnique: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        upsert: jest.fn().mockImplementation(({ create }: any) => Promise.resolve(create)),
      },
      notification: {
        create: jest.fn().mockImplementation(({ data }: any) =>
          Promise.resolve({ id: "notif-1", ...data, createdAt: new Date() })
        ),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        findUnique: jest.fn().mockResolvedValue({
          id: "notif-1",
          userId: "user-1",
          readAt: null,
        }),
        update: jest.fn().mockImplementation(({ data }: any) =>
          Promise.resolve({ id: "notif-1", ...data })
        ),
        updateMany: jest.fn().mockResolvedValue({ count: 2 }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: EmailService, useValue: emailService },
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("notify", () => {
    it("sends email and creates notification record when enabled", async () => {
      const result = await service.notify({
        userId: "user-1",
        toAddress: "test@example.com",
        channel: Channel.EMAIL,
        type: "WELCOME",
        category: "GENERAL",
        title: "Welcome to Givvly",
        body: "Glad to have you!",
      });

      expect(result).toBeDefined();
      expect(emailService.send).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "test@example.com",
          subject: "Welcome to Givvly",
        })
      );
      expect(prisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: NotifStatus.SENT,
            providerRef: "msg_123",
          }),
        })
      );
    });

    it("suppresses notification when user opted out in preferences", async () => {
      prisma.notificationPref.findUnique.mockResolvedValueOnce({
        userId: "user-1",
        channel: Channel.EMAIL,
        category: "MARKETING",
        enabled: false,
      });

      const result = await service.notify({
        userId: "user-1",
        toAddress: "test@example.com",
        channel: Channel.EMAIL,
        type: "PROMO",
        category: "MARKETING",
        title: "Flash Sale",
        body: "Check out our sale!",
      });

      expect(result).toBeNull();
      expect(emailService.send).not.toHaveBeenCalled();
    });

    it("suppresses notification when category is unconfigured but general channel preference is disabled", async () => {
      // First call for specific category (GIFTS) returns null
      prisma.notificationPref.findUnique.mockResolvedValueOnce(null);
      // Second call for GENERAL category returns disabled
      prisma.notificationPref.findUnique.mockResolvedValueOnce({
        userId: "user-1",
        channel: Channel.EMAIL,
        category: "GENERAL",
        enabled: false,
      });

      const result = await service.notify({
        userId: "user-1",
        toAddress: "test@example.com",
        channel: Channel.EMAIL,
        type: "GIFT_INFO",
        category: "GIFTS",
        title: "Gift notification",
        body: "You got a gift",
      });

      expect(result).toBeNull();
      expect(emailService.send).not.toHaveBeenCalled();
    });
  });

  describe("Host Gift Received Notification", () => {
    it("sends both email and in-app notifications", async () => {
      await service.sendHostGiftReceivedEmail(
        "host@example.com",
        "user-host",
        "Tola",
        "Emeka",
        5000000,
        "NGN",
        "Happy Birthday!",
        "Tola's 30th",
        "tolas-30th",
        "ev-1"
      );

      expect(emailService.send).toHaveBeenCalled();
      expect(prisma.notification.create).toHaveBeenCalledTimes(2); // 1 email, 1 in-app
    });
  });

  describe("Wall Post & Comment Notification", () => {
    it("sends both email and in-app notifications for wall posts", async () => {
      await service.sendHostWallPostEmail(
        "host@example.com",
        "user-host",
        "Tola",
        "Chioma",
        "So happy for you guys! Congratulations!",
        "Tola's 30th",
        "tolas-30th",
        "ev-1"
      );

      expect(emailService.send).toHaveBeenCalled();
      expect(prisma.notification.create).toHaveBeenCalledTimes(2);
    });
  });

  describe("Event Milestones", () => {
    it("sends celebration day notification", async () => {
      await service.sendEventDayNotification(
        "host@example.com",
        "user-host",
        "Tola",
        "Tola's 30th",
        "tolas-30th",
        "ev-1"
      );

      expect(emailService.send).toHaveBeenCalled();
      expect(prisma.notification.create).toHaveBeenCalledTimes(2);
    });

    it("sends event concluded/archived notification", async () => {
      await service.sendEventEndedNotification(
        "host@example.com",
        "user-host",
        "Tola",
        "Tola's 30th",
        "tolas-30th",
        "ev-1"
      );

      expect(emailService.send).toHaveBeenCalled();
      expect(prisma.notification.create).toHaveBeenCalledTimes(2);
    });
  });

  describe("Payout & Wallet Notifications", () => {
    it("sends payout initiated notification", async () => {
      await service.sendPayoutNotification(
        "host@example.com",
        "user-host",
        "Tola",
        2500000,
        "NGN",
        "GTBank",
        "1234",
        "payout_ref_1"
      );

      expect(emailService.send).toHaveBeenCalled();
      expect(prisma.notification.create).toHaveBeenCalledTimes(2);
    });
  });

  describe("In-app notifications", () => {
    it("marks notification as read", async () => {
      const marked = await service.markAsRead("notif-1", "user-1");
      expect(marked.status).toBe(NotifStatus.READ);
    });

    it("marks all notifications as read", async () => {
      const res = await service.markAllAsRead("user-1");
      expect(res.count).toBe(2);
    });
  });

  describe("Preferences", () => {
    it("upserts notification preferences", async () => {
      const updated = await service.updatePreferences("user-1", {
        prefs: [{ channel: Channel.EMAIL, category: "GIFTS", enabled: false }],
      });

      expect(updated).toHaveLength(1);
      expect(prisma.notificationPref.upsert).toHaveBeenCalled();
    });
  });

  describe("Durable Email Retry Queue", () => {
    it("queues failed email for retry with backoff instead of marking FAILED immediately", async () => {
      emailService.send.mockRejectedValueOnce(new Error("Resend 503 temporary error"));

      await service.notify({
        userId: "user-1",
        toAddress: "retry@example.com",
        channel: Channel.EMAIL,
        type: "WALLET_TOPUP",
        category: "WALLET",
        title: "Wallet Credited",
        body: "Credited ₦1,000",
      });

      expect(prisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: NotifStatus.QUEUED,
            attempts: 1,
            error: "Resend 503 temporary error",
            data: expect.objectContaining({
              _emailHtml: expect.any(String),
              _nextRetryAt: expect.any(Number),
            }),
          }),
        })
      );
    });

    it("retries queued emails in processQueuedEmails and marks SENT on success", async () => {
      prisma.notification.findMany.mockResolvedValueOnce([
        {
          id: "notif-q-1",
          toAddress: "retry@example.com",
          channel: Channel.EMAIL,
          type: "WALLET_TOPUP",
          title: "Wallet Credited",
          body: "Credited ₦1,000",
          attempts: 1,
          data: {
            _emailHtml: "<html>cached</html>",
            _nextRetryAt: Date.now() - 1000,
          },
        },
      ]);

      const result = await service.processQueuedEmails();
      expect(result).toEqual({ processed: 1, sent: 1, failed: 0 });
      expect(emailService.send).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "retry@example.com",
          html: "<html>cached</html>",
        })
      );
      expect(prisma.notification.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "notif-q-1" },
          data: expect.objectContaining({
            status: NotifStatus.SENT,
            attempts: 2,
            providerRef: "msg_123",
            error: null,
          }),
        })
      );
    });
  });
});


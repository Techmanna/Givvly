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
        "Tola's 30th"
      );

      expect(emailService.send).toHaveBeenCalled();
      expect(prisma.notification.create).toHaveBeenCalledTimes(2); // 1 email, 1 in-app
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
});


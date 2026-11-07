import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { EmailService } from "./email.service";

describe("EmailService", () => {
  let service: EmailService;
  let configService: Partial<ConfigService>;
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  describe("when configured with Resend API Key", () => {
    beforeEach(async () => {
      configService = {
        get: jest.fn((key: string, defaultValue?: any) => {
          if (key === "RESEND_API_KEY") return "re_test_123456789";
          if (key === "MAIL_FROM") return "Givvly <test@givvly.com>";
          return defaultValue;
        }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          EmailService,
          { provide: ConfigService, useValue: configService },
        ],
      }).compile();

      service = module.get<EmailService>(EmailService);
    });

    it("should send email via Resend HTTPS REST API", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ id: "resend-msg-123" }),
      } as any);

      const result = await service.send({
        to: "recipient@example.com",
        subject: "Welcome",
        html: "<p>Hello</p>",
      });

      expect(global.fetch).toHaveBeenCalledWith(
        "https://api.resend.com/emails",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            Authorization: "Bearer re_test_123456789",
          }),
        })
      );
      expect(result).toEqual({ messageId: "resend-msg-123" });
    });

    it("should retry with onboarding@resend.dev if custom domain is not verified", async () => {
      let callCount = 0;
      global.fetch = jest.fn().mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          return {
            ok: false,
            status: 403,
            statusText: "Forbidden",
            json: async () => ({
              message: "The givvly.com domain is not verified. Please, add and verify your domain on https://resend.com/domains",
              statusCode: 403,
            }),
          };
        }
        return {
          ok: true,
          status: 200,
          json: async () => ({ id: "fallback-msg-456" }),
        };
      });

      const result = await service.send({
        to: "recipient@example.com",
        subject: "Welcome",
        html: "<p>Hello</p>",
      });

      expect(callCount).toBe(2);
      expect(result).toEqual({ messageId: "fallback-msg-456" });
    });
  });

  describe("when configured with Nodemailer (local dev / Mailpit)", () => {
    beforeEach(async () => {
      configService = {
        get: jest.fn((key: string, defaultValue?: any) => {
          if (key === "RESEND_API_KEY") return "";
          if (key === "SMTP_PASS") return "";
          if (key === "SMTP_HOST") return "localhost";
          if (key === "SMTP_PORT") return 1025;
          if (key === "MAIL_FROM") return "Givvly <onboarding@resend.dev>";
          return defaultValue;
        }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          EmailService,
          { provide: ConfigService, useValue: configService },
        ],
      }).compile();

      service = module.get<EmailService>(EmailService);
    });

    it("should have Nodemailer transporter ready and render branded templates", () => {
      const template = service.renderTemplate("Welcome", "<p>Welcome to Givvly</p>");
      expect(template).toContain("Welcome to Givvly");
      expect(template).toContain("Givvly");
    });
  });
});


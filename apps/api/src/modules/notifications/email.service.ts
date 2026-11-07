import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as nodemailer from "nodemailer";

export interface SendMailOptions {
  to: string;
  subject: string;
  text?: string;
  html: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;
  private readonly fromAddress: string;

  constructor(private readonly config: ConfigService) {
    const host = this.config.get<string>("SMTP_HOST", "localhost");
    const rawPort = this.config.get("SMTP_PORT", 465);
    const port = Number(rawPort);
    const user = this.config.get<string>("SMTP_USER", "");
    const pass = this.config.get<string>("SMTP_PASS", "");
    const secureConfig = this.config.get("SMTP_SECURE");
    this.fromAddress = this.config.get<string>(
      "MAIL_FROM",
      "Givvly <onboarding@resend.dev>"
    );

    const isSecure = port === 465 || String(secureConfig).toLowerCase() === "true";

    const transportOptions: any = {
      host,
      port,
      secure: isSecure,
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    };

    if (user && pass) {
      transportOptions.auth = { user, pass };
    }

    this.transporter = nodemailer.createTransport(transportOptions);
  }

  /**
   * Send an email through Nodemailer (Mailpit in local/dev)
   */
  async send(options: SendMailOptions): Promise<{ messageId: string }> {
    try {
      const info = await this.transporter.sendMail({
        from: this.fromAddress,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      });

      this.logger.log(`Email sent to '${options.to}': id=${info.messageId}, subject='${options.subject}'`);
      return { messageId: info.messageId };
    } catch (err: any) {
      this.logger.error(`Failed to send email to '${options.to}': ${err.message}`, err.stack);
      throw err;
    }
  }

  /**
   * Helper: Branded HTML Template Wrapper
   */
  renderTemplate(title: string, bodyContent: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #faf7f2; margin: 0; padding: 24px; color: #1c1917; }
    .container { max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e7e5e4; padding: 36px 32px; }
    .logo { font-size: 24px; font-weight: 700; color: #0c0a09; letter-spacing: -0.02em; margin-bottom: 24px; }
    .accent { color: #d97706; }
    .footer { margin-top: 36px; padding-top: 20px; border-top: 1px solid #f5f5f4; font-size: 13px; color: #78716c; text-align: center; }
    .btn { display: inline-block; background-color: #0c0a09; color: #ffffff !important; padding: 12px 28px; border-radius: 9999px; text-decoration: none; font-weight: 600; font-size: 14px; margin-top: 20px; }
    p { line-height: 1.6; margin: 0 0 16px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">Givvly<span class="accent">.</span></div>
    ${bodyContent}
    <div class="footer">
      © ${new Date().getFullYear()} Givvly Inc. Thoughtful celebrations and gifting made effortless.
    </div>
  </div>
</body>
</html>
    `.trim();
  }
}


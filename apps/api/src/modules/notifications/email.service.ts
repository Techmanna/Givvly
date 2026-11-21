import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as nodemailer from "nodemailer";
import { renderGivvlyEmailHtml } from "@/common/templates/givvly-templates";

export interface SendMailOptions {
  to: string;
  subject: string;
  text?: string;
  html: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter?: nodemailer.Transporter;
  private readonly resendApiKey?: string;
  private fromAddress: string;

  constructor(private readonly config: ConfigService) {
    const rawFrom = this.config.get<string>(
      "MAIL_FROM",
      "Givvly <onboarding@resend.dev>"
    );
    // If from address contains unverified or placeholder domain like vercel.app, default to onboarding@resend.dev
    if (rawFrom.includes("vercel.app")) {
      this.fromAddress = "Givvly <onboarding@resend.dev>";
    } else {
      this.fromAddress = rawFrom;
    }

    const resendKey =
      this.config.get<string>("RESEND_API_KEY") ||
      (this.config.get<string>("SMTP_PASS", "").startsWith("re_")
        ? this.config.get<string>("SMTP_PASS", "")
        : "") ||
      (this.config.get<string>("SMTP_USER", "").toLowerCase() === "resend"
        ? this.config.get<string>("SMTP_PASS", "")
        : "");

    if (resendKey && resendKey.startsWith("re_")) {
      this.resendApiKey = resendKey;
      this.logger.log(
        "EmailService configured with Resend HTTPS REST API (port 443 firewall-safe)"
      );
    } else {
      const host = this.config.get<string>("SMTP_HOST", "localhost");
      const rawPort = this.config.get("SMTP_PORT", 1025);
      const port = Number(rawPort);
      const user = this.config.get<string>("SMTP_USER", "");
      const pass = this.config.get<string>("SMTP_PASS", "");
      const secureConfig = this.config.get("SMTP_SECURE");
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
      this.logger.log(`EmailService configured with Nodemailer SMTP (${host}:${port})`);
    }
  }

  /**
   * Send an email through Resend HTTPS API (in cloud/prod) or Nodemailer (Mailpit in local/dev)
   */
  async send(options: SendMailOptions): Promise<{ messageId: string }> {
    if (this.resendApiKey) {
      return this.sendViaResend(options);
    }

    return this.sendViaNodemailer(options);
  }

  private async sendViaResend(
    options: SendMailOptions,
    fromOverride?: string
  ): Promise<{ messageId: string }> {
    const from = fromOverride || this.fromAddress;

    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: [options.to],
          subject: options.subject,
          html: options.html,
          ...(options.text ? { text: options.text } : {}),
        }),
      });

      const data: any = await res.json().catch(() => ({}));

      if (!res.ok) {
        // If domain is not verified and we used a custom from, fallback once to onboarding@resend.dev
        if (
          res.status === 403 &&
          typeof data.message === "string" &&
          data.message.includes("not verified") &&
          !from.includes("onboarding@resend.dev")
        ) {
          this.logger.warn(
            `Resend rejected '${from}' (domain not verified). Retrying with 'Givvly <onboarding@resend.dev>'...`
          );
          return this.sendViaResend(options, "Givvly <onboarding@resend.dev>");
        }

        const errMsg = data.message || `HTTP ${res.status} ${res.statusText}`;
        throw new Error(`Resend API error: ${errMsg}`);
      }

      this.logger.log(
        `Email sent via Resend to '${options.to}': id=${data.id}, subject='${options.subject}'`
      );
      return { messageId: data.id };
    } catch (err: any) {
      this.logger.error(
        `Failed to send email to '${options.to}': ${err.message}`,
        err.stack
      );
      throw err;
    }
  }

  private async sendViaNodemailer(options: SendMailOptions): Promise<{ messageId: string }> {
    if (!this.transporter) {
      throw new Error("Nodemailer transporter is not initialized");
    }

    try {
      const info = await this.transporter.sendMail({
        from: this.fromAddress,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      });

      this.logger.log(
        `Email sent via SMTP to '${options.to}': id=${info.messageId}, subject='${options.subject}'`
      );
      return { messageId: info.messageId };
    } catch (err: any) {
      this.logger.error(
        `Failed to send email to '${options.to}': ${err.message}`,
        err.stack
      );
      throw err;
    }
  }

  /**
   * Helper: Branded HTML Template Wrapper
   */
  renderTemplate(title: string, bodyContent: string, badgeText?: string): string {
    const appUrl = this.config.get<string>("APP_URL");
    return renderGivvlyEmailHtml({
      title,
      bodyContent,
      appUrl,
      badgeText,
    });
  }
}

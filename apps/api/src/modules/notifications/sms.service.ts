import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

export interface SendSmsOptions {
  to: string;
  message: string;
}

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly senderId: string;
  private readonly channel: "dnd" | "generic";
  private readonly isMock: boolean;

  constructor(private readonly config: ConfigService) {
    this.apiKey = this.config.get<string>("TERMII_API_KEY", "").trim();
    this.baseUrl = this.config
      .get<string>("TERMII_BASE_URL", "https://v4.api.termii.com")
      .replace(/\/$/, "");
    this.senderId = this.config.get<string>("TERMII_SENDER_ID", "Givvly").trim();
    const rawChannel = this.config.get<string>("TERMII_CHANNEL", "dnd");
    this.channel = rawChannel === "generic" ? "generic" : "dnd";
    this.isMock = !this.apiKey || this.apiKey.includes("mock_");
  }

  normalizePhoneNumber(rawPhone: string): string {
    const digits = rawPhone.replace(/\D/g, "");
    if (!digits) return "";
    if (digits.startsWith("0") && digits.length === 11) {
      return `234${digits.slice(1)}`;
    }
    if (digits.startsWith("234") && digits.length >= 13) {
      return digits;
    }
    if (digits.length === 10 && /^[789]/.test(digits)) {
      return `234${digits}`;
    }
    return digits;
  }

  async send(options: SendSmsOptions): Promise<{ messageId: string }> {
    const to = this.normalizePhoneNumber(options.to);
    if (!to) {
      throw new Error("Invalid recipient phone number for SMS");
    }

    if (this.isMock) {
      this.logger.log(
        `[MOCK SMS] Termii to=${to} from=${this.senderId} msg="${options.message}"`
      );
      return { messageId: `mock_sms_${Date.now()}` };
    }

    const res = await fetch(`${this.baseUrl}/api/sms/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        api_key: this.apiKey,
        to,
        from: this.senderId,
        sms: options.message,
        type: "plain",
        channel: this.channel,
      }),
    });

    const data: any = await res.json().catch(() => ({}));
    if (!res.ok) {
      const errMsg = data?.message || `HTTP ${res.status} ${res.statusText}`;
      throw new Error(`Termii SMS error: ${errMsg}`);
    }

    const messageId = String(
      data?.message_id || data?.messageId || data?.id || `termii_${Date.now()}`
    );
    this.logger.log(`SMS sent via Termii to '${to}': id=${messageId}`);
    return { messageId };
  }
}

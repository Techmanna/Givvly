import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import * as argon2 from "argon2";
import * as crypto from "crypto";
import { PrismaService } from "@/infra/prisma/prisma.service";
import { hashString } from "@/common/utils/crypto";
import { EmailService } from "../notifications/email.service";

export interface RegisterDto {
  name: string;
  email: string;
  phone?: string;
  password?: string;
  acceptTerms?: boolean;
  terms?: boolean;
}

export interface LoginDto {
  email: string;
  password?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  csrfToken: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService
  ) {}

  async register(dto: RegisterDto, ip?: string, userAgent?: string) {
    const accepted = dto.acceptTerms ?? dto.terms ?? true;
    if (accepted !== true) {
      throw new BadRequestException("You must accept the terms of service");
    }

    const email = dto.email.trim().toLowerCase();
    const existing = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException("An account with this email already exists");
    }

    const passwordHash = dto.password
      ? await argon2.hash(dto.password, { type: argon2.argon2id })
      : null;

    let user;
    try {
      user = await this.prisma.user.create({
        data: {
          email,
          name: dto.name.trim(),
          phone: dto.phone?.trim() || null,
          passwordHash,
          status: "ACTIVE",
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          status: true,
          createdAt: true,
        },
      });
    } catch (err: any) {
      if (err?.code === "P2002") {
        throw new ConflictException("An account with this email already exists");
      }
      throw err;
    }

    // Create session and issue token pair
    const tokens = await this.createSession(user.id, user.role, user.email, ip, userAgent);

    // Trigger initial verification email asynchronously
    this.createVerificationToken(user.id, "EMAIL_VERIFY")
      .then((rawToken) => this.sendVerificationEmail(user.email, user.name, rawToken))
      .catch((err) => {
        this.logger.warn(`Could not dispatch welcome verification email to ${user.email}: ${err.message}`);
      });

    return { user, tokens };
  }

  async login(dto: LoginDto, ip?: string, userAgent?: string) {
    const email = dto.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        passwordHash: true,
      },
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException("Invalid email or password");
    }

    if (user.status !== "ACTIVE") {
      throw new UnauthorizedException("Account is inactive or suspended");
    }

    const isMatch = await argon2.verify(user.passwordHash, dto.password || "");
    if (!isMatch) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { failedLogins: { increment: 1 } },
      });
      throw new UnauthorizedException("Invalid email or password");
    }

    // Reset failed logins & update lastLoginAt concurrently with session creation
    const [, tokens] = await Promise.all([
      this.prisma.user.update({
        where: { id: user.id },
        data: { failedLogins: 0, lastLoginAt: new Date() },
      }),
      this.createSession(user.id, user.role, user.email, ip, userAgent),
    ]);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        status: user.status,
      },
      tokens,
    };
  }

  async refreshTokens(refreshToken: string, ip?: string, userAgent?: string) {
    const tokenHash = hashString(refreshToken);
    const session = await this.prisma.session.findUnique({
      where: { tokenHash },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            status: true,
          },
        },
      },
    });

    if (!session || session.revokedAt || session.expiresAt < new Date()) {
      // If a revoked session is reused, revoke entire session family for security
      if (session) {
        await this.prisma.session.updateMany({
          where: { familyId: session.familyId },
          data: { revokedAt: new Date() },
        });
      }
      throw new UnauthorizedException("Invalid or revoked session");
    }

    // Rotate refresh token
    const newRefreshToken = crypto.randomBytes(32).toString("hex");
    const newTokenHash = hashString(newRefreshToken);

    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    const newSession = await this.prisma.session.create({
      data: {
        userId: session.userId,
        familyId: session.familyId,
        tokenHash: newTokenHash,
        userAgent,
        ipHash: ip ? hashString(ip) : null,
        expiresAt,
      },
    });

    // Mark previous session replaced and sign access token concurrently
    const [, accessToken] = await Promise.all([
      this.prisma.session.update({
        where: { id: session.id },
        data: {
          revokedAt: new Date(),
          replacedById: newSession.id,
        },
      }),
      this.signAccessToken(
        session.user.id,
        session.user.email,
        session.user.role,
        newSession.id
      ),
    ]);

    const csrfToken = crypto.randomBytes(16).toString("hex");

    return {
      accessToken,
      refreshToken: newRefreshToken,
      csrfToken,
      user: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        role: session.user.role,
      },
    };
  }

  async logout(sessionId: string) {
    if (!sessionId) return;
    await this.prisma.session.updateMany({
      where: { id: sessionId },
      data: { revokedAt: new Date() },
    });
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        status: true,
        emailVerifiedAt: true,
        avatarKey: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    return user;
  }

  async resendVerification(email: string) {
    const normalized = email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email: normalized },
      select: { id: true, email: true, name: true, emailVerifiedAt: true },
    });

    if (user && !user.emailVerifiedAt) {
      const rawToken = await this.createVerificationToken(
        user.id,
        "EMAIL_VERIFY"
      );
      await this.sendVerificationEmail(
        user.email,
        user.name || "there",
        rawToken
      );
    }

    return {
      success: true,
      message: "Verification email sent. Please check your inbox.",
    };
  }

  async verifyEmail(token: string) {
    const tokenHash = hashString(token);
    const record = await this.prisma.verificationToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (
      !record ||
      record.usedAt ||
      record.expiresAt < new Date() ||
      record.type !== "EMAIL_VERIFY"
    ) {
      throw new BadRequestException("Invalid or expired verification token");
    }

    await this.prisma.$transaction([
      this.prisma.verificationToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.user.update({
        where: { id: record.userId },
        data: { emailVerifiedAt: new Date() },
      }),
    ]);

    return {
      success: true,
      message: "Email verified successfully.",
      user: {
        id: record.user.id,
        email: record.user.email,
        name: record.user.name,
        role: record.user.role,
        emailVerified: true,
      },
    };
  }

  async forgotPassword(email: string) {
    const normalized = email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email: normalized },
      select: { id: true, email: true, name: true },
    });

    if (user) {
      const rawToken = await this.createVerificationToken(
        user.id,
        "PASSWORD_RESET"
      );
      await this.sendPasswordResetEmail(
        user.email,
        user.name || "there",
        rawToken
      );
    }

    return {
      success: true,
      message:
        "If an account with this email exists, a password reset link has been sent.",
    };
  }

  async resetPassword(token: string, newPassword: string) {
    const tokenHash = hashString(token);
    const record = await this.prisma.verificationToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (
      !record ||
      record.usedAt ||
      record.expiresAt < new Date() ||
      record.type !== "PASSWORD_RESET"
    ) {
      throw new BadRequestException("Invalid or expired password reset token");
    }

    const passwordHash = await argon2.hash(newPassword, {
      type: argon2.argon2id,
    });

    await this.prisma.$transaction([
      this.prisma.verificationToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.user.update({
        where: { id: record.userId },
        data: { passwordHash, failedLogins: 0 },
      }),
    ]);

    return {
      success: true,
      message:
        "Password reset successfully. You can now sign in with your new password.",
    };
  }

  private async createVerificationToken(
    userId: string,
    type: "EMAIL_VERIFY" | "PASSWORD_RESET"
  ): Promise<string> {
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = hashString(rawToken);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await this.prisma.verificationToken.create({
      data: {
        userId,
        type,
        tokenHash,
        expiresAt,
      },
    });

    return rawToken;
  }

  private async sendVerificationEmail(
    to: string,
    name: string,
    token: string
  ): Promise<void> {
    const appUrl =
      this.configService.get<string>("APP_URL") || "http://localhost:3000";
    const verifyUrl = `${appUrl}/verify-email?token=${token}`;

    const html = this.emailService.renderTemplate(
      "Verify your Givvly account",
      `
      <h2 style="font-size: 20px; font-weight: 700; margin: 0 0 12px; color: #0c0a09;">Verify your email address</h2>
      <p>Hello ${name || "there"},</p>
      <p>Welcome to Givvly! Please verify your email address to activate your account and start receiving and sending celebration gifts.</p>
      <p style="text-align: center; margin: 28px 0;">
        <a href="${verifyUrl}" class="btn">Verify My Email</a>
      </p>
      <p style="font-size: 13px; color: #78716c;">Or copy and paste this link in your browser:<br/><a href="${verifyUrl}" style="color: #d97706; word-break: break-all;">${verifyUrl}</a></p>
      <p style="font-size: 12px; color: #a8a29e; margin-top: 24px;">This link expires in 24 hours. If you did not create an account on Givvly, you can safely ignore this email.</p>
      `
    );

    try {
      await this.emailService.send({
        to,
        subject: "Verify your Givvly account",
        html,
        text: `Hello ${name || "there"},\n\nPlease verify your email address by visiting:\n${verifyUrl}\n\nThis link expires in 24 hours.`,
      });
      this.logger.log(`Verification email sent to ${to}`);
    } catch (err: any) {
      this.logger.error(
        `Failed to send verification email to ${to}: ${err.message}`,
        err.stack
      );
    }
  }

  private async sendPasswordResetEmail(
    to: string,
    name: string,
    token: string
  ): Promise<void> {
    const appUrl =
      this.configService.get<string>("APP_URL") || "http://localhost:3000";
    const resetUrl = `${appUrl}/reset-password?token=${token}`;

    const html = this.emailService.renderTemplate(
      "Reset your Givvly password",
      `
      <h2 style="font-size: 20px; font-weight: 700; margin: 0 0 12px; color: #0c0a09;">Reset your password</h2>
      <p>Hello ${name || "there"},</p>
      <p>We received a request to reset your Givvly account password. Click the button below to choose a new password:</p>
      <p style="text-align: center; margin: 28px 0;">
        <a href="${resetUrl}" class="btn">Reset Password</a>
      </p>
      <p style="font-size: 13px; color: #78716c;">Or copy and paste this link in your browser:<br/><a href="${resetUrl}" style="color: #d97706; word-break: break-all;">${resetUrl}</a></p>
      <p style="font-size: 12px; color: #a8a29e; margin-top: 24px;">This link expires in 24 hours. If you did not request a password reset, you can safely ignore this email.</p>
      `
    );

    try {
      await this.emailService.send({
        to,
        subject: "Reset your Givvly password",
        html,
        text: `Hello ${name || "there"},\n\nReset your password by visiting:\n${resetUrl}\n\nThis link expires in 24 hours.`,
      });
      this.logger.log(`Password reset email sent to ${to}`);
    } catch (err: any) {
      this.logger.error(
        `Failed to send password reset email to ${to}: ${err.message}`,
        err.stack
      );
    }
  }

  private async createSession(
    userId: string,
    role: string,
    email: string,
    ip?: string,
    userAgent?: string
  ): Promise<AuthTokens> {
    const familyId = crypto.randomUUID();
    const rawRefreshToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = hashString(rawRefreshToken);
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    const session = await this.prisma.session.create({
      data: {
        userId,
        familyId,
        tokenHash,
        userAgent,
        ipHash: ip ? hashString(ip) : null,
        expiresAt,
      },
    });

    const accessToken = await this.signAccessToken(userId, email, role, session.id);
    const csrfToken = crypto.randomBytes(16).toString("hex");

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      csrfToken,
    };
  }

  private async signAccessToken(
    userId: string,
    email: string,
    role: string,
    sessionId: string
  ): Promise<string> {
    const payload = {
      sub: userId,
      email,
      role,
      sid: sessionId,
    };

    return this.jwtService.signAsync(payload, {
      expiresIn: "15m",
      secret: this.configService.get<string>("JWT_SECRET"),
    });
  }
}


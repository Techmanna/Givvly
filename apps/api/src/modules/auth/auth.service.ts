import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import * as argon2 from "argon2";
import * as crypto from "crypto";
import { PrismaService } from "@/infra/prisma/prisma.service";
import { hashString } from "@/common/utils/crypto";

export interface RegisterDto {
  name: string;
  email: string;
  phone?: string;
  password?: string;
  acceptTerms: boolean;
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
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService
  ) {}

  async register(dto: RegisterDto, ip?: string, userAgent?: string) {
    if (!dto.acceptTerms) {
      throw new BadRequestException("You must accept the terms of service");
    }

    const email = dto.email.trim().toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException("An account with this email already exists");
    }

    const passwordHash = dto.password
      ? await argon2.hash(dto.password, { type: argon2.argon2id })
      : null;

    const user = await this.prisma.user.create({
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

    // Create session and issue token pair
    const tokens = await this.createSession(user.id, user.role, user.email, ip, userAgent);

    return { user, tokens };
  }

  async login(dto: LoginDto, ip?: string, userAgent?: string) {
    const email = dto.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email },
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

    // Reset failed logins & update lastLoginAt
    await this.prisma.user.update({
      where: { id: user.id },
      data: { failedLogins: 0, lastLoginAt: new Date() },
    });

    const tokens = await this.createSession(user.id, user.role, user.email, ip, userAgent);

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
      include: { user: true },
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

    // Mark previous session replaced
    await this.prisma.session.update({
      where: { id: session.id },
      data: {
        revokedAt: new Date(),
        replacedById: newSession.id,
      },
    });

    const accessToken = await this.signAccessToken(
      session.user.id,
      session.user.email,
      session.user.role,
      newSession.id
    );

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


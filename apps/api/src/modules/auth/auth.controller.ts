import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiCookieAuth,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { Request, Response } from "express";
import { ConfigService } from "@nestjs/config";
import { AuthService } from "./auth.service";
import {
  RegisterRequestDto,
  LoginRequestDto,
  AuthResponseDto,
  UserProfileResponseDto,
} from "./dto/auth.dto";
import { Public, CurrentUser, RequestUser } from "@/common/decorators/auth.decorator";
import { JwtAuthGuard } from "@/common/guards/jwt-auth.guard";

@ApiTags("Authentication & Sessions")
@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService
  ) {}

  @Public()
  @Post("register")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Register a new user account" })
  @ApiCreatedResponse({
    description: "Account created successfully. Auth cookies are set.",
    type: AuthResponseDto,
  })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async register(
    @Body() dto: RegisterRequestDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ): Promise<AuthResponseDto> {
    const ip = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers["user-agent"];

    const result = await this.authService.register(dto, ip, userAgent);
    this.setAuthCookies(res, result.tokens);

    return { user: result.user as UserProfileResponseDto };
  }

  @Public()
  @Post("login")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Sign in with email and password" })
  @ApiOkResponse({
    description: "Authentication successful. Auth cookies are set.",
    type: AuthResponseDto,
  })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async login(
    @Body() dto: LoginRequestDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ): Promise<AuthResponseDto> {
    const ip = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers["user-agent"];

    const result = await this.authService.login(dto, ip, userAgent);
    this.setAuthCookies(res, result.tokens);

    return { user: result.user as UserProfileResponseDto };
  }

  @Public()
  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Rotate refresh token and issue new session access token" })
  @ApiCookieAuth("givvly_rt")
  @ApiOkResponse({
    description: "Session refreshed successfully.",
    type: AuthResponseDto,
  })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ): Promise<AuthResponseDto> {
    const refreshToken = req.cookies?.givvly_rt;
    if (!refreshToken) {
      throw new UnauthorizedException("Missing refresh token cookie");
    }

    const ip = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers["user-agent"];

    const result = await this.authService.refreshTokens(refreshToken, ip, userAgent);
    this.setAuthCookies(res, result);

    return { user: result.user as UserProfileResponseDto };
  }

  @UseGuards(JwtAuthGuard)
  @Post("logout")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Sign out and invalidate session family" })
  @ApiBearerAuth()
  @ApiCookieAuth("givvly_at")
  @ApiResponse({ status: 204, description: "Signed out successfully." })
  async logout(
    @CurrentUser() user: RequestUser,
    @Res({ passthrough: true }) res: Response
  ): Promise<void> {
    if (user?.sessionId) {
      await this.authService.logout(user.sessionId);
    }
    this.clearAuthCookies(res);
  }

  @UseGuards(JwtAuthGuard)
  @Get("me")
  @ApiOperation({ summary: "Get currently authenticated user profile" })
  @ApiBearerAuth()
  @ApiCookieAuth("givvly_at")
  @ApiOkResponse({
    description: "Current user profile.",
    type: AuthResponseDto,
  })
  async getMe(@CurrentUser("id") userId: string): Promise<AuthResponseDto> {
    const user = await this.authService.getMe(userId);
    return { user: user as UserProfileResponseDto };
  }

  private setAuthCookies(
    res: Response,
    tokens: { accessToken: string; refreshToken: string; csrfToken: string }
  ) {
    const isProd = this.configService.get("NODE_ENV") === "production";
    const domain = this.configService.get("COOKIE_DOMAIN");

    res.cookie("givvly_at", tokens.accessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      maxAge: 15 * 60 * 1000,
      domain: domain || undefined,
      path: "/",
    });

    res.cookie("givvly_rt", tokens.refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60 * 1000,
      domain: domain || undefined,
      path: "/api/v1/auth",
    });

    res.cookie("givvly_csrf", tokens.csrfToken, {
      httpOnly: false,
      secure: isProd,
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60 * 1000,
      domain: domain || undefined,
      path: "/",
    });
  }

  private clearAuthCookies(res: Response) {
    const domain = this.configService.get("COOKIE_DOMAIN");
    res.clearCookie("givvly_at", { path: "/", domain: domain || undefined });
    res.clearCookie("givvly_rt", {
      path: "/api/v1/auth",
      domain: domain || undefined,
    });
    res.clearCookie("givvly_csrf", { path: "/", domain: domain || undefined });
  }
}

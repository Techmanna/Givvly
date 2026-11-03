import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { Request } from "express";
import { IS_PUBLIC_KEY, RequestUser } from "../decorators/auth.decorator";

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      const request = context.switchToHttp().getRequest<Request>();
      const token = this.extractTokenFromRequest(request);
      if (token) {
        try {
          const secret = this.configService.get<string>("JWT_SECRET");
          const payload = await this.jwtService.verifyAsync(token, { secret });
          (request as Request & { user: RequestUser }).user = {
            id: payload.sub,
            email: payload.email,
            role: payload.role,
            sessionId: payload.sid,
          };
        } catch {
          // Public route: ignore invalid token, proceed as unauthenticated guest
        }
      }
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromRequest(request);

    if (!token) {
      throw new UnauthorizedException("Authentication token missing");
    }

    try {
      const secret = this.configService.get<string>("JWT_SECRET");
      const payload = await this.jwtService.verifyAsync(token, { secret });
      
      const user: RequestUser = {
        id: payload.sub,
        email: payload.email,
        role: payload.role,
        sessionId: payload.sid,
      };

      (request as Request & { user: RequestUser }).user = user;
      return true;
    } catch {
      throw new UnauthorizedException("Invalid or expired authentication token");
    }
  }

  private extractTokenFromRequest(request: Request): string | null {
    // 1. Check HTTP-only cookie `givvly_at`
    if (request.cookies && request.cookies.givvly_at) {
      return request.cookies.givvly_at;
    }

    // 2. Fallback to Authorization: Bearer <token>
    const [type, token] = request.headers.authorization?.split(" ") ?? [];
    return type === "Bearer" ? token : null;
  }
}


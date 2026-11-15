import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiCookieAuth,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { Role } from "@prisma/client";
import { Roles } from "../../common/decorators/auth.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { AuditService } from "./audit.service";

@ApiTags("Admin Audit Logs")
@ApiBearerAuth()
@ApiCookieAuth("givvly_at")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller("admin/audit-logs")
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @ApiOperation({
    summary: "Query platform-wide audit logs (admin only)",
  })
  async getAuditLogs(
    @Query("search") search?: string,
    @Query("targetType") targetType?: string,
    @Query("action") action?: string,
    @Query("authState") authState?: "ALL" | "AUTHENTICATED" | "GUEST",
    @Query("from") from?: string,
    @Query("to") to?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string
  ) {
    return this.auditService.queryLogs({
      search,
      targetType,
      action,
      authState,
      from,
      to,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 25,
    });
  }
}

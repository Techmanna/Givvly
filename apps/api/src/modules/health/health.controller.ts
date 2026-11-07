import { Controller, Get } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiOkResponse } from "@nestjs/swagger";
import { PrismaService } from "../../infra/prisma/prisma.service";
import { RedisService } from "../../infra/redis/redis.service";
import { Public } from "@/common/decorators/auth.decorator";

@ApiTags("System Health & Probes")
@Controller("health")
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService
  ) {}

  @Public()
  @Get()
  @ApiOperation({ summary: "Default health probe: verifies service is responding" })
  @ApiOkResponse({ description: "Service is live." })
  public getHealth(): { status: string; timestamp: string } {
    return { status: "ok", timestamp: new Date().toISOString() };
  }

  @Public()
  @Get("live")
  @ApiOperation({ summary: "Liveness probe: verifies process is running" })
  @ApiOkResponse({ description: "Service is live." })
  public getLive(): { status: string; timestamp: string } {
    return { status: "ok", timestamp: new Date().toISOString() };
  }

  @Public()
  @Get("ready")
  @ApiOperation({ summary: "Readiness probe: verifies database and cache connectivity" })
  @ApiOkResponse({ description: "Service and backing infrastructure connectivity status." })
  public async getReady(): Promise<{
    status: string;
    services: { database: string; redis: string };
    timestamp: string;
  }> {
    let dbStatus = "ok";
    let redisStatus = "ok";

    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      dbStatus = "down";
    }

    try {
      const ping = await this.redis.client.ping();
      if (ping !== "PONG") redisStatus = "degraded";
    } catch {
      redisStatus = "down";
    }

    const isHealthy = dbStatus === "ok" && redisStatus === "ok";

    return {
      status: isHealthy ? "ok" : "degraded",
      services: {
        database: dbStatus,
        redis: redisStatus,
      },
      timestamp: new Date().toISOString(),
    };
  }
}

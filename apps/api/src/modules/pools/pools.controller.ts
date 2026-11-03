import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
  UsePipes,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiParam,
  ApiBearerAuth,
  ApiCookieAuth,
} from "@nestjs/swagger";
import { PoolsService } from "./pools.service";
import {
  ContributePoolDto,
  contributePoolSchema,
  PoolContributionInitResponseDto,
  PoolDetailsResponseDto,
  PoolConversionResponseDto,
  PoolDeadlinesCheckResponseDto,
} from "./dto/contribute-pool.dto";
import { Public, CurrentUser } from "@/common/decorators/auth.decorator";
import { JwtAuthGuard } from "@/common/guards/jwt-auth.guard";
import { ZodValidationPipe } from "@/common/pipes/zod-validation.pipe";

@ApiTags("Group Gifting & Crowdfunded Pools")
@Controller()
export class PoolsController {
  constructor(private readonly poolsService: PoolsService) {}

  @Public()
  @Post("public/events/:slug/gifts/pool")
  @ApiOperation({ summary: "Contribute funds to a group gifting pool" })
  @ApiParam({ name: "slug", description: "Event slug" })
  @ApiCreatedResponse({
    description: "Contribution initiated with payment gateway.",
    type: PoolContributionInitResponseDto,
  })
  @UsePipes(new ZodValidationPipe(contributePoolSchema))
  async contributeToPool(
    @Param("slug") slug: string,
    @Body() dto: ContributePoolDto,
    @CurrentUser("id") userId?: string
  ): Promise<PoolContributionInitResponseDto> {
    return this.poolsService.contributeToPool(slug, dto, userId) as any;
  }

  @Public()
  @Get("public/events/:slug/pools/:id")
  @ApiOperation({ summary: "Get live crowdfunding progress details for a pool" })
  @ApiParam({ name: "slug", description: "Event slug" })
  @ApiParam({ name: "id", description: "Pool UUID" })
  @ApiOkResponse({
    description: "Crowdfunding pool progress and breakdown.",
    type: PoolDetailsResponseDto,
  })
  async getPoolDetails(
    @Param("slug") slug: string,
    @Param("id") poolId: string
  ): Promise<PoolDetailsResponseDto> {
    return this.poolsService.getPoolDetails(slug, poolId) as any;
  }

  @Post("events/:slug/pools/:id/convert-to-cash")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiCookieAuth("givvly_at")
  @ApiOperation({ summary: "Convert an underfunded or expired product pool to direct cash payout" })
  @ApiParam({ name: "slug", description: "Event slug" })
  @ApiParam({ name: "id", description: "Pool UUID" })
  @ApiOkResponse({
    description: "Pool converted to cash payout for host.",
    type: PoolConversionResponseDto,
  })
  async convertToCash(
    @Param("slug") slug: string,
    @Param("id") poolId: string,
    @CurrentUser("id") userId: string
  ): Promise<PoolConversionResponseDto> {
    return this.poolsService.convertToCash(slug, poolId, userId) as any;
  }

  @Public()
  @Post("events/pools/check-deadlines")
  @ApiOperation({ summary: "Trigger automated sweeper checking past-deadline pools" })
  @ApiOkResponse({
    description: "Count of checked and expired pools.",
    type: PoolDeadlinesCheckResponseDto,
  })
  async checkDeadlines(): Promise<PoolDeadlinesCheckResponseDto> {
    return this.poolsService.checkExpiredPools();
  }
}

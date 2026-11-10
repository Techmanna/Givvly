import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
  UnauthorizedException,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiParam,
} from "@nestjs/swagger";
import { CatalogService } from "./catalog.service";
import {
  CatalogQueryDto,
  CatalogProductResponseDto,
  CatalogCollectionResponseDto,
} from "./dto/catalog-query.dto";
import {
  Public,
  CurrentUser,
  RequestUser,
} from "../../common/decorators/auth.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";

@ApiTags("E-Commerce Catalog & Collections")
@Controller("catalog")
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Public()
  @Get("products")
  @ApiOperation({ summary: "Browse catalog products with filtering, search, and sorting" })
  @ApiOkResponse({
    description: "Paginated list of active catalog products.",
    type: [CatalogProductResponseDto],
  })
  async getProducts(
    @Query() query: CatalogQueryDto
  ): Promise<CatalogProductResponseDto[]> {
    return this.catalogService.getProducts(query) as any;
  }

  @Public()
  @Get("products/:slug")
  @ApiOperation({ summary: "Get product details by unique slug" })
  @ApiParam({ name: "slug", description: "Unique product slug" })
  @ApiOkResponse({
    description: "Detailed product information.",
    type: CatalogProductResponseDto,
  })
  async getProductBySlug(
    @Param("slug") slug: string
  ): Promise<CatalogProductResponseDto> {
    return this.catalogService.getProductBySlug(slug) as any;
  }

  @Public()
  @Get("products/:slug/reviews")
  @ApiOperation({ summary: "Get customer reviews for a product" })
  @ApiParam({ name: "slug", description: "Unique product slug" })
  async getProductReviews(@Param("slug") slug: string) {
    return this.catalogService.getProductReviews(slug);
  }

  @Public()
  @Get("products/:slug/review-eligibility")
  @ApiOperation({
    summary: "Check if the current authenticated user can review this product",
  })
  @ApiParam({ name: "slug", description: "Unique product slug" })
  async checkReviewEligibility(
    @Param("slug") slug: string,
    @CurrentUser() user?: RequestUser
  ) {
    return this.catalogService.checkReviewEligibility(slug, user);
  }

  @UseGuards(JwtAuthGuard)
  @Post("products/:slug/reviews")
  @ApiOperation({
    summary: "Submit a customer review for a product (verified purchasers only)",
  })
  @ApiParam({ name: "slug", description: "Unique product slug" })
  async createProductReview(
    @Param("slug") slug: string,
    @CurrentUser() user: RequestUser,
    @Body() dto: any
  ) {
    if (!user?.id) {
      throw new UnauthorizedException("You must be logged in to submit a review");
    }
    return this.catalogService.createProductReview(slug, dto, user);
  }

  @Public()
  @Get("collections")
  @ApiOperation({ summary: "Get curated collections of gifts and celebration hampers" })
  @ApiOkResponse({
    description: "List of curated collections.",
    type: [CatalogCollectionResponseDto],
  })
  async getCollections(): Promise<CatalogCollectionResponseDto[]> {
    return this.catalogService.getCollections() as any;
  }
}

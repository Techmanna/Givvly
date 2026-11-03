import { Controller, Get, Param, Query } from "@nestjs/common";
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
import { Public } from "../../common/decorators/auth.decorator";

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

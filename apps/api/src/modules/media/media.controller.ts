import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UsePipes,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiParam,
} from "@nestjs/swagger";
import { MediaService } from "./media.service";
import {
  PresignUploadDto,
  presignUploadSchema,
  PresignUploadResponseDto,
  CompleteUploadResponseDto,
} from "./dto/presign-upload.dto";
import { Public, CurrentUser } from "../../common/decorators/auth.decorator";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";

@ApiTags("Media & Presigned Uploads")
@Controller("uploads")
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Public()
  @Post("presign")
  @ApiOperation({ summary: "Request presigned URL for direct secure media upload" })
  @ApiCreatedResponse({
    description: "Presigned upload parameters and security headers.",
    type: PresignUploadResponseDto,
  })
  @UsePipes(new ZodValidationPipe(presignUploadSchema))
  async presign(
    @Body() dto: PresignUploadDto,
    @CurrentUser() user?: { id: string; role?: string }
  ): Promise<PresignUploadResponseDto> {
    return this.mediaService.presignUpload(dto, user) as any;
  }

  @Public()
  @Post(":mediaId/complete")
  @ApiOperation({ summary: "Notify upload completion and transition asset to READY" })
  @ApiParam({ name: "mediaId", description: "Media record UUID" })
  @ApiOkResponse({
    description: "Media verified and public CDN URL generated.",
    type: CompleteUploadResponseDto,
  })
  async complete(
    @Param("mediaId") mediaId: string,
    @CurrentUser() user?: { id: string; role?: string }
  ): Promise<CompleteUploadResponseDto> {
    return this.mediaService.completeUpload(mediaId, user) as any;
  }

  @Public()
  @Get(":mediaId")
  @ApiOperation({ summary: "Get media asset metadata by ID" })
  @ApiParam({ name: "mediaId", description: "Media record UUID" })
  @ApiOkResponse({ description: "Media record with CDN URL." })
  async getMedia(@Param("mediaId") mediaId: string) {
    return this.mediaService.getMediaById(mediaId);
  }
}

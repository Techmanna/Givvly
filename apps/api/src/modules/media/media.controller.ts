import * as fs from "node:fs";
import type { Request, Response } from "express";
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  Res,
  UploadedFile,
  UseInterceptors,
  UsePipes,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import {
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from "@nestjs/swagger";
import { MediaService } from "./media.service";
import {
  CompleteUploadResponseDto,
  MAX_VIDEO_SIZE_BYTES,
  PresignUploadDto,
  PresignUploadResponseDto,
  presignUploadSchema,
} from "./dto/presign-upload.dto";
import { CurrentUser, Public } from "../../common/decorators/auth.decorator";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";

async function readBoundedRequestBuffer(
  req: Request & { rawBody?: Buffer },
  maxBytes: number
): Promise<Buffer> {
  if (Buffer.isBuffer(req.rawBody) && req.rawBody.length > 0) {
    if (req.rawBody.length > maxBytes) {
      throw new BadRequestException("Uploaded payload exceeds maximum allowed size");
    }
    return req.rawBody;
  }

  if (Buffer.isBuffer(req.body) && req.body.length > 0) {
    if (req.body.length > maxBytes) {
      throw new BadRequestException("Uploaded payload exceeds maximum allowed size");
    }
    return req.body;
  }

  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    let total = 0;

    req.on("data", (chunk: Buffer) => {
      total += chunk.length;
      if (total > maxBytes) {
        req.destroy();
        reject(
          new BadRequestException("Uploaded payload exceeds maximum allowed size")
        );
        return;
      }
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });

    req.on("end", () => {
      resolve(Buffer.concat(chunks));
    });

    req.on("error", (err) => {
      reject(err);
    });
  });
}

@ApiTags("Media & Presigned Uploads")
@Controller("uploads")
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Public()
  @Get("providers")
  @ApiOperation({
    summary: "Inspect active file storage provider and registered adapters",
  })
  getStorageProviders() {
    return this.mediaService.getStorageInfo();
  }

  @Public()
  @Post("presign")
  @ApiOperation({
    summary: "Request presigned URL for direct secure image or video upload",
  })
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
  @Post(["file", ""])
  @UseInterceptors(
    FileInterceptor("file", {
      limits: {
        fileSize: MAX_VIDEO_SIZE_BYTES,
        files: 1,
      },
    })
  )
  @ApiConsumes("multipart/form-data")
  @ApiOperation({
    summary:
      "Upload an image or video file directly through the pluggable storage service",
  })
  @ApiBody({
    schema: {
      type: "object",
      required: ["file"],
      properties: {
        file: { type: "string", format: "binary" },
        purpose: {
          type: "string",
          enum: [
            "COVER_IMAGE",
            "WALL_POST",
            "AVATAR",
            "PRODUCT",
            "DISPUTE",
            "REGISTRY_ITEM",
          ],
        },
        provider: {
          type: "string",
          enum: ["DISK", "CLOUDINARY", "S3"],
        },
      },
    },
  })
  async uploadFile(
    @UploadedFile()
    file:
      | {
          buffer: Buffer;
          mimetype: string;
          size: number;
          originalname?: string;
        }
      | undefined,
    @Body("purpose") purpose?: string,
    @Body("provider") provider?: string,
    @CurrentUser() user?: { id: string; role?: string }
  ) {
    if (!file || !file.buffer) {
      throw new BadRequestException("No media file provided in 'file' field");
    }

    return this.mediaService.uploadDirectFile(
      {
        buffer: file.buffer,
        mime: file.mimetype,
        sizeBytes: file.size,
        purpose: purpose || "COVER_IMAGE",
        provider,
      },
      user
    );
  }

  @Public()
  @Put(["raw/uploads/:folder/:filename", "raw/:folder/:filename"])
  @ApiOperation({
    summary: "Signed binary PUT receiver for local DISK storage provider",
  })
  async uploadRawToDisk(
    @Param("folder") folder: string,
    @Param("filename") filename: string,
    @Query("expires") expires: string | undefined,
    @Query("mime") mime: string | undefined,
    @Query("maxBytes") maxBytes: string | undefined,
    @Query("sig") sig: string | undefined,
    @Req() req: Request & { rawBody?: Buffer }
  ) {
    const key = `uploads/${folder}/${filename}`;
    const declaredMax = Math.min(
      Number(maxBytes) || MAX_VIDEO_SIZE_BYTES,
      MAX_VIDEO_SIZE_BYTES
    );
    const buffer = await readBoundedRequestBuffer(req, declaredMax);

    return this.mediaService.handleSignedDiskUpload(key, buffer, {
      expires,
      mime,
      maxBytes,
      sig,
    });
  }

  @Public()
  @Get(["files/uploads/:folder/:filename", "files/:folder/:filename"])
  @ApiOperation({
    summary: "Serve uploaded image or video from DISK storage with hardened headers",
  })
  async serveDiskFile(
    @Param("folder") folder: string,
    @Param("filename") filename: string,
    @Req() req: Request,
    @Res() res: Response
  ) {
    const key = `uploads/${folder}/${filename}`;
    const info = await this.mediaService.resolveDiskFileForServing(key);

    res.setHeader("Content-Type", info.mime);
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'none'; style-src 'unsafe-inline'; sandbox"
    );
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    res.setHeader("Accept-Ranges", "bytes");

    const range = req.headers.range;
    if (range && info.kind === "VIDEO") {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0] || "0", 10);
      const end = parts[1] ? parseInt(parts[1], 10) : info.sizeBytes - 1;

      if (
        Number.isNaN(start) ||
        Number.isNaN(end) ||
        start < 0 ||
        end >= info.sizeBytes ||
        start > end
      ) {
        res.status(416).setHeader("Content-Range", `bytes */${info.sizeBytes}`);
        res.end();
        return;
      }

      const chunkSize = end - start + 1;
      res.status(206);
      res.setHeader("Content-Range", `bytes ${start}-${end}/${info.sizeBytes}`);
      res.setHeader("Content-Length", String(chunkSize));

      const stream = fs.createReadStream(info.filePath, { start, end });
      stream.pipe(res);
      return;
    }

    res.status(200);
    res.setHeader("Content-Length", String(info.sizeBytes));
    const stream = fs.createReadStream(info.filePath);
    stream.pipe(res);
  }

  @Public()
  @Post(":mediaId/complete")
  @ApiOperation({
    summary: "Notify upload completion and transition asset to READY",
  })
  @ApiParam({ name: "mediaId", description: "Media record UUID" })
  @ApiOkResponse({
    description: "Media verified and public URL generated.",
    type: CompleteUploadResponseDto,
  })
  async complete(
    @Param("mediaId") mediaId: string,
    @CurrentUser() user?: { id: string; role?: string }
  ): Promise<CompleteUploadResponseDto> {
    return this.mediaService.completeUpload(mediaId, user) as any;
  }

  @Delete(":mediaId")
  @ApiOperation({ summary: "Delete media asset from storage and database" })
  @ApiParam({ name: "mediaId", description: "Media record UUID" })
  async deleteMedia(
    @Param("mediaId") mediaId: string,
    @CurrentUser() user?: { id: string; role?: string }
  ) {
    return this.mediaService.deleteMedia(mediaId, user);
  }

  @Public()
  @Get(":mediaId")
  @ApiOperation({ summary: "Get media asset metadata by ID" })
  @ApiParam({ name: "mediaId", description: "Media record UUID" })
  @ApiOkResponse({ description: "Media record with public URL." })
  async getMedia(@Param("mediaId") mediaId: string) {
    return this.mediaService.getMediaById(mediaId);
  }
}

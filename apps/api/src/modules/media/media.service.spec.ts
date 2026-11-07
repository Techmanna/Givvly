import { Test, TestingModule } from "@nestjs/testing";
import { MediaService } from "./media.service";
import { PrismaService } from "../../infra/prisma/prisma.service";
import { ConfigService } from "@nestjs/config";
import { MediaStatus } from "@prisma/client";
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";

describe("MediaService", () => {
  let service: MediaService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      media: {
        create: jest.fn().mockImplementation(({ data }: any) =>
          Promise.resolve({ id: data.id || "media-1", ...data, createdAt: new Date() })
        ),
        findUnique: jest.fn().mockImplementation(({ where }: any) => {
          if (where.id === "media-1") {
            return Promise.resolve({
              id: "media-1",
              key: "uploads/cover_image/media-1.jpg",
              ownerUserId: "user-1",
              mime: "image/jpeg",
              kind: "IMAGE",
              sizeBytes: 1024000,
              purpose: "COVER_IMAGE",
              status: MediaStatus.UPLOADING,
            });
          }
          return Promise.resolve(null);
        }),
        update: jest.fn().mockImplementation(({ data }: any) =>
          Promise.resolve({
            id: "media-1",
            key: "uploads/cover_image/media-1.jpg",
            status: data.status,
            purpose: "COVER_IMAGE",
            kind: "IMAGE",
          })
        ),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        delete: jest.fn().mockResolvedValue({ id: "media-1" }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MediaService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === "CDN_BASE_URL") return "https://cdn.givvly.ng";
              if (key === "STORAGE_PROVIDER") return "DISK";
              if (key === "STORAGE_DISK_DIR") return "/tmp/givvly-media-spec";
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<MediaService>(MediaService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("presignUpload", () => {
    it("generates presigned upload URL for images and creates media row", async () => {
      const result = await service.presignUpload(
        {
          purpose: "COVER_IMAGE",
          mime: "image/jpeg",
          sizeBytes: 1024000,
        },
        { id: "user-1" }
      );

      expect(result).toBeDefined();
      expect(result.mediaId).toBeDefined();
      expect(result.key).toContain("uploads/cover_image/");
      expect(result.key).toContain(".jpg");
      expect(result.uploadUrl).toContain("https://cdn.givvly.ng/raw-upload/");
      expect(result.method).toBe("PUT");
      expect(result.kind).toBe("IMAGE");
      expect(prisma.media.create).toHaveBeenCalled();
    });

    it("supports video uploads and purpose aliases (e.g. WALL_PHOTO / video/mp4)", async () => {
      const result = await service.presignUpload(
        {
          purpose: "WALL_PHOTO",
          contentType: "video/mp4",
          sizeBytes: 15 * 1024 * 1024,
        },
        { id: "user-1" }
      );

      expect(result.kind).toBe("VIDEO");
      expect(result.key).toContain("uploads/wall_post/");
      expect(result.key).toContain(".mp4");
    });

    it("rejects unsupported MIME types or oversized files", async () => {
      await expect(
        service.presignUpload({
          purpose: "COVER_IMAGE",
          mime: "image/svg+xml" as any,
          sizeBytes: 1024,
        })
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.presignUpload({
          purpose: "AVATAR",
          mime: "image/jpeg",
          sizeBytes: 10 * 1024 * 1024, // Exceeds 2MB avatar limit
        })
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("uploadDirectFile", () => {
    it("validates magic bytes, saves file to storage, and creates READY media record", async () => {
      const validJpegBuffer = Buffer.from([
        0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
        0x01, 0x01, 0x00, 0x48,
      ]);

      const uploaded = await service.uploadDirectFile(
        {
          buffer: validJpegBuffer,
          mime: "image/jpeg",
          sizeBytes: validJpegBuffer.length,
          purpose: "PRODUCT",
        },
        { id: "admin-1", role: "ADMIN" }
      );

      expect(uploaded.status).toBe(MediaStatus.READY);
      expect(uploaded.kind).toBe("IMAGE");
      expect(uploaded.key).toContain("uploads/product/");
      expect(uploaded.url).toContain("https://cdn.givvly.ng/uploads/product/");
    });

    it("blocks direct upload when binary magic bytes do not match declared MIME", async () => {
      const fakeJpegBuffer = Buffer.from("<html><script>alert(1)</script></html>");
      await expect(
        service.uploadDirectFile({
          buffer: fakeJpegBuffer,
          mime: "image/jpeg",
          sizeBytes: fakeJpegBuffer.length,
          purpose: "PRODUCT",
        })
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("completeUpload", () => {
    it("transitions media to READY and returns public URL", async () => {
      const completed = await service.completeUpload("media-1", { id: "user-1" });
      expect(completed.status).toBe(MediaStatus.READY);
      expect(completed.url).toBe("https://cdn.givvly.ng/uploads/cover_image/media-1.jpg");
    });

    it("rejects completion if caller is not the owner or admin", async () => {
      await expect(
        service.completeUpload("media-1", { id: "intruder-user", role: "USER" })
      ).rejects.toThrow(ForbiddenException);
    });

    it("throws NotFoundException if media does not exist", async () => {
      await expect(service.completeUpload("unknown-id")).rejects.toThrow(
        NotFoundException
      );
    });
  });
});

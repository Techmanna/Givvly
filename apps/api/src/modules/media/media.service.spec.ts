import { Test, TestingModule } from "@nestjs/testing";
import { MediaService } from "./media.service";
import { PrismaService } from "../../infra/prisma/prisma.service";
import { ConfigService } from "@nestjs/config";
import { MediaStatus } from "@prisma/client";
import { ForbiddenException, NotFoundException } from "@nestjs/common";

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
          })
        ),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MediaService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue("https://cdn.givvly.ng"),
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
    it("generates presigned upload URL and creates media row", async () => {
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
      expect(prisma.media.create).toHaveBeenCalled();
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


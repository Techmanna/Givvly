import { BadRequestException, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { StorageProviderRegistry } from "./storage-provider.registry";
import { DiskStorageProvider } from "./adapters/disk.storage";
import { CloudinaryStorageProvider } from "./adapters/cloudinary.storage";
import { S3StorageProvider } from "./adapters/s3.storage";
import {
  buildSafeStorageKey,
  isSafeMediaUrl,
  resolveSafeDiskPath,
  validateFileMagicBytes,
  validateStorageKey,
} from "./file-security.util";

describe("StorageProviderRegistry & File Security Validation", () => {
  let config: ConfigService;
  let registry: StorageProviderRegistry;

  beforeEach(() => {
    config = {
      get: jest.fn((key: string) => {
        const map: Record<string, string> = {
          STORAGE_PROVIDER: "DISK",
          STORAGE_DISK_DIR: "/tmp/givvly-test-uploads",
          API_URL: "http://localhost:4000",
          CLOUDINARY_CLOUD_NAME: "demo-cloud",
          CLOUDINARY_API_KEY: "123456",
          CLOUDINARY_API_SECRET: "secret_abc",
          S3_BUCKET: "givvly-bucket",
          S3_REGION: "eu-west-1",
          S3_ACCESS_KEY_ID: "AKIAIOSFODNN7EXAMPLE",
          S3_SECRET_ACCESS_KEY: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
        };
        return map[key];
      }),
    } as unknown as ConfigService;

    registry = new StorageProviderRegistry(
      config,
      new DiskStorageProvider(config),
      new CloudinaryStorageProvider(config),
      new S3StorageProvider(config)
    );
  });

  describe("Multi-provider scaling and runtime switching", () => {
    it("registers DISK, CLOUDINARY, and S3 out of the box", () => {
      expect(registry.listProviders()).toEqual(
        expect.arrayContaining(["DISK", "CLOUDINARY", "S3"])
      );
      expect(registry.getActiveProviderName()).toBe("DISK");
    });

    it("switches active storage provider dynamically at any time", () => {
      registry.setActiveProvider("CLOUDINARY");
      expect(registry.getActiveProviderName()).toBe("CLOUDINARY");
      expect(registry.getProvider().providerName).toBe("CLOUDINARY");

      registry.setActiveProvider("S3");
      expect(registry.getActiveProviderName()).toBe("S3");
      expect(registry.getProvider().providerName).toBe("S3");
    });

    it("generates valid presigned uploads across DISK, CLOUDINARY, and S3", async () => {
      const key = "uploads/product/a0000000-0000-0000-0000-000000000001.mp4";

      const diskPresign = await registry.getProvider("DISK").createPresignedUpload({
        key,
        mime: "video/mp4",
        sizeBytes: 2048000,
        kind: "VIDEO",
        purpose: "PRODUCT",
      });
      expect(diskPresign.provider).toBe("DISK");
      expect(diskPresign.method).toBe("PUT");
      expect(diskPresign.uploadUrl).toContain("/api/v1/uploads/raw/uploads/product/");

      const cloudPresign = await registry
        .getProvider("CLOUDINARY")
        .createPresignedUpload({
          key,
          mime: "video/mp4",
          sizeBytes: 2048000,
          kind: "VIDEO",
          purpose: "PRODUCT",
        });
      expect(cloudPresign.provider).toBe("CLOUDINARY");
      expect(cloudPresign.method).toBe("POST");
      expect(cloudPresign.uploadUrl).toContain(
        "https://api.cloudinary.com/v1_1/demo-cloud/video/upload"
      );
      expect(cloudPresign.fields?.signature).toBeDefined();

      const s3Presign = await registry.getProvider("S3").createPresignedUpload({
        key,
        mime: "video/mp4",
        sizeBytes: 2048000,
        kind: "VIDEO",
        purpose: "PRODUCT",
      });
      expect(s3Presign.provider).toBe("S3");
      expect(s3Presign.method).toBe("PUT");
      expect(s3Presign.uploadUrl).toContain("X-Amz-Signature=");
    });

    it("throws NotFoundException for unregistered storage provider", () => {
      expect(() => registry.setActiveProvider("UNKNOWN_CLOUD")).toThrow(
        NotFoundException
      );
    });
  });

  describe("File Magic Bytes & Anti-Injection Security", () => {
    it("accepts valid JPEG, PNG, WebP, and MP4 binary headers", () => {
      const jpegBuf = Buffer.from([
        0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
      ]);
      expect(() => validateFileMagicBytes(jpegBuf, "image/jpeg")).not.toThrow();

      const pngBuf = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
      ]);
      expect(() => validateFileMagicBytes(pngBuf, "image/png")).not.toThrow();

      const webpBuf = Buffer.from("RIFF\x00\x00\x00\x00WEBPVP8 ", "ascii");
      expect(() => validateFileMagicBytes(webpBuf, "image/webp")).not.toThrow();

      const mp4Buf = Buffer.from(
        "\x00\x00\x00\x18ftypmp42\x00\x00\x00\x00",
        "binary"
      );
      expect(() => validateFileMagicBytes(mp4Buf, "video/mp4")).not.toThrow();
    });

    it("rejects disguised HTML/SVG/Script polyglot files and mismatched MIME types", () => {
      const svgPolyglot = Buffer.from(
        "\xff\xd8\xff<script>alert(1)</script>padding",
        "utf8"
      );
      expect(() => validateFileMagicBytes(svgPolyglot, "image/jpeg")).toThrow(
        BadRequestException
      );

      const pngAsJpeg = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
      ]);
      expect(() => validateFileMagicBytes(pngAsJpeg, "image/jpeg")).toThrow(
        BadRequestException
      );
    });

    it("blocks path traversal in storage keys and disk resolution", () => {
      expect(() => validateStorageKey("uploads/../../etc/passwd")).toThrow(
        BadRequestException
      );
      expect(() =>
        validateStorageKey("uploads/cover_image/malicious.svg")
      ).toThrow(BadRequestException);
      expect(() =>
        resolveSafeDiskPath("/tmp/uploads", "uploads/../../../etc/shadow")
      ).toThrow(BadRequestException);

      const safeKey = buildSafeStorageKey(
        "COVER_IMAGE",
        "a0000000-0000-0000-0000-000000000001",
        "image/png"
      );
      expect(safeKey).toBe(
        "uploads/cover_image/a0000000-0000-0000-0000-000000000001.png"
      );
    });

    it("blocks XSS and dangerous protocols in media URLs", () => {
      expect(isSafeMediaUrl("javascript:alert(1)")).toBe(false);
      expect(isSafeMediaUrl("data:text/html,<script>alert(1)</script>")).toBe(
        false
      );
      expect(
        isSafeMediaUrl('https://cdn.givvly.vercel.app/img.jpg" onerror="alert(1)')
      ).toBe(false);
      expect(isSafeMediaUrl("/images/../../secret")).toBe(false);
      expect(
        isSafeMediaUrl("https://cdn.givvly.vercel.app/uploads/product/item.jpg")
      ).toBe(true);
      expect(isSafeMediaUrl("/images/gifts/box-luxury.jpg")).toBe(true);
    });
  });
});


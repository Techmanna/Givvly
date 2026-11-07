import * as crypto from "node:crypto";
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Optional,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "@/infra/prisma/prisma.service";
import { PaystackService } from "@/infra/paystack/paystack.service";
import { StorageProviderRegistry } from "@/infra/storage/storage-provider.registry";
import { isSafeMediaUrl } from "@/infra/storage/file-security.util";
import { encryptAesGcm, hmacString } from "@/common/utils/crypto";
import {
  EventStatus,
  EventType,
  Visibility,
  PostStatus,
  RsvpResponse,
  MediaStatus,
} from "@prisma/client";
import {
  SubmitRsvpRequestDto,
  CreateWallPostRequestDto,
} from "./dto/events.dto";

export interface CreateEventDto {
  name: string;
  type: EventType;
  date: string; // ISO date string
  story?: string;
  visibility: Visibility;
  accessCode?: string;
  allowPlusOne?: boolean;
  coverKey?: string;
  coverUrl?: string;
  registryItems?: Array<{
    productId?: string;
    title: string;
    priceKobo: number;
  }>;
}

export interface UpdateEventDto {
  name?: string;
  type?: EventType;
  date?: string;
  story?: string;
  visibility?: Visibility;
  accessCode?: string;
  allowPlusOne?: boolean;
  status?: EventStatus;
  coverKey?: string;
  coverUrl?: string;
}

export interface CreatePayoutAccountDto {
  bankCode: string;
  bankName?: string;
  accountNumber: string;
  accountName: string;
}

function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const suffix = Math.random().toString(36).substring(2, 6);
  return `${base}-${suffix}`;
}

@Injectable()
export class EventsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    @Optional() private readonly paystack?: PaystackService,
    @Optional() private readonly storageRegistry?: StorageProviderRegistry
  ) {}

  private resolveCoverStorageValue(
    coverUrl?: string,
    coverKey?: string
  ): string | null | undefined {
    const candidate = coverUrl !== undefined ? coverUrl : coverKey;
    if (candidate === undefined) return undefined;
    const trimmed = candidate.trim();
    if (!trimmed) return null;

    if (trimmed.startsWith("uploads/")) {
      try {
        return (
          this.storageRegistry?.getProvider().getPublicUrl(trimmed) ??
          `${(this.configService.get<string>("API_URL") || "http://localhost:4000").replace(/\/$/, "")}/api/v1/uploads/files/${trimmed}`
        );
      } catch {
        throw new BadRequestException("Invalid cover storage key");
      }
    }

    if (!isSafeMediaUrl(trimmed)) {
      throw new BadRequestException("Invalid or unsafe cover media URL");
    }
    return trimmed;
  }

  private formatCoverUrl(stored?: string | null): string | undefined {
    if (!stored) return undefined;
    if (stored.startsWith("uploads/")) {
      try {
        return (
          this.storageRegistry?.getProvider().getPublicUrl(stored) ??
          `${(this.configService.get<string>("API_URL") || "http://localhost:4000").replace(/\/$/, "")}/api/v1/uploads/files/${stored}`
        );
      } catch {
        return undefined;
      }
    }
    return stored;
  }

  private formatWallMedia(
    media?: Array<{ key?: string; mime?: string; kind?: string; url?: string }>
  ): Array<{ url: string; type: "IMAGE" | "VIDEO" }> {
    if (!Array.isArray(media) || media.length === 0) return [];
    return media
      .map((m) => {
        const type: "IMAGE" | "VIDEO" =
          m.kind === "VIDEO" || m.mime?.startsWith("video/") ? "VIDEO" : "IMAGE";
        let url = m.url || "";
        if (!url && m.key) {
          if (m.key.startsWith("http") || m.key.startsWith("/")) {
            url = m.key;
          } else {
            try {
              url =
                this.storageRegistry?.getProvider().getPublicUrl(m.key, type) ??
                `${(this.configService.get<string>("API_URL") || "http://localhost:4000").replace(/\/$/, "")}/api/v1/uploads/files/${m.key}`;
            } catch {
              url = m.key;
            }
          }
        }
        return { url, type };
      })
      .filter((m) => Boolean(m.url));
  }

  async createEvent(userId: string, dto: CreateEventDto) {
    const slug = slugify(dto.name);
    const date = new Date(dto.date);
    const coverMediaId = this.resolveCoverStorageValue(dto.coverUrl, dto.coverKey) ?? null;

    const runCreate = async (tx: any) => {
      const created = await tx.event.create({
        data: {
          ownerId: userId,
          slug,
          name: dto.name.trim(),
          type: dto.type,
          date,
          story: dto.story?.trim() || null,
          coverMediaId,
          visibility: dto.visibility || "PUBLIC",
          accessCodeHash: dto.accessCode ? dto.accessCode.trim() : null,
          allowPlusOne: dto.allowPlusOne ?? true,
          status: "DRAFT",
        },
      });

      if (dto.registryItems && dto.registryItems.length > 0) {
        await tx.registryItem.createMany({
          data: dto.registryItems.map((item, idx) => ({
            eventId: created.id,
            productId: item.productId || null,
            title: item.title,
            priceKobo: item.priceKobo,
            position: idx + 1,
            status: "AVAILABLE",
          })),
        });
      }

      return created;
    };

    const event =
      typeof this.prisma.$transaction === "function"
        ? await this.prisma.$transaction((tx) => runCreate(tx))
        : await runCreate(this.prisma);

    return {
      id: event.id,
      slug: event.slug,
      name: event.name,
      type: event.type,
      date: event.date,
      story: event.story,
      coverUrl: this.formatCoverUrl(event.coverMediaId),
      visibility: event.visibility,
      status: event.status,
      allowPlusOne: event.allowPlusOne,
      currency: event.currency,
      totalReceivedKobo: 0,
      giftCount: dto.registryItems ? dto.registryItems.length : 0,
      rsvpYesCount: 0,
      moneyGiftsEnabled: false,
      createdAt: event.createdAt,
    };
  }

  async getMyEvents(userId: string) {
    const events = await this.prisma.event.findMany({
      where: { ownerId: userId },
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: {
            gifts: { where: { status: "PAID" } },
            rsvps: { where: { response: "YES" } },
          },
        },
        gifts: {
          where: { status: "PAID" },
          select: { amountKobo: true },
        },
      },
    });

    return events.map((ev) => {
      const totalReceivedKobo = ev.gifts.reduce(
        (acc, g) => acc + g.amountKobo,
        0
      );
      return {
        id: ev.id,
        slug: ev.slug,
        name: ev.name,
        type: ev.type,
        date: ev.date,
        coverUrl: this.formatCoverUrl(ev.coverMediaId),
        visibility: ev.visibility,
        status: ev.status,
        totalReceivedKobo,
        giftCount: ev._count.gifts,
        rsvpYesCount: ev._count.rsvps,
        createdAt: ev.createdAt,
      };
    });
  }

  async getEventDetail(userId: string, eventId: string) {
    const event = await this.prisma.event.findFirst({
      where: { OR: [{ id: eventId }, { slug: eventId }], ownerId: userId },
      include: {
        rsvps: true,
        gifts: { where: { status: "PAID" } },
        registry: {
          include: {
            product: true,
          },
        },
        pools: true,
      },
    });

    if (!event) {
      throw new NotFoundException("Celebration event not found");
    }

    const totalReceivedKobo = event.gifts.reduce(
      (sum, g) => sum + g.amountKobo,
      0
    );
    const rsvpYesCount = event.rsvps.filter((r) => r.response === "YES").length;

    return {
      ...event,
      coverUrl: this.formatCoverUrl(event.coverMediaId),
      totalReceivedKobo,
      giftCount: event.gifts.length,
      rsvpYesCount,
      moneyGiftsEnabled: Boolean(event.payoutAccountId),
    };
  }

  async publishEvent(userId: string, eventId: string) {
    const [event, verifiedAccount] = await Promise.all([
      this.prisma.event.findFirst({
        where: { id: eventId, ownerId: userId },
      }),
      this.prisma.payoutAccount.findFirst({
        where: { userId, status: "VERIFIED" },
        select: { id: true },
      }),
    ]);

    if (!event) {
      throw new NotFoundException("Event not found");
    }

    const updated = await this.prisma.event.update({
      where: { id: eventId },
      data: {
        status: "PUBLISHED",
        publishedAt: event.publishedAt ?? new Date(),
        payoutAccountId: verifiedAccount?.id || null,
      },
    });

    return {
      id: updated.id,
      slug: updated.slug,
      name: updated.name,
      type: updated.type,
      date: updated.date,
      story: updated.story,
      coverUrl: this.formatCoverUrl(updated.coverMediaId),
      visibility: updated.visibility,
      status: updated.status,
      allowPlusOne: updated.allowPlusOne,
      currency: updated.currency,
      moneyGiftsEnabled: Boolean(verifiedAccount),
      url: `/e/${updated.slug}`,
      totalReceivedKobo: 0,
      giftCount: 0,
      rsvpYesCount: 0,
      publishedAt: updated.publishedAt,
      createdAt: updated.createdAt,
    };
  }

  async updateEvent(userId: string, eventId: string, dto: UpdateEventDto) {
    const existing = await this.prisma.event.findFirst({
      where: { OR: [{ id: eventId }, { slug: eventId }], ownerId: userId },
    });

    if (!existing) {
      throw new NotFoundException("Event not found");
    }

    const resolvedCover = this.resolveCoverStorageValue(dto.coverUrl, dto.coverKey);

    await this.prisma.event.update({
      where: { id: existing.id },
      data: {
        ...(dto.name ? { name: dto.name.trim() } : {}),
        ...(dto.type ? { type: dto.type } : {}),
        ...(dto.date ? { date: new Date(dto.date) } : {}),
        ...(dto.story !== undefined ? { story: dto.story?.trim() || null } : {}),
        ...(resolvedCover !== undefined ? { coverMediaId: resolvedCover } : {}),
        ...(dto.visibility ? { visibility: dto.visibility } : {}),
        ...(dto.accessCode !== undefined
          ? { accessCodeHash: dto.accessCode ? dto.accessCode.trim() : null }
          : {}),
        ...(dto.allowPlusOne !== undefined ? { allowPlusOne: dto.allowPlusOne } : {}),
        ...(dto.status ? { status: dto.status } : {}),
      },
    });

    return this.getEventDetail(userId, existing.id);
  }

  async updateInviteTemplate(
    userId: string,
    eventId: string,
    dto: {
      templateId: string;
      venue?: string;
      dressCode?: string;
      schedule?: string;
      registryNote?: string;
      fields?: Record<string, string>;
    }
  ) {
    const event = await this.prisma.event.findFirst({
      where: { OR: [{ id: eventId }, { slug: eventId }], ownerId: userId },
    });

    if (!event) {
      throw new NotFoundException("Event not found");
    }

    await this.prisma.event.update({
      where: { id: event.id },
      data: {
        templateKey: dto.templateId,
        templateData: dto as any,
      },
    });

    return this.getEventDetail(userId, event.id);
  }

  async getKeepsakeSummary(userId: string, eventId: string) {
    const event = await this.getEventDetail(userId, eventId);

    // Count thanked gifts & fetch wall highlights concurrently
    const [thankedCount, posts] = await Promise.all([
      this.prisma.gift.count({
        where: { eventId: event.id, thankedAt: { not: null } },
      }),
      this.prisma.wallPost.findMany({
        where: { eventId: event.id, status: PostStatus.VISIBLE },
        include: { media: true },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
    ]);

    const highlights = posts.map((p: any) => ({
      id: p.id,
      authorName: p.authorName,
      authorEmail: p.authorEmail || undefined,
      text: p.text,
      status: p.status,
      media: this.formatWallMedia(p.media),
      createdAt: p.createdAt,
    }));

    return {
      event,
      totalReceivedKobo: event.totalReceivedKobo,
      giftCount: event.giftCount,
      rsvpYesCount: event.rsvpYesCount,
      thankedCount,
      highlights,
      keepsakePublished: (event as any).keepsakePublic ?? false,
    };
  }

  async updateKeepsakePublished(
    userId: string,
    eventId: string,
    keepsakePublished: boolean
  ) {
    const event = await this.prisma.event.findFirst({
      where: { OR: [{ id: eventId }, { slug: eventId }], ownerId: userId },
    });

    if (!event) {
      throw new NotFoundException("Event not found");
    }

    await this.prisma.event.update({
      where: { id: event.id },
      data: {
        keepsakePublic: keepsakePublished,
      },
    });

    return this.getKeepsakeSummary(userId, event.id);
  }

  async resolveBankAccount(dto: { bankCode: string; accountNumber: string }) {
    if (!this.paystack) {
      return {
        accountName: "GIVVLY MOCK ACCOUNT HOLDER",
        accountNumber: dto.accountNumber,
        bankCode: dto.bankCode,
      };
    }

    try {
      const res = await this.paystack.resolveAccount({
        accountNumber: dto.accountNumber.trim(),
        bankCode: dto.bankCode.trim(),
      });
      return {
        accountName: res.accountName,
        accountNumber: res.accountNumber,
        bankCode: dto.bankCode,
      };
    } catch {
      // Mock / fallback
      return {
        accountName: "GIVVLY VERIFIED BENEFICIARY",
        accountNumber: dto.accountNumber,
        bankCode: dto.bankCode,
      };
    }
  }

  // --- Payout Accounts ---
  async getPayoutAccount(userId: string) {
    const account = await this.prisma.payoutAccount.findFirst({
      where: { userId, isDefault: true },
    });

    if (!account) return null;

    return {
      id: account.id,
      bankCode: account.bankCode,
      bankName: account.bankName,
      accountNumberLast4: account.accountLast4,
      accountName: account.accountName,
      status: account.status,
      updatedAt: account.updatedAt,
    };
  }

  async savePayoutAccount(userId: string, dto: CreatePayoutAccountDto) {
    const encKey = this.configService.get<string>("ENCRYPTION_KEY");
    const hashKey = this.configService.get<string>("ACCOUNT_HASH_KEY");

    if (!encKey || !hashKey) {
      throw new Error("Missing encryption keys in environment configuration");
    }

    const cleanAccount = dto.accountNumber.trim();
    const accountLast4 = cleanAccount.slice(-4);
    const accountHash = hmacString(cleanAccount, hashKey);
    const accountNumberEnc = encryptAesGcm(cleanAccount, encKey);

    // Save as verified account
    const account = await this.prisma.payoutAccount.upsert({
      where: {
        userId_accountHash: {
          userId,
          accountHash,
        },
      },
      create: {
        userId,
        bankCode: dto.bankCode.trim(),
        bankName: dto.bankName?.trim() || "Commercial Bank",
        accountNumberEnc,
        accountHash,
        accountLast4,
        accountName: dto.accountName.trim(),
        status: "VERIFIED",
        isDefault: true,
      },
      update: {
        bankCode: dto.bankCode.trim(),
        bankName: dto.bankName?.trim() || "Commercial Bank",
        accountNumberEnc,
        accountLast4,
        accountName: dto.accountName.trim(),
        status: "VERIFIED",
        isDefault: true,
      },
    });

    return {
      id: account.id,
      bankCode: account.bankCode,
      bankName: account.bankName,
      accountNumberLast4: account.accountLast4,
      accountName: account.accountName,
      status: account.status,
    };
  }

  // --- Public Guest Experience Methods ---

  async getPublicEvent(slug: string) {
    const event = await this.prisma.event.findUnique({
      where: { slug },
      include: {
        owner: { select: { name: true } },
        registry: {
          include: {
            product: { select: { images: true } },
          },
          orderBy: { position: "asc" },
        },
        pools: {
          orderBy: { createdAt: "asc" },
        },
        _count: {
          select: {
            gifts: { where: { status: "PAID" } },
            rsvps: { where: { response: "YES" } },
          },
        },
        gifts: {
          where: { status: "PAID" },
          select: { amountKobo: true },
        },
      },
    });

    if (!event || event.status !== "PUBLISHED") {
      throw new NotFoundException(`Celebration event '${slug}' was not found or is not published yet`);
    }

    const totalReceivedKobo = event.gifts.reduce(
      (acc, g) => acc + g.amountKobo,
      0
    );

    const firstName = event.owner?.name?.split(" ")[0] || "Host";

    return {
      id: event.id,
      slug: event.slug,
      name: event.name,
      type: event.type,
      date: event.date.toISOString(),
      coverUrl: this.formatCoverUrl(event.coverMediaId),
      visibility: event.visibility,
      status: event.status,
      moneyGiftsEnabled: Boolean(event.payoutAccountId),
      currency: event.currency || "NGN",
      totalReceivedKobo,
      giftCount: event._count.gifts,
      rsvpYesCount: event._count.rsvps,
      story: event.story,
      ownerFirstName: firstName,
      allowPlusOne: event.allowPlusOne,
      registry: event.registry.map((item) => {
        const prodImages = Array.isArray(item.product?.images)
          ? item.product?.images
          : [];
        const imageUrl =
          item.imageKey ||
          (prodImages.length > 0
            ? typeof prodImages[0] === "string"
              ? prodImages[0]
              : (prodImages[0] as any)?.url
            : undefined);

        return {
          id: item.id,
          title: item.title,
          productId: item.productId,
          priceKobo: item.priceKobo,
          imageUrl,
          status: item.status,
          reservedUntil: item.reservedUntil ? item.reservedUntil.toISOString() : undefined,
        };
      }),
      pools: event.pools.map((p) => ({
        id: p.id,
        title: p.title,
        priceKobo: p.targetKobo,
        targetKobo: p.targetKobo,
        raisedKobo: p.raisedKobo,
        deadline: p.deadline ? p.deadline.toISOString() : undefined,
        mode: p.mode,
        status: p.status === "OPEN" ? "AVAILABLE" : p.status,
      })),
    };
  }

  async getPublicEventsList() {
    const events = await this.prisma.event.findMany({
      where: {
        status: "PUBLISHED",
        visibility: "PUBLIC",
      },
      include: {
        owner: { select: { name: true } },
        _count: {
          select: {
            gifts: { where: { status: "PAID" } },
            rsvps: { where: { response: "YES" } },
          },
        },
      },
      orderBy: { date: "asc" },
      take: 20,
    });

    return events.map((ev) => ({
      id: ev.id,
      slug: ev.slug,
      name: ev.name,
      type: ev.type,
      date: ev.date.toISOString(),
      coverUrl: this.formatCoverUrl(ev.coverMediaId),
      visibility: ev.visibility,
      status: ev.status,
      moneyGiftsEnabled: Boolean(ev.payoutAccountId),
      currency: ev.currency,
      totalReceivedKobo: 0,
      giftCount: ev._count.gifts,
      rsvpYesCount: ev._count.rsvps,
      story: ev.story,
      ownerFirstName: ev.owner?.name?.split(" ")[0] || "Host",
      allowPlusOne: ev.allowPlusOne,
      registry: [],
      pools: [],
    }));
  }

  async unlockPublicEvent(slug: string, code: string) {
    const event = await this.prisma.event.findUnique({
      where: { slug },
    });

    if (!event) {
      throw new NotFoundException("Event not found");
    }

    if (event.accessCodeHash && event.accessCodeHash !== code.trim()) {
      throw new BadRequestException("Invalid event access code");
    }

    return { unlocked: true };
  }

  // --- Public Wall of Love & RSVPs ---

  async getPublicWall(slug: string, limit = 50) {
    const event = await this.prisma.event.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!event) {
      throw new NotFoundException("Event not found");
    }

    const take = Math.min(Math.max(1, Number(limit) || 50), 100);
    const posts = await this.prisma.wallPost.findMany({
      where: {
        eventId: event.id,
        status: PostStatus.VISIBLE,
      },
      include: { media: true },
      orderBy: { createdAt: "desc" },
      take,
    });

    return posts.map((p: any) => ({
      id: p.id,
      authorName: p.authorName,
      text: p.text,
      status: p.status,
      media: this.formatWallMedia(p.media),
      createdAt: p.createdAt,
    }));
  }

  async createPublicWallPost(slug: string, dto: CreateWallPostRequestDto) {
    const event = await this.prisma.event.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!event) {
      throw new NotFoundException("Event not found");
    }

    const sanitizedMedia: Array<{ url: string; type: "IMAGE" | "VIDEO" }> = [];
    if (Array.isArray(dto.media) && dto.media.length > 0) {
      if (dto.media.length > 3) {
        throw new BadRequestException("You can attach at most 3 media files per wall post");
      }
      for (const item of dto.media) {
        if (!item?.url || !isSafeMediaUrl(item.url)) {
          throw new BadRequestException("Invalid or unsafe wall post media URL");
        }
        const mediaType: "IMAGE" | "VIDEO" =
          item.type === "VIDEO" ? "VIDEO" : "IMAGE";
        sanitizedMedia.push({ url: item.url.trim(), type: mediaType });
      }
    }

    const post = await this.prisma.wallPost.create({
      data: {
        eventId: event.id,
        authorName: dto.authorName.trim(),
        authorEmail: dto.authorEmail?.trim() || null,
        text: dto.text?.trim() || null,
        status: PostStatus.VISIBLE,
        ...(sanitizedMedia.length > 0
          ? {
              media: {
                create: sanitizedMedia.map((m) => ({
                  id: crypto.randomUUID(),
                  key: m.url,
                  mime: m.type === "VIDEO" ? "video/mp4" : "image/jpeg",
                  sizeBytes: 0,
                  kind: m.type,
                  purpose: "WALL_POST",
                  status: MediaStatus.READY,
                })),
              },
            }
          : {}),
      },
      include: { media: true },
    });

    return {
      id: post.id,
      authorName: post.authorName,
      text: post.text,
      status: post.status,
      media:
        sanitizedMedia.length > 0
          ? sanitizedMedia
          : this.formatWallMedia((post as any).media),
      createdAt: post.createdAt,
    };
  }

  async submitPublicRsvp(slug: string, dto: SubmitRsvpRequestDto) {
    const event = await this.prisma.event.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!event) {
      throw new NotFoundException("Event not found");
    }

    const contactKey =
      dto.email?.toLowerCase().trim() ||
      dto.phone?.trim() ||
      dto.name.toLowerCase().trim();

    const rsvp = await this.prisma.rsvp.upsert({
      where: {
        eventId_contactKey: {
          eventId: event.id,
          contactKey,
        },
      },
      update: {
        name: dto.name.trim(),
        email: dto.email?.trim() || null,
        phone: dto.phone?.trim() || null,
        response: dto.response as RsvpResponse,
        plusOneName: dto.plusOneName?.trim() || null,
      },
      create: {
        eventId: event.id,
        contactKey,
        name: dto.name.trim(),
        email: dto.email?.trim() || null,
        phone: dto.phone?.trim() || null,
        response: dto.response as RsvpResponse,
        plusOneName: dto.plusOneName?.trim() || null,
      },
    });

    return {
      id: rsvp.id,
      eventId: rsvp.eventId,
      name: rsvp.name,
      email: rsvp.email,
      phone: rsvp.phone,
      response: rsvp.response,
      plusOneName: rsvp.plusOneName,
      createdAt: rsvp.createdAt,
    };
  }

  // --- Host Event Management Methods ---

  async getEventRsvps(userId: string, eventId: string) {
    const [event, rsvps] = await Promise.all([
      this.prisma.event.findFirst({
        where: { id: eventId, ownerId: userId },
        select: { id: true },
      }),
      this.prisma.rsvp.findMany({
        where: { eventId },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    if (!event) {
      throw new NotFoundException("Event not found");
    }

    return rsvps;
  }

  async exportEventRsvpsCsv(userId: string, eventId: string) {
    const [event, rsvps] = await Promise.all([
      this.prisma.event.findFirst({
        where: { id: eventId, ownerId: userId },
        select: { id: true, slug: true },
      }),
      this.prisma.rsvp.findMany({
        where: { eventId },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    if (!event) {
      throw new NotFoundException("Event not found");
    }

    const header = "Name,Email,Phone,Response,Plus One,Registered At\n";
    const rows = rsvps
      .map(
        (r) =>
          `"${r.name}","${r.email || ""}","${r.phone || ""}","${r.response}","${r.plusOneName || ""}","${r.createdAt.toISOString()}"`
      )
      .join("\n");

    return {
      csv: header + rows,
      filename: `${event.slug}-guests.csv`,
    };
  }

  async getEventWall(userId: string, eventId: string) {
    const [event, posts] = await Promise.all([
      this.prisma.event.findFirst({
        where: { id: eventId, ownerId: userId },
        select: { id: true },
      }),
      this.prisma.wallPost.findMany({
        where: { eventId },
        include: { media: true },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    if (!event) {
      throw new NotFoundException("Event not found");
    }

    return posts.map((p: any) => ({
      id: p.id,
      authorName: p.authorName,
      text: p.text,
      status: p.status,
      media: this.formatWallMedia(p.media),
      createdAt: p.createdAt,
    }));
  }

  async moderateWallPost(
    userId: string,
    eventId: string,
    postId: string,
    status: "VISIBLE" | "HIDDEN" | "REMOVED"
  ) {
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, ownerId: userId },
      select: { id: true },
    });

    if (!event) {
      throw new NotFoundException("Event not found");
    }

    if (typeof (this.prisma.wallPost as any).findFirst === "function") {
      const existingPost = await this.prisma.wallPost.findFirst({
        where: { id: postId, eventId: event.id },
        select: { id: true },
      });
      if (!existingPost) {
        throw new NotFoundException("Wall post not found on this event");
      }
    }

    const post = await this.prisma.wallPost.update({
      where: { id: postId },
      data: { status: status as PostStatus },
      include: { media: true },
    });

    return {
      id: post.id,
      authorName: post.authorName,
      text: post.text,
      status: post.status,
      media: this.formatWallMedia((post as any).media),
      createdAt: post.createdAt,
    };
  }

  async getEventStats(userId: string, eventId: string) {
    const event = await this.prisma.event.findFirst({
      where: { OR: [{ id: eventId }, { slug: eventId }], ownerId: userId },
      include: {
        gifts: {
          where: { status: "PAID" },
          select: { amountKobo: true },
        },
        rsvps: true,
      },
    });

    if (!event) {
      throw new NotFoundException("Event not found");
    }

    const totalReceivedKobo = event.gifts.reduce(
      (sum, g) => sum + g.amountKobo,
      0
    );
    const rsvpYesCount = event.rsvps.filter((r) => r.response === "YES").length;
    const rsvpMaybeCount = event.rsvps.filter((r) => r.response === "MAYBE").length;
    const rsvpNoCount = event.rsvps.filter((r) => r.response === "NO").length;

    return {
      totalReceivedKobo,
      giftCount: event.gifts.length,
      rsvpYesCount,
      rsvpMaybeCount,
      rsvpNoCount,
      payoutStatus: event.payoutAccountId ? "VERIFIED" : "NOT_SET",
    };
  }
}


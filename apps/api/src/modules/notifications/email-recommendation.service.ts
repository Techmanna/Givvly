import { Injectable, Logger } from "@nestjs/common";
import { Channel, EventStatus } from "@prisma/client";
import { PrismaService } from "@/infra/prisma/prisma.service";
import {
  GivvlyEmailRecommendationBlock,
  GivvlyEmailRecommendationItem,
  renderEmailRecommendationSection,
} from "@/common/templates/givvly-templates";
import { formatSubunitsToDisplay } from "../orders/utils/whatsapp-order.util";

export const MIN_EMAIL_RELEVANCE_SCORE = 0.5;

export const ELIGIBLE_RECOMMENDATION_EMAIL_TYPES = new Set<string>([
  "ORDER_CONFIRMED",
  "GIFT_RECEIPT",
  "HOST_GIFT_RECEIVED",
  "RSVP_RECEIVED",
  "EVENT_CELEBRATION_DAY",
]);

export interface RecommendationContextInput {
  userId?: string;
  type: string;
  data?: Record<string, any>;
}

export interface ProductCandidate {
  id: string;
  slug: string;
  title: string;
  priceKobo: number;
  occasions: string[];
  relationships: string[];
  isDigital: boolean;
  digitalKind: string | null;
  ratingAvg: number;
  stock: number | null;
  active: boolean;
}

@Injectable()
export class EmailRecommendationService {
  private readonly logger = new Logger(EmailRecommendationService.name);

  constructor(private readonly prisma: PrismaService) {}

  isEligibleEmailType(type: string): boolean {
    return ELIGIBLE_RECOMMENDATION_EMAIL_TYPES.has(type);
  }

  /**
   * Pure deterministic scorer (0.0 - 1.0) for a catalog product candidate
   */
  scoreProductRelevance(
    candidate: ProductCandidate,
    params: {
      targetOccasions: string[];
      targetRelationships?: string[];
      referenceAmountKobo?: number;
      sourceIsDigital?: boolean;
      excludedProductIds?: Set<string>;
    }
  ): number {
    if (!candidate.active) return 0;
    if (candidate.stock !== null && candidate.stock <= 0) return 0;
    if (params.excludedProductIds?.has(candidate.id)) return 0;

    let score = 0;

    const candOccasions = new Set(
      (candidate.occasions || []).map((o) => o.toUpperCase().trim())
    );
    const targetOccasions = (params.targetOccasions || []).map((o) =>
      o.toUpperCase().trim()
    );
    if (targetOccasions.some((occ) => candOccasions.has(occ))) {
      score += 0.45;
    }

    const candRels = new Set(
      (candidate.relationships || []).map((r) => r.toUpperCase().trim())
    );
    const targetRels = (params.targetRelationships || []).map((r) =>
      r.toUpperCase().trim()
    );
    if (targetRels.some((rel) => candRels.has(rel))) {
      score += 0.25;
    }

    if (
      typeof params.sourceIsDigital === "boolean" &&
      candidate.isDigital !== params.sourceIsDigital
    ) {
      score += 0.15;
    }

    if (params.referenceAmountKobo && params.referenceAmountKobo > 0) {
      const ratio = candidate.priceKobo / params.referenceAmountKobo;
      if (ratio >= 0.4 && ratio <= 2.2) {
        score += 0.1;
      }
    }

    if (candidate.ratingAvg >= 4.0) {
      score += 0.05;
    }

    return Math.min(1, Number(score.toFixed(2)));
  }

  private resolveAppUrl(): string {
    const raw = (
      process.env.APP_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      "https://www.givvly.store"
    )
      .trim()
      .replace(/\/$/, "");
    if (!raw || raw.includes("localhost") || raw.includes("127.0.0.1")) {
      return "https://www.givvly.store";
    }
    return raw;
  }

  private async isMarketingAllowed(userId?: string): Promise<boolean> {
    if (!userId) return true;
    if (typeof (this.prisma.notificationPref as any)?.findUnique !== "function") {
      return true;
    }
    const pref = await this.prisma.notificationPref.findUnique({
      where: {
        userId_channel_category: {
          userId,
          channel: Channel.EMAIL,
          category: "MARKETING",
        },
      },
    });
    return pref === null ? true : pref.enabled;
  }

  async getRecommendationsForEmail(
    ctx: RecommendationContextInput
  ): Promise<GivvlyEmailRecommendationBlock | null> {
    if (!this.isEligibleEmailType(ctx.type)) {
      return null;
    }

    const allowed = await this.isMarketingAllowed(ctx.userId);
    if (!allowed) {
      return null;
    }

    const appUrl = this.resolveAppUrl();
    const prefsUrl = `${appUrl}/account/notifications`;
    const data = ctx.data || {};

    try {
      if (
        ctx.type === "HOST_GIFT_RECEIVED" ||
        ctx.type === "RSVP_RECEIVED" ||
        ctx.type === "EVENT_CELEBRATION_DAY"
      ) {
        const eventId = data.eventId ? String(data.eventId) : undefined;
        if (!eventId || typeof (this.prisma.event as any)?.findUnique !== "function") {
          return null;
        }

        const event = await this.prisma.event.findUnique({
          where: { id: eventId },
          select: {
            id: true,
            slug: true,
            name: true,
            type: true,
            status: true,
            _count: {
              select: {
                pools: true,
                registry: true,
                rsvps: true,
              },
            },
          },
        });

        if (!event) return null;

        const candidates: GivvlyEmailRecommendationItem[] = [];

        if (event._count.pools === 0) {
          const highFitTypes = new Set([
            "WEDDING",
            "BIRTHDAY",
            "ANNIVERSARY",
            "GRADUATION",
          ]);
          const score = highFitTypes.has(event.type) ? 0.75 : 0.55;
          candidates.push({
            title: "Launch a Group Gift Pool",
            subtitle: `Let friends chip in together toward a shared goal for ${event.name}.`,
            ctaLabel: "Create Pool",
            ctaUrl: `${appUrl}/events/${event.id}/registry`,
            relevanceScore: score,
          });
        }

        if (event._count.registry === 0) {
          candidates.push({
            title: "Add a Curated Gift Registry",
            subtitle:
              "Help guests pick gifts you truly want with 10-minute reservation protection.",
            ctaLabel: "Add Items",
            ctaUrl: `${appUrl}/events/${event.id}/registry`,
            relevanceScore: 0.7,
          });
        }

        if (event.status === EventStatus.PUBLISHED && event._count.rsvps < 3) {
          candidates.push({
            title: "Share Your Digital Invite & RSVP Link",
            subtitle:
              "Collect guest attendance and plus-ones automatically in one place.",
            ctaLabel: "Share Invite",
            ctaUrl: `${appUrl}/events/${event.id}/invite`,
            relevanceScore: 0.6,
          });
        }

        const qualified = candidates
          .filter((c) => c.relevanceScore >= MIN_EMAIL_RELEVANCE_SCORE)
          .sort((a, b) => b.relevanceScore - a.relevanceScore)
          .slice(0, 2);

        if (qualified.length === 0) return null;

        return {
          heading: "Elevate Your Celebration",
          items: qualified,
          preferencesUrl: prefsUrl,
        };
      }

      if (typeof (this.prisma.product as any)?.findMany !== "function") {
        return null;
      }

      const targetOccasions: string[] = [];
      const targetRelationships: string[] = [];
      let referenceAmountKobo = Number(data.totalKobo || data.amountKobo || 0);
      let sourceIsDigital: boolean | undefined;
      const excludedProductIds = new Set<string>();

      if (
        ctx.type === "ORDER_CONFIRMED" &&
        data.orderNumber &&
        typeof (this.prisma.order as any)?.findUnique === "function"
      ) {
        const order = await this.prisma.order.findUnique({
          where: { number: String(data.orderNumber) },
          include: {
            items: true,
          },
        });
        if (order) {
          referenceAmountKobo = order.totalKobo;
          for (const it of order.items || []) {
            if (it.productId) excludedProductIds.add(it.productId);
          }
          if (excludedProductIds.size > 0) {
            const orderedProds = await this.prisma.product.findMany({
              where: { id: { in: Array.from(excludedProductIds) } },
              select: {
                occasions: true,
                relationships: true,
                isDigital: true,
              },
            });
            for (const p of orderedProds) {
              targetOccasions.push(...(p.occasions || []));
              targetRelationships.push(...(p.relationships || []));
              if (sourceIsDigital === undefined) {
                sourceIsDigital = p.isDigital;
              }
            }
          }
        }
      } else if (ctx.type === "GIFT_RECEIPT" && data.eventName) {
        targetOccasions.push("WEDDING", "BIRTHDAY", "ANNIVERSARY");
        sourceIsDigital = true;
      }

      if (targetOccasions.length === 0) {
        return null;
      }

      const activeProducts = await this.prisma.product.findMany({
        where: { active: true },
        take: 30,
        orderBy: { ratingAvg: "desc" },
        select: {
          id: true,
          slug: true,
          title: true,
          priceKobo: true,
          occasions: true,
          relationships: true,
          isDigital: true,
          digitalKind: true,
          ratingAvg: true,
          stock: true,
          active: true,
        },
      });

      const scored = activeProducts
        .map((prod) => ({
          prod,
          score: this.scoreProductRelevance(prod, {
            targetOccasions,
            targetRelationships,
            referenceAmountKobo,
            sourceIsDigital,
            excludedProductIds,
          }),
        }))
        .filter((entry) => entry.score >= MIN_EMAIL_RELEVANCE_SCORE)
        .sort((a, b) => b.score - a.score)
        .slice(0, 2);

      if (scored.length === 0) {
        return null;
      }

      return {
        heading: "Thoughtful Picks You Might Also Love",
        items: scored.map(({ prod, score }) => ({
          title: prod.title,
          subtitle: prod.isDigital
            ? "Instant Digital Gift"
            : "Curated Gift Delivery",
          priceFormatted: formatSubunitsToDisplay(prod.priceKobo, "NGN"),
          ctaLabel: "View Gift",
          ctaUrl: prod.isDigital
            ? `${appUrl}/digital`
            : `${appUrl}/gifts/${encodeURIComponent(prod.slug)}`,
          relevanceScore: score,
        })),
        preferencesUrl: prefsUrl,
      };
    } catch (err: any) {
      this.logger.warn(
        `Recommendation scoring skipped for ${ctx.type}: ${err?.message}`
      );
      return null;
    }
  }

  async renderRecommendationHtml(
    ctx: RecommendationContextInput
  ): Promise<string> {
    const block = await this.getRecommendationsForEmail(ctx);
    if (!block) return "";
    return renderEmailRecommendationSection(block);
  }
}

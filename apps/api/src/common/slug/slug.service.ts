import { Injectable, Optional } from "@nestjs/common";
import { PrismaService } from "../../infra/prisma/prisma.service";

export type SlugType = "title" | "random";

export interface GenerateSlugOptions {
  /**
   * Slug generation strategy.
   * - 'title' (default): converts title to slug, checks DB for collision,
   *   and only appends a random string if the slug already exists.
   * - 'random': generates a random unique string of 6-10 characters (e.g. 'dhJnskSDl').
   */
  type?: SlugType;

  /**
   * The title, headline, or name to slugify (used when type='title').
   */
  title?: string;

  /**
   * Target Prisma model to check uniqueness against:
   * 'product' | 'event' | 'collection' | 'vendor' (or any Prisma delegate with findUnique({ where: { slug } }))
   */
  model?: "product" | "event" | "collection" | "vendor" | string;

  /**
   * Optional custom uniqueness predicate. Useful within transactions (tx) or custom queries.
   * Return `true` if available/unique, `false` if already taken.
   */
  isUnique?: (slug: string) => Promise<boolean>;

  /**
   * Entity ID to exclude from collision checking (for edit/update operations).
   */
  excludeId?: string;

  /**
   * Length of the random string:
   * - For type='random': length between 6 and 10 characters (default: 8).
   * - For type='title': length of the random suffix appended upon collision (default: 5).
   */
  randomLength?: number;

  /**
   * Character set casing for random strings:
   * - 'mixed' (default for random slugs): e.g. 'dhJnskSDl' (A-Z, a-z, 0-9)
   * - 'lower' (default for title collision suffix): e.g. 'sbhsj' (a-z, 0-9)
   */
  randomCase?: "mixed" | "lower";

  /**
   * Maximum character length of the base slug from title (default: 60).
   */
  maxLength?: number;
}

@Injectable()
export class SlugService {
  constructor(@Optional() private readonly prisma?: PrismaService) {}

  /**
   * Generates a URL-friendly slug based on title or random string.
   * By default, type is set to 'title'.
   */
  async generateSlug(options: GenerateSlugOptions): Promise<string>;
  async generateSlug(
    title: string,
    model?: "product" | "event" | "collection" | "vendor" | string,
    extraOptions?: Partial<GenerateSlugOptions>
  ): Promise<string>;
  async generateSlug(
    titleOrOptions: string | GenerateSlugOptions,
    modelOrOptions?: "product" | "event" | "collection" | "vendor" | string | Partial<GenerateSlugOptions>,
    extraOptions?: Partial<GenerateSlugOptions>
  ): Promise<string> {
    const opts: GenerateSlugOptions =
      typeof titleOrOptions === "object"
        ? { ...titleOrOptions }
        : {
            title: titleOrOptions,
            ...(typeof modelOrOptions === "string"
              ? { model: modelOrOptions, ...extraOptions }
              : (modelOrOptions as Partial<GenerateSlugOptions>)),
          };

    // By default, type is 'title'
    const type: SlugType = opts.type ?? "title";

    if (type === "random") {
      // Random unique string (6-10 chars, default 8, mixed case: e.g. 'dhJnskSDl')
      const targetLength = Math.max(6, Math.min(opts.randomLength ?? 8, 10));
      const caseMode = opts.randomCase ?? "mixed";

      for (let attempt = 0; attempt < 30; attempt++) {
        const candidate = this.generateRandomString(targetLength, caseMode);
        const unique = await this.checkIsUnique(candidate, opts);
        if (unique) {
          return candidate;
        }
      }

      // Guaranteed fallback
      return this.generateRandomString(6, caseMode) + Date.now().toString(36).slice(-4);
    }

    // Type === 'title'
    const rawTitle = opts.title?.trim() || "";
    let baseSlug = this.slugify(rawTitle, opts.maxLength ?? 60);

    // If title was empty or stripped to empty, fallback to a sensible word
    if (!baseSlug) {
      baseSlug = "item";
    }

    // Step 1: Check if the base slug already exists in the database
    // e.g. "how-to-get-rich-quick"
    const isBaseUnique = await this.checkIsUnique(baseSlug, opts);
    if (isBaseUnique) {
      return baseSlug;
    }

    // Step 2: Slug already exists in the database -> append random string (e.g. "-sbhsj")
    // e.g. "how-to-get-rich-quick-sbhsj"
    const suffixLength = opts.randomLength ?? 5;
    const suffixCase = opts.randomCase ?? "lower";

    for (let attempt = 0; attempt < 25; attempt++) {
      const suffix = this.generateRandomString(suffixLength, suffixCase);
      const candidate = `${baseSlug}-${suffix}`;
      const isCandidateUnique = await this.checkIsUnique(candidate, opts);
      if (isCandidateUnique) {
        return candidate;
      }
    }

    // Final fallback in case of repeated collisions
    return `${baseSlug}-${Date.now().toString(36).slice(-6)}`;
  }

  /**
   * Transforms input text into a clean URL-friendly slug.
   * Strips enumeration prefixes (e.g. "1. How to get rich quick?" -> "how-to-get-rich-quick"),
   * normalizes accents, and replaces punctuation/spaces with hyphens.
   */
  slugify(text: string, maxLength = 60): string {
    if (!text || typeof text !== "string") {
      return "";
    }

    // 1. Strip leading list numbering if followed by separator (e.g. "1. ", "2) ", "1 - ")
    let cleaned = text.trim().replace(/^\s*\d+[\.\)\-]\s+/, "");
    if (!cleaned) {
      cleaned = text.trim();
    }

    // 2. Normalize unicode (accents/diacritics)
    cleaned = cleaned.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");

    // 3. Lowercase and replace non-alphanumeric with hyphens
    cleaned = cleaned
      .toLowerCase()
      .replace(/[^\w\s-]/g, "") // remove punctuation except whitespace and hyphens
      .replace(/[\s_-]+/g, "-") // collapse whitespace/underscores/hyphens into single hyphen
      .replace(/^-+|-+$/g, ""); // trim hyphens

    // 4. Truncate to maxLength without ending with a hyphen
    if (maxLength && cleaned.length > maxLength) {
      cleaned = cleaned.slice(0, maxLength).replace(/-+$/, "");
    }

    return cleaned;
  }

  /**
   * Generates a random string.
   * @param length Number of characters (default: 8, clamped between 4 and 32)
   * @param mode 'mixed' for A-Za-z0-9 (e.g. 'dhJnskSDl') or 'lower' for a-z0-9 (e.g. 'sbhsj')
   */
  generateRandomString(length = 8, mode: "mixed" | "lower" = "mixed"): string {
    const mixedChars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    const lowerChars = "abcdefghijklmnopqrstuvwxyz0123456789";
    const chars = mode === "mixed" ? mixedChars : lowerChars;
    const len = Math.max(4, Math.min(length, 32));

    let result = "";
    for (let i = 0; i < len; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Verifies if a given slug candidate is unique.
   */
  private async checkIsUnique(
    slug: string,
    opts: Pick<GenerateSlugOptions, "model" | "isUnique" | "excludeId">
  ): Promise<boolean> {
    if (opts.isUnique) {
      return opts.isUnique(slug);
    }

    if (!opts.model || !this.prisma) {
      return true;
    }

    const modelName = opts.model.toLowerCase();
    const delegate = (this.prisma as any)[modelName];

    if (!delegate || typeof delegate.findUnique !== "function") {
      return true;
    }

    try {
      const existing = await delegate.findUnique({
        where: { slug },
        select: { id: true },
      });

      if (!existing) {
        return true;
      }

      // If excludeId matches, the slug belongs to the same entity being edited
      if (opts.excludeId && existing.id === opts.excludeId) {
        return true;
      }

      return false;
    } catch {
      return true;
    }
  }
}

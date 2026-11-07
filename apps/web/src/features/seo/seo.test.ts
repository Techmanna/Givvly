import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";
import { metadata } from "@/app/layout";

describe("SEO & AEO Architecture", () => {
  it("generates compliant robots.txt with dedicated rules for AI answer engines", () => {
    const config = robots();
    expect(config.sitemap).toContain("/sitemap.xml");
    expect(config.rules).toBeDefined();

    const rules = Array.isArray(config.rules) ? config.rules : [config.rules];
    expect(rules.length).toBeGreaterThanOrEqual(2);

    // General crawler rules
    const generalRule = rules.find((r) => r.userAgent === "*");
    expect(generalRule).toBeDefined();

    // AI crawler rules
    const aiRule = rules.find(
      (r) =>
        Array.isArray(r.userAgent) &&
        r.userAgent.includes("GPTBot") &&
        r.userAgent.includes("PerplexityBot")
    );
    expect(aiRule).toBeDefined();
  });

  it("generates standard sitemap.xml with marketing, celebration, and gift entries", () => {
    const entries = sitemap();
    expect(Array.isArray(entries)).toBe(true);

    const urls = entries.map((e) => e.url);
    expect(urls.some((u) => u.endsWith("/"))).toBe(true);
    expect(urls.some((u) => u.endsWith("/celebrations"))).toBe(true);
    expect(urls.some((u) => u.endsWith("/gifts"))).toBe(true);
    expect(urls.some((u) => u.endsWith("/help"))).toBe(true);
    expect(urls.some((u) => u.endsWith("/privacy"))).toBe(true);
    expect(urls.some((u) => u.endsWith("/terms"))).toBe(true);
    expect(urls.some((u) => u.includes("/e/adaobi-and-chidi-2026"))).toBe(true);
  });

  it("provides comprehensive root metadata with OpenGraph, Twitter card, and full favicon suite", () => {
    expect(metadata.title).toBeDefined();
    expect(metadata.description).toContain("Givvly");

    // OpenGraph
    expect(metadata.openGraph).toBeDefined();
    expect(metadata.openGraph?.siteName).toBe("Givvly");
    expect(metadata.openGraph?.images).toBeDefined();

    // Twitter
    expect(metadata.twitter).toBeDefined();
    expect((metadata.twitter as { card?: string })?.card).toBe("summary_large_image");

    // Icons
    expect(metadata.icons).toBeDefined();
    expect(metadata.manifest).toBe("/site.webmanifest");
  });

  it("serves llms.txt and llms-full.txt for Answer Engine Optimization (AEO)", () => {
    const publicDir = path.resolve(process.cwd(), "public");
    const llmsPath = path.join(publicDir, "llms.txt");
    const llmsFullPath = path.join(publicDir, "llms-full.txt");

    expect(fs.existsSync(llmsPath)).toBe(true);
    expect(fs.existsSync(llmsFullPath)).toBe(true);

    const llmsContent = fs.readFileSync(llmsPath, "utf-8");
    expect(llmsContent).toContain("# Givvly");
    expect(llmsContent).toContain("Cash Blessings & Group Pools");
    expect(llmsContent).toContain("07:00 WAT");

    const llmsFullContent = fs.readFileSync(llmsFullPath, "utf-8");
    expect(llmsFullContent).toContain("Frequently Asked Questions");
    expect(llmsFullContent).toContain("Paystack");
  });
});

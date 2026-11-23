/**
 * Givvly e-invite card renderer
 * ------------------------------------------------------------------
 * Draws the downloadable invitation PNG (1080 x 1350 logical px, exported at
 * 2x by default for crisp WhatsApp / print use).
 *
 * - One layout engine, four distinct template designs
 *   (blush-minimal, royal-gold, lagos-botanical, modern-editorial).
 * - Measure-first layout: content is measured, scaled down only if needed,
 *   then vertically balanced above a fixed QR / RSVP card. No dead space,
 *   no overflow, whatever the guest-facing content looks like.
 * - Pure Canvas 2D, no dependencies. Works in the browser and in headless
 *   canvas environments (pass `createCanvas` for the latter).
 */
import type { InviteTemplateId } from "../types";

export type InviteCardScheduleItem = {
  title: string;
  time: string;
  venue?: string;
};

export type InviteCardData = {
  templateId: InviteTemplateId;
  eventName: string;
  /** ISO date (YYYY-MM-DD…). Used to build "Friday · 5 February 2027". */
  eventDate: string;
  /** Pre-formatted date, used only if `eventDate` cannot be parsed. */
  dateLabel: string;
  hostLine?: string;
  time?: string;
  venue?: string;
  dressCode?: string;
  schedule?: InviteCardScheduleItem[];
  /** Full public event URL (the QR code should encode the same value). */
  publicUrl: string;
  /** The rendered QR canvas/image (e.g. from qrcode.react). */
  qr?: CanvasImageSource | null;
};

export type InviteCardOptions = {
  /** Export scale. 2 => 2160 x 2700 px. Default 2. */
  scale?: number;
  /** CSS font-family stacks. Defaults fall back to Fraunces/Inter → Georgia/system. */
  fonts?: { display?: string; body?: string };
  /** Inject a canvas factory (headless/node). Defaults to document.createElement. */
  createCanvas?: (width: number, height: number) => HTMLCanvasElement;
};

export const INVITE_CARD_WIDTH = 1080;
export const INVITE_CARD_HEIGHT = 1350;

const W = INVITE_CARD_WIDTH;
const H = INVITE_CARD_HEIGHT;
const DEFAULT_DISPLAY = `"Fraunces", "Playfair Display", Georgia, "Times New Roman", serif`;
const DEFAULT_BODY = `"Inter", "Helvetica Neue", Arial, system-ui, sans-serif`;

type Ctx = CanvasRenderingContext2D;
type Fonts = { display: string; body: string };

/* ------------------------------------------------------------------ */
/* Themes                                                              */
/* ------------------------------------------------------------------ */

type Theme = {
  bg: string;
  glow: string | null;
  panel: string;
  frame: string;
  accent: string;
  ink: string;
  muted: string;
  spot: string;
  dark: boolean;
};

const THEMES: Record<InviteTemplateId, Theme> = {
  "blush-minimal": {
    bg: "#FDF8F6", glow: "#F8E6DE", panel: "#FFFFFF", frame: "#E6C2B5",
    accent: "#B4654A", ink: "#2A1C18", muted: "#6E5852", spot: "#B5495B", dark: false,
  },
  "royal-gold": {
    bg: "#191510", glow: "#2E2619", panel: "#221C13", frame: "#D4AF37",
    accent: "#E5C158", ink: "#FAF5EA", muted: "#C8BCA4", spot: "#E5C158", dark: true,
  },
  "lagos-botanical": {
    bg: "#F3F8F4", glow: "#E1EEE4", panel: "#FFFFFF", frame: "#89AE8E",
    accent: "#2D5A37", ink: "#18281C", muted: "#4F6B55", spot: "#2D5A37", dark: false,
  },
  "modern-editorial": {
    bg: "#FAFAFA", glow: null, panel: "#FFFFFF", frame: "#18181B",
    accent: "#18181B", ink: "#18181B", muted: "#52525B", spot: "#B5495B", dark: false,
  },
} as Record<InviteTemplateId, Theme>;

/* ------------------------------------------------------------------ */
/* Text + geometry helpers                                             */
/* ------------------------------------------------------------------ */

const font = (weight: number, size: number, family: string) =>
  `${weight} ${Math.round(size * 10) / 10}px ${family}`;

/** Baseline y for text of `size` centred inside a line box of height `lh` starting at `y`. */
const baseY = (y: number, size: number, lh: number) => y + (lh - size) / 2 + size * 0.8;

function trackedWidth(ctx: Ctx, text: string, spacing: number): number {
  let w = 0;
  for (const ch of text) w += ctx.measureText(ch).width + spacing;
  return Math.max(0, w - spacing);
}

function drawTracked(
  ctx: Ctx, text: string, x: number, y: number, spacing: number,
  align: "left" | "center" | "right" = "left"
) {
  const total = trackedWidth(ctx, text, spacing);
  let cx = align === "center" ? x - total / 2 : align === "right" ? x - total : x;
  const prev = ctx.textAlign;
  ctx.textAlign = "left";
  for (const ch of text) {
    ctx.fillText(ch, cx, y);
    cx += ctx.measureText(ch).width + spacing;
  }
  ctx.textAlign = prev;
}

function wrapLines(ctx: Ctx, text: string, maxW: number, spacing = 0): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const measure = (s: string) => (spacing ? trackedWidth(ctx, s, spacing) : ctx.measureText(s).width);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (measure(test) > maxW && line) {
      lines.push(line);
      line = word;
    } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

function ellipsize(ctx: Ctx, text: string, maxW: number): string {
  if (ctx.measureText(text).width <= maxW) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(`${t}…`).width > maxW) t = t.slice(0, -1);
  return `${t.trimEnd()}…`;
}

/** Largest size (between max and min) at which text fits `maxLines` lines of `maxW`. */
function fitText(
  ctx: Ctx, text: string,
  o: { family: string; weight: number; maxW: number; maxLines: number; size: number; min: number; spacing?: number }
): { size: number; lines: string[] } {
  for (let s = o.size; s >= o.min; s -= 2) {
    ctx.font = font(o.weight, s, o.family);
    const lines = wrapLines(ctx, text, o.maxW, o.spacing ?? 0);
    const widest = Math.max(...lines.map((l) => (o.spacing ? trackedWidth(ctx, l, o.spacing) : ctx.measureText(l).width)), 0);
    if (lines.length <= o.maxLines && widest <= o.maxW + 0.5) return { size: s, lines };
  }
  ctx.font = font(o.weight, o.min, o.family);
  const lines = wrapLines(ctx, text, o.maxW, o.spacing ?? 0).slice(0, o.maxLines);
  if (lines.length) lines[lines.length - 1] = ellipsize(ctx, lines[lines.length - 1]!, o.maxW);
  return { size: o.min, lines };
}

function roundRectPath(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function parseDate(iso: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? "");
  if (m) {
    const d = new Date(Date.UTC(+m[1]!, +m[2]! - 1, +m[3]!));
    return { weekday: WEEKDAYS[d.getUTCDay()]!, day: +m[3]!, month: MONTHS[+m[2]! - 1]!, year: +m[1]! };
  }
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return { weekday: WEEKDAYS[d.getDay()]!, day: d.getDate(), month: MONTHS[d.getMonth()]!, year: d.getFullYear() };
}

const EVENT_WORDS = /\b(wedding|birthday|party|anniversary|celebration|ceremony|reception|shower|housewarming|naming|engagement|graduation|baby|thanksgiving|dinner|launch)\b/i;

/** "Dee&Charris" / "Tolu and Bimpe" → ["Dee","Charris"]. Returns null for anything else. */
function splitPair(name: string): [string, string] | null {
  const m = /^\s*([^&+]+?)\s*(?:&|\+|\band\b)\s*([^&+]+?)\s*$/i.exec(name);
  if (!m) return null;
  const [a, b] = [m[1]!.trim(), m[2]!.trim()];
  const ok = (s: string) => s.split(/\s+/).length <= 2 && s.length <= 14 && !EVENT_WORDS.test(s);
  return ok(a) && ok(b) ? [a, b] : null;
}

/* ------------------------------------------------------------------ */
/* Brand mark (Givvly gift box + bow, vector)                          */
/* ------------------------------------------------------------------ */

function drawMark(ctx: Ctx, x: number, y: number, width: number, color: string) {
  const k = width / 284;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(k, k);
  ctx.translate(-118, -184);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 9;
  ctx.lineJoin = "round";
  roundRectPath(ctx, 138, 204, 244, 46, 12); ctx.stroke();
  roundRectPath(ctx, 150, 246, 220, 154, 10); ctx.stroke();
  ctx.fillRect(249, 204, 22, 196);
  ctx.fillRect(150, 305, 220, 22);
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(260, 205);
    ctx.bezierCurveTo(260 + s * 40, 171, 260 + s * 66, 183, 260 + s * 56, 213);
    ctx.bezierCurveTo(260 + s * 49, 234, 260 + s * 16, 221, 260, 205);
    ctx.closePath();
    ctx.fill();
  }
  ctx.beginPath(); ctx.arc(260, 205, 12, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

/* ------------------------------------------------------------------ */
/* Ornaments + frames per template                                     */
/* ------------------------------------------------------------------ */

function sprig(ctx: Ctx, x: number, y: number, angle: number, len: number, flip: number, color: string) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(len * 0.5, flip * len * 0.12, len, flip * len * 0.04);
  ctx.stroke();
  const n = 6;
  for (let i = 1; i <= n; i++) {
    const t = i / (n + 1);
    const px = len * t;
    const py = flip * len * (2 * (1 - t) * t * 0.12 + t * t * 0.04);
    const side = i % 2 ? 1 : -1;
    const sz = 46 * (1 - t * 0.55);
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(side * 0.8);
    ctx.globalAlpha = 0.45 + 0.4 * (i % 2);
    ctx.beginPath();
    ctx.ellipse(sz / 2, 0, sz / 2, sz * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.save();
  ctx.translate(len, flip * len * 0.04);
  ctx.globalAlpha = 0.85;
  ctx.beginPath();
  ctx.ellipse(16, 0, 16, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.restore();
}

function diamond(ctx: Ctx, x: number, y: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x, y - r); ctx.lineTo(x + r, y); ctx.lineTo(x, y + r); ctx.lineTo(x - r, y);
  ctx.closePath();
  ctx.fill();
}

function paintBackdrop(ctx: Ctx, id: InviteTemplateId, t: Theme) {
  ctx.fillStyle = t.bg;
  ctx.fillRect(0, 0, W, H);
  if (t.glow) {
    const g = ctx.createRadialGradient(W / 2, 300, 40, W / 2, 300, 880);
    g.addColorStop(0, t.glow);
    g.addColorStop(1, t.bg);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  if (id === "blush-minimal") {
    ctx.strokeStyle = t.frame; ctx.lineWidth = 2.5;
    roundRectPath(ctx, 48, 48, W - 96, H - 96, 30); ctx.stroke();
    ctx.setLineDash([1, 11]); ctx.lineCap = "round"; ctx.lineWidth = 3; ctx.strokeStyle = t.frame;
    roundRectPath(ctx, 70, 70, W - 140, H - 140, 20); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = t.accent;
    for (const [x, y] of [[48, 48], [W - 48, 48], [48, H - 48], [W - 48, H - 48]] as const) diamond(ctx, x, y, 9);
  }

  if (id === "royal-gold") {
    ctx.strokeStyle = t.frame; ctx.lineWidth = 4;
    ctx.strokeRect(40, 40, W - 80, H - 80);
    ctx.lineWidth = 1.5; ctx.globalAlpha = 0.7;
    ctx.strokeRect(58, 58, W - 116, H - 116);
    ctx.globalAlpha = 1;
    ctx.lineWidth = 2;
    const corners: Array<[number, number, number, number]> = [
      [58, 58, 0, Math.PI / 2], [W - 58, 58, Math.PI / 2, Math.PI],
      [58, H - 58, -Math.PI / 2, 0], [W - 58, H - 58, Math.PI, Math.PI * 1.5],
    ];
    for (const [cx, cy, a0, a1] of corners) {
      for (const r of [20, 34, 48]) { ctx.beginPath(); ctx.arc(cx, cy, r, a0, a1); ctx.stroke(); }
    }
    // art-deco fan
    ctx.lineWidth = 2.5; ctx.lineCap = "round";
    const cx = W / 2, cy = 158;
    for (let i = 0; i <= 14; i++) {
      const a = Math.PI + (i * Math.PI) / 14;
      const r1 = i % 2 ? 40 : 54;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * 16, cy + Math.sin(a) * 16);
      ctx.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
      ctx.stroke();
    }
    ctx.lineWidth = 1.5;
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(cx + s * 78, cy); ctx.lineTo(cx + s * 170, cy); ctx.stroke(); }
    ctx.fillStyle = t.frame; diamond(ctx, cx, cy + 12, 6);
  }

  if (id === "lagos-botanical") {
    ctx.strokeStyle = t.frame; ctx.lineWidth = 3;
    roundRectPath(ctx, 50, 50, W - 100, H - 100, 44); ctx.stroke();
    ctx.lineWidth = 1.2; ctx.globalAlpha = 0.7;
    roundRectPath(ctx, 66, 66, W - 132, H - 132, 32); ctx.stroke();
    ctx.globalAlpha = 1;
    sprig(ctx, 74, 74, Math.PI / 4, 178, 1, t.accent);
    sprig(ctx, W - 74, 74, (3 * Math.PI) / 4, 178, -1, t.accent);
    sprig(ctx, 74, H - 74, -Math.PI / 4, 58, -1, t.accent);
    sprig(ctx, W - 74, H - 74, (-3 * Math.PI) / 4, 58, 1, t.accent);
  }

  if (id === "modern-editorial") {
    ctx.fillStyle = t.ink;
    ctx.fillRect(120, 96, W - 240, 10);
  }
}

function divider(ctx: Ctx, id: InviteTemplateId, t: Theme, cx: number, y: number) {
  ctx.save();
  ctx.strokeStyle = t.accent; ctx.fillStyle = t.accent; ctx.lineWidth = 2; ctx.lineCap = "round";
  if (id === "lagos-botanical") {
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(cx + s * 30, y); ctx.lineTo(cx + s * 150, y); ctx.stroke(); }
    for (const s of [-1, 1]) {
      ctx.beginPath(); ctx.ellipse(cx + s * 14, y, 14, 6, s * -0.45, 0, Math.PI * 2); ctx.fill();
    }
  } else if (id === "royal-gold") {
    const g = ctx.createLinearGradient(cx - 170, 0, cx + 170, 0);
    g.addColorStop(0, "rgba(229,193,88,0)"); g.addColorStop(0.5, t.accent); g.addColorStop(1, "rgba(229,193,88,0)");
    ctx.strokeStyle = g; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx - 170, y); ctx.lineTo(cx + 170, y); ctx.stroke();
    diamond(ctx, cx, y, 8);
    ctx.beginPath(); ctx.arc(cx - 26, y, 2.5, 0, Math.PI * 2); ctx.arc(cx + 26, y, 2.5, 0, Math.PI * 2); ctx.fill();
  } else {
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(cx + s * 26, y); ctx.lineTo(cx + s * 140, y); ctx.stroke(); }
    diamond(ctx, cx, y, 7);
  }
  ctx.restore();
}

/* ------------------------------------------------------------------ */
/* Layout blocks                                                       */
/* ------------------------------------------------------------------ */

type Block = { h: number; gap: number; draw: (y: number) => void };

type Common = {
  ctx: Ctx; data: InviteCardData; t: Theme; fonts: Fonts; id: InviteTemplateId;
  hostText: string; date: ReturnType<typeof parseDate>;
  schedule: InviteCardScheduleItem[];
};

function centeredBlocks(c: Common, k: number): Block[] {
  const { ctx, data, t, fonts, id } = c;
  const blocks: Block[] = [];
  const CX = W / 2;
  const maxW = 760;

  /* host line */
  {
    const sp = 5 * k, size = 21 * k;
    const { lines } = fitText(ctx, c.hostText, { family: fonts.body, weight: 600, maxW, maxLines: 2, size, min: size, spacing: sp });
    const lh = size * 1.6;
    blocks.push({
      h: lines.length * lh, gap: 26 * k,
      draw: (y) => {
        ctx.fillStyle = t.muted; ctx.font = font(600, size, fonts.body);
        lines.forEach((l, i) => drawTracked(ctx, l, CX, baseY(y + i * lh, size, lh), sp, "center"));
      },
    });
  }

  /* title */
  {
    const base = 108 * k;
    const pair = splitPair(data.eventName);
    let h = 0; let draw: (y: number) => void;
    const inlineFit = (() => {
      if (!pair) return null;
      for (let s = base; s >= 66 * k; s -= 2) {
        ctx.font = font(700, s, fonts.display);
        const w1 = ctx.measureText(pair[0]).width, w2 = ctx.measureText(pair[1]).width;
        ctx.font = font(500, s * 0.66, fonts.display);
        const wa = ctx.measureText("&").width, gap = s * 0.3;
        if (w1 + w2 + wa + gap * 2 <= maxW + 60) return { s, w1, w2, wa, gap };
      }
      return null;
    })();
    if (pair && inlineFit) {
      const { s, w1, w2, wa, gap } = inlineFit;
      const lh = s * 1.18; h = lh;
      draw = (y) => {
        const total = w1 + w2 + wa + gap * 2;
        let x = CX - total / 2;
        ctx.textAlign = "left"; ctx.fillStyle = t.ink; ctx.font = font(700, s, fonts.display);
        ctx.fillText(pair[0], x, baseY(y, s, lh)); x += w1 + gap;
        ctx.fillStyle = t.accent; ctx.font = font(500, s * 0.66, fonts.display);
        ctx.fillText("&", x, baseY(y, s, lh) - s * 0.04); x += wa + gap;
        ctx.fillStyle = t.ink; ctx.font = font(700, s, fonts.display);
        ctx.fillText(pair[1], x, baseY(y, s, lh));
      };
    } else if (pair) {
      const f1 = fitText(ctx, pair[0], { family: fonts.display, weight: 700, maxW, maxLines: 1, size: base * 0.92, min: 56 * k });
      const f2 = fitText(ctx, pair[1], { family: fonts.display, weight: 700, maxW, maxLines: 1, size: base * 0.92, min: 56 * k });
      const ampS = 50 * k, l1 = f1.size * 1.15, l2 = f2.size * 1.15, la = ampS * 1.2;
      h = l1 + la + l2;
      draw = (y) => {
        ctx.textAlign = "center";
        ctx.fillStyle = t.ink; ctx.font = font(700, f1.size, fonts.display); ctx.fillText(f1.lines[0]!, CX, baseY(y, f1.size, l1));
        ctx.fillStyle = t.accent; ctx.font = font(500, ampS, fonts.display); ctx.fillText("&", CX, baseY(y + l1, ampS, la));
        ctx.fillStyle = t.ink; ctx.font = font(700, f2.size, fonts.display); ctx.fillText(f2.lines[0]!, CX, baseY(y + l1 + la, f2.size, l2));
      };
    } else {
      const f = fitText(ctx, data.eventName, { family: fonts.display, weight: 700, maxW: 800, maxLines: 3, size: base * 0.86, min: 40 * k });
      const lh = f.size * 1.14; h = f.lines.length * lh;
      draw = (y) => {
        ctx.textAlign = "center"; ctx.fillStyle = t.ink; ctx.font = font(700, f.size, fonts.display);
        f.lines.forEach((l, i) => ctx.fillText(l, CX, baseY(y + i * lh, f.size, lh)));
      };
    }
    blocks.push({ h, gap: 30 * k, draw });
  }

  /* divider */
  blocks.push({ h: 18 * k, gap: 30 * k, draw: (y) => divider(ctx, id, t, CX, y + 9 * k) });

  /* date + time */
  {
    const d = c.date;
    const wd = d ? d.weekday.toUpperCase() : "";
    const dateText = d ? `${d.day} ${d.month} ${d.year}` : data.dateLabel;
    const wdSize = 22 * k, wdLh = wd ? wdSize * 1.9 : 0;
    const ds = fitText(ctx, dateText, { family: fonts.display, weight: 600, maxW: 840, maxLines: 1, size: 58 * k, min: 30 });
    const dLh = ds.size * 1.2;
    const time = data.time?.trim();
    const tSize = 30 * k, tLh = time ? tSize * 1.6 : 0;
    blocks.push({
      h: wdLh + dLh + tLh, gap: 38 * k,
      draw: (y) => {
        ctx.textAlign = "center";
        if (wd) { ctx.fillStyle = t.accent; ctx.font = font(700, wdSize, fonts.body); drawTracked(ctx, wd, CX, baseY(y, wdSize, wdLh), 6 * k, "center"); }
        ctx.fillStyle = t.ink; ctx.font = font(600, ds.size, fonts.display);
        ctx.fillText(ds.lines[0]!, CX, baseY(y + wdLh, ds.size, dLh));
        if (time) { ctx.fillStyle = t.muted; ctx.font = font(500, tSize, fonts.body); ctx.fillText(time, CX, baseY(y + wdLh + dLh, tSize, tLh)); }
      },
    });
  }

  /* venue */
  if (data.venue?.trim()) {
    const lblSize = 17 * k, lblLh = lblSize * 2;
    const f = fitText(ctx, data.venue.trim(), { family: fonts.body, weight: 500, maxW: 740, maxLines: 3, size: 31 * k, min: 22 });
    const lh = f.size * 1.4;
    blocks.push({
      h: lblLh + f.lines.length * lh, gap: 36 * k,
      draw: (y) => {
        ctx.textAlign = "center"; ctx.fillStyle = t.accent; ctx.font = font(700, lblSize, fonts.body);
        drawTracked(ctx, "VENUE", CX, baseY(y, lblSize, lblLh), 6 * k, "center");
        ctx.fillStyle = t.ink; ctx.font = font(500, f.size, fonts.body);
        f.lines.forEach((l, i) => ctx.fillText(l, CX, baseY(y + lblLh + i * lh, f.size, lh)));
      },
    });
  }

  /* dress code pill */
  if (data.dressCode?.trim()) {
    const size = 24 * k, ph = 58 * k;
    const lbl = "DRESS CODE", val = data.dressCode.trim();
    ctx.font = font(700, 17 * k, fonts.body);
    const lw = trackedWidth(ctx, lbl, 4 * k);
    const vf = fitText(ctx, val, { family: fonts.body, weight: 600, maxW: 560, maxLines: 1, size, min: 18 });
    ctx.font = font(600, vf.size, fonts.body);
    const vw = ctx.measureText(vf.lines[0]!).width;
    const pw = lw + vw + 64 + 22;
    blocks.push({
      h: ph, gap: 34 * k,
      draw: (y) => {
        const x = CX - pw / 2;
        roundRectPath(ctx, x, y, pw, ph, ph / 2);
        ctx.fillStyle = t.dark ? "rgba(229,193,88,0.08)" : "rgba(255,255,255,0.7)"; ctx.fill();
        ctx.strokeStyle = t.accent; ctx.lineWidth = 2; ctx.stroke();
        ctx.textAlign = "left";
        ctx.fillStyle = t.muted; ctx.font = font(700, 17 * k, fonts.body);
        drawTracked(ctx, lbl, x + 32, baseY(y, 17 * k, ph), 4 * k);
        ctx.fillStyle = t.accent; ctx.font = font(600, vf.size, fonts.body);
        ctx.fillText(vf.lines[0]!, x + 32 + lw + 22, baseY(y, vf.size, ph));
      },
    });
  }

  /* schedule */
  if (c.schedule.length) {
    const lblSize = 17 * k, lblLh = lblSize * 2.2;
    const rows = c.schedule.map((it) => {
      let size = 27 * k;
      const time = it.time.trim(), title = it.title.trim();
      let total = 0;
      for (; size >= 18; size -= 1) {
        ctx.font = font(700, size, fonts.body); const tw = ctx.measureText(time).width;
        ctx.font = font(500, size, fonts.body); const ttw = ctx.measureText(title).width;
        total = tw + 44 + ttw; if (total <= 800) break;
      }
      ctx.font = font(700, size, fonts.body); const tw = ctx.measureText(time).width;
      const venue = it.venue?.trim();
      const lh = size * 1.6 + (venue ? size * 1.0 : 0);
      return { time, title, size, tw, total, venue, lh };
    });
    blocks.push({
      h: lblLh + rows.reduce((a, r) => a + r.lh, 0), gap: 0,
      draw: (y) => {
        ctx.textAlign = "center"; ctx.fillStyle = t.muted; ctx.font = font(700, lblSize, fonts.body);
        drawTracked(ctx, "ORDER OF THE DAY", CX, baseY(y, lblSize, lblLh), 6 * k, "center");
        let cy = y + lblLh;
        for (const r of rows) {
          const x0 = CX - r.total / 2;
          ctx.textAlign = "left";
          ctx.fillStyle = t.accent; ctx.font = font(700, r.size, fonts.body); ctx.fillText(r.time, x0, baseY(cy, r.size, r.size * 1.55));
          ctx.fillStyle = t.accent; ctx.globalAlpha = 0.5; diamond(ctx, x0 + r.tw + 22, cy + r.size * 0.78, 4); ctx.globalAlpha = 1;
          ctx.fillStyle = t.ink; ctx.font = font(500, r.size, fonts.body); ctx.fillText(r.title, x0 + r.tw + 44, baseY(cy, r.size, r.size * 1.55));
          if (r.venue) {
            ctx.textAlign = "center"; ctx.fillStyle = t.muted; ctx.font = font(400, r.size * 0.76, fonts.body);
            ctx.fillText(ellipsize(ctx, r.venue, 760), CX, baseY(cy + r.size * 1.4, r.size * 0.76, r.size * 0.9));
          }
          cy += r.lh;
        }
      },
    });
  }
  return blocks;
}

function editorialBlocks(c: Common, k: number): Block[] {
  const { ctx, data, t, fonts } = c;
  const L = 120, Wd = W - 240;
  const blocks: Block[] = [];

  /* host */
  {
    const size = 21 * k, sp = 5 * k, lh = size * 1.7;
    const { lines } = fitText(ctx, c.hostText, { family: fonts.body, weight: 600, maxW: Wd, maxLines: 2, size, min: size, spacing: sp });
    blocks.push({
      h: lines.length * lh, gap: 26 * k,
      draw: (y) => { ctx.textAlign = "left"; ctx.fillStyle = t.muted; ctx.font = font(600, size, fonts.body); lines.forEach((l, i) => drawTracked(ctx, l, L, baseY(y + i * lh, size, lh), sp)); },
    });
  }

  /* title */
  {
    const pair = splitPair(data.eventName);
    const base = 136 * k;
    const text = pair ? `${pair[0]}\n& ${pair[1]}` : data.eventName;
    const parts = text.split("\n");
    let size = base;
    let lines: string[] = [];
    for (; size >= 52 * k; size -= 2) {
      ctx.font = font(700, size, fonts.display);
      lines = parts.flatMap((p) => wrapLines(ctx, p, Wd));
      const widest = Math.max(...lines.map((l) => ctx.measureText(l).width));
      if (lines.length <= (pair ? 2 : 3) && widest <= Wd) break;
    }
    const lh = size * 1.02;
    blocks.push({
      h: lines.length * lh, gap: 58 * k,
      draw: (y) => {
        ctx.textAlign = "left"; ctx.font = font(700, size, fonts.display);
        lines.forEach((l, i) => {
          const by = baseY(y + i * lh, size, lh);
          if (pair && l.startsWith("& ")) {
            ctx.fillStyle = t.spot; ctx.fillText("&", L, by);
            const aw = ctx.measureText("& ").width; ctx.fillStyle = t.ink; ctx.fillText(l.slice(2), L + aw, by);
          } else { ctx.fillStyle = t.ink; ctx.fillText(l, L, by); }
        });
      },
    });
  }

  /* date row */
  {
    const d = c.date;
    const numS = 176 * k, lh = numS * 0.86;
    const num = d ? String(d.day).padStart(2, "0") : "";
    ctx.font = font(700, numS, fonts.display);
    const nw = ctx.measureText(num).width;
    const s1 = 34 * k, s2 = 26 * k, s3 = 22 * k;
    blocks.push({
      h: d ? lh : 60 * k, gap: 30 * k,
      draw: (y) => {
        ctx.textAlign = "left";
        if (!d) { ctx.fillStyle = t.ink; ctx.font = font(700, 40 * k, fonts.display); ctx.fillText(data.dateLabel, L, baseY(y, 40 * k, 60 * k)); return; }
        ctx.fillStyle = t.ink; ctx.font = font(700, numS, fonts.display); ctx.fillText(num, L, y + numS * 0.72);
        const x = L + nw + 34, top = y + lh * 0.12;
        ctx.fillStyle = t.ink; ctx.font = font(700, s1, fonts.body); drawTracked(ctx, d.month.toUpperCase(), x, top + s1 * 0.9, 6 * k);
        ctx.font = font(500, s2, fonts.body); ctx.fillText(String(d.year), x, top + s1 * 0.9 + s2 * 1.7);
        ctx.fillStyle = t.spot; ctx.font = font(700, s3, fonts.body); drawTracked(ctx, d.weekday.toUpperCase(), x, top + s1 * 0.9 + s2 * 1.7 + s3 * 2, 5 * k);
      },
    });
  }

  /* info grid */
  {
    const time = data.time?.trim(), dress = data.dressCode?.trim(), venue = data.venue?.trim();
    const lblS = 16 * k;
    const cell = (label: string, value: string, maxW: number, lines: number) => {
      const f = fitText(ctx, value, { family: fonts.body, weight: 600, maxW, maxLines: lines, size: 29 * k, min: 20 });
      const lh = f.size * 1.4;
      return { label, f, lh, h: lblS * 2.1 + f.lines.length * lh };
    };
    const cells: Array<ReturnType<typeof cell> | null> = [
      time ? cell("TIME", time, 380, 1) : null,
      dress ? cell("DRESS CODE", dress, 380, 2) : null,
    ];
    const row1 = cells.filter(Boolean) as Array<ReturnType<typeof cell>>;
    const v = venue ? cell("VENUE", venue, Wd, 3) : null;
    const rowH = (cs: Array<{ h: number }>) => (cs.length ? Math.max(...cs.map((x) => x.h)) + 28 * k : 0);
    const h = rowH(row1) + (v ? rowH([v]) : 0);
    const drawCell = (cl: ReturnType<typeof cell>, x: number, y: number) => {
      ctx.textAlign = "left"; ctx.fillStyle = t.muted; ctx.font = font(700, lblS, fonts.body);
      drawTracked(ctx, cl.label, x, baseY(y, lblS, lblS * 2.1), 5 * k);
      ctx.fillStyle = t.ink; ctx.font = font(600, cl.f.size, fonts.body);
      cl.f.lines.forEach((l, i) => ctx.fillText(l, x, baseY(y + lblS * 2.1 + i * cl.lh, cl.f.size, cl.lh)));
    };
    if (h > 0) blocks.push({
      h, gap: 30 * k,
      draw: (y) => {
        let cy = y;
        if (row1.length) {
          ctx.fillStyle = t.ink; ctx.fillRect(L, cy, Wd, 3);
          const first = cells[0] ? row1[0]! : null;
          row1.forEach((cl, i) => drawCell(cl, L + (cells[0] && cells[1] ? i * (Wd / 2) : 0), cy + 22 * k));
          void first;
          cy += rowH(row1);
        }
        if (v) { ctx.fillStyle = t.ink; ctx.fillRect(L, cy, Wd, 3); drawCell(v, L, cy + 22 * k); }
      },
    });
  }

  /* schedule */
  if (c.schedule.length) {
    const lblS = 16 * k, lblLh = lblS * 2.4;
    const rows = c.schedule.map((it) => {
      const size = 25 * k; ctx.font = font(500, size, fonts.body);
      const title = ellipsize(ctx, it.title.trim(), Wd - 230);
      const venue = it.venue?.trim();
      return { time: it.time.trim(), title, venue, size, lh: size * 1.6 + 22 * k + (venue ? size * 0.85 : 0) };
    });
    blocks.push({
      h: lblLh + rows.reduce((a, r) => a + r.lh, 0), gap: 0,
      draw: (y) => {
        ctx.textAlign = "left"; ctx.fillStyle = t.muted; ctx.font = font(700, lblS, fonts.body);
        drawTracked(ctx, "ORDER OF THE DAY", L, baseY(y, lblS, lblLh), 5 * k);
        let cy = y + lblLh;
        for (const r of rows) {
          ctx.fillStyle = t.ink; ctx.fillRect(L, cy, Wd, 1.5);
          const by = baseY(cy + 11 * k, r.size, r.size * 1.6);
          ctx.font = font(700, r.size, fonts.body); ctx.fillText(r.time, L, by);
          ctx.font = font(500, r.size, fonts.body); ctx.fillText(r.title, L + 230, by);
          if (r.venue) { ctx.fillStyle = t.muted; ctx.font = font(400, r.size * 0.78, fonts.body); ctx.fillText(ellipsize(ctx, r.venue, Wd - 230), L + 230, by + r.size * 0.95); }
          cy += r.lh;
        }
        ctx.fillStyle = t.ink; ctx.fillRect(L, cy, Wd, 1.5);
      },
    });
  }
  return blocks;
}

/* ------------------------------------------------------------------ */
/* QR / RSVP card + footer (shared)                                    */
/* ------------------------------------------------------------------ */

const CARD_Y = 976;
const CARD_H = 236;

function drawRsvpCard(ctx: Ctx, data: InviteCardData, t: Theme, fonts: Fonts, id: InviteTemplateId) {
  const editorial = id === "modern-editorial";
  const x = 120, w = W - 240, y = CARD_Y, h = CARD_H;

  if (editorial) {
    ctx.fillStyle = t.ink; ctx.fillRect(x, y, w, 4);
  } else {
    roundRectPath(ctx, x, y, w, h, 28);
    ctx.fillStyle = t.panel; ctx.fill();
    ctx.strokeStyle = t.frame; ctx.lineWidth = t.dark ? 2.5 : 2; ctx.stroke();
  }

  const tile = 196, tx = x + (editorial ? 0 : 28), ty = y + (editorial ? 30 : (h - tile) / 2);
  roundRectPath(ctx, tx, ty, tile, tile, editorial ? 4 : 16);
  ctx.fillStyle = "#FFFFFF"; ctx.fill();
  if (editorial) { ctx.strokeStyle = t.ink; ctx.lineWidth = 2; ctx.stroke(); }
  if (data.qr) ctx.drawImage(data.qr, tx + 6, ty + 6, tile - 12, tile - 12);

  const px = tx + tile + 38, pw = x + w - (editorial ? 0 : 30) - px;
  const url = data.publicUrl.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const lblS = 17, tS = 38, sS = 24;
  const sub = "Get directions & send gifts";
  const uf = fitText(ctx, url, { family: fonts.body, weight: 600, maxW: pw - 40, maxLines: 1, size: 22, min: 14 });
  const stack = lblS * 1.9 + tS * 1.25 + sS * 1.5 + 18 + 52;
  let cy = ty + (tile - stack) / 2 + (editorial ? 0 : 0);

  ctx.textAlign = "left"; ctx.fillStyle = t.accent; ctx.font = font(700, lblS, fonts.body);
  drawTracked(ctx, "RSVP & GIFTS", px, baseY(cy, lblS, lblS * 1.9), 5);
  cy += lblS * 1.9;
  ctx.fillStyle = t.ink; ctx.font = font(700, tS, fonts.display);
  ctx.fillText("Scan to RSVP", px, baseY(cy, tS, tS * 1.25)); cy += tS * 1.25;
  ctx.fillStyle = t.muted; ctx.font = font(400, sS, fonts.body);
  ctx.fillText(sub, px, baseY(cy, sS, sS * 1.5)); cy += sS * 1.5 + 18;

  roundRectPath(ctx, px, cy, pw, 52, editorial ? 4 : 26);
  ctx.fillStyle = t.dark ? "rgba(229,193,88,0.12)" : editorial ? "#F0F0F1" : "rgba(0,0,0,0.045)"; ctx.fill();
  ctx.fillStyle = t.accent; ctx.font = font(600, uf.size, fonts.body); ctx.textAlign = "center";
  ctx.fillText(uf.lines[0]!, px + pw / 2, baseY(cy, uf.size, 52));
  ctx.textAlign = "left";
}

function drawFooter(ctx: Ctx, t: Theme, fonts: Fonts) {
  const label = "DESIGNED WITH GIVVLY";
  ctx.font = font(600, 16, fonts.body);
  const lw = trackedWidth(ctx, label, 4);
  const mark = 30, gap = 16, total = mark + gap + lw;
  const x0 = W / 2 - total / 2, cy = 1252;
  drawMark(ctx, x0, cy - mark * 0.83 / 2, mark, t.accent);
  ctx.fillStyle = t.muted; ctx.textAlign = "left";
  drawTracked(ctx, label, x0 + mark + gap, cy + 5, 4);
}

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

async function ensureFonts(fonts: Fonts) {
  if (typeof document === "undefined" || !("fonts" in document)) return;
  const probes: Array<[number, string]> = [[700, fonts.display], [500, fonts.display], [600, fonts.display], [400, fonts.body], [500, fonts.body], [600, fonts.body], [700, fonts.body]];
  await Promise.all(probes.map(([w, f]) => document.fonts.load(`${w} 32px ${f}`, "Aa&0123").catch(() => undefined)));
}

export async function renderInviteCard(data: InviteCardData, options: InviteCardOptions = {}): Promise<HTMLCanvasElement> {
  const scale = options.scale ?? 2;
  const fonts: Fonts = { display: options.fonts?.display || DEFAULT_DISPLAY, body: options.fonts?.body || DEFAULT_BODY };
  await ensureFonts(fonts);

  const canvas = options.createCanvas
    ? options.createCanvas(W * scale, H * scale)
    : Object.assign(document.createElement("canvas"), { width: W * scale, height: H * scale });
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context is unavailable");
  ctx.scale(scale, scale);
  ctx.textBaseline = "alphabetic";

  const id: InviteTemplateId = (data.templateId in THEMES ? data.templateId : "blush-minimal") as InviteTemplateId;
  const t = THEMES[id];

  paintBackdrop(ctx, id, t);

  const common: Common = {
    ctx, data, t, fonts, id,
    hostText: (data.hostLine?.trim() || "You are cordially invited").toUpperCase(),
    date: parseDate(data.eventDate),
    schedule: (data.schedule ?? []).filter((s) => s?.title?.trim() && s?.time?.trim()).slice(0, 6),
  };

  const editorial = id === "modern-editorial";
  const top = id === "royal-gold" ? 232 : editorial ? 150 : 142;
  const bottom = CARD_Y - 34;
  const avail = bottom - top;

  // pick the largest scale factor at which everything fits
  let blocks: Block[] = [];
  let used = 0;
  for (let k = 1; k >= 0.5; k -= 0.04) {
    blocks = editorial ? editorialBlocks(common, k) : centeredBlocks(common, k);
    used = blocks.reduce((a, b, i) => a + b.h + (i < blocks.length - 1 ? b.gap : 0), 0);
    if (used <= avail) break;
  }
  let y = top + Math.max(0, (avail - used) * (used < avail * 0.7 ? 0.5 : 0.42));
  blocks.forEach((b) => { b.draw(y); y += b.h + b.gap; });

  drawRsvpCard(ctx, data, t, fonts, id);
  drawFooter(ctx, t, fonts);
  return canvas;
}
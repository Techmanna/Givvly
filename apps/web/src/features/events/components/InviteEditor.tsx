"use client";

import { useEffect, useRef, useState } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { QRCodeCanvas } from "qrcode.react";
import {
  Calendar,
  Clock,
  Copy,
  Download,
  ExternalLink,
  MapPin,
  MessageCircle,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/format";
import { useEventDetail, useUpdateEventInviteMutation } from "../hooks/useEvents";
import { INVITE_TEMPLATE_IDS, inviteEditorSchema } from "../schemas";
import type { EventDetail, InviteEditorInput, InviteTemplateId } from "../types";
import {
  INVITE_TEMPLATE_OPTIONS,
  InviteTemplatePicker,
} from "./InviteTemplatePicker";

export type InviteEditorProps = {
  initialEvent: EventDetail;
};

const TEMPLATE_CANVAS_PALETTE: Record<
  InviteTemplateId,
  { bg: string; border: string; accent: string; text: string; muted: string }
> = {
  "blush-minimal": {
    bg: "#FDF8F6",
    border: "#E6C2B5",
    accent: "#B4654A",
    text: "#2A1C18",
    muted: "#6E5852",
  },
  "royal-gold": {
    bg: "#191510",
    border: "#D4AF37",
    accent: "#E5C158",
    text: "#FAF5EA",
    muted: "#C8BCA4",
  },
  "lagos-botanical": {
    bg: "#F3F8F4",
    border: "#89AE8E",
    accent: "#2D5A37",
    text: "#18281C",
    muted: "#4F6B55",
  },
  "modern-editorial": {
    bg: "#FAFAFA",
    border: "#18181B",
    accent: "#18181B",
    text: "#18181B",
    muted: "#52525B",
  },
};

function drawWrappedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
): number {
  const words = text.split(/\s+/).filter(Boolean);
  let line = "";
  let currentY = y;

  for (const word of words) {
    const testLine = line ? `${line} ${word}` : word;
    if (ctx.measureText(testLine).width > maxWidth && line) {
      ctx.fillText(line, x, currentY);
      line = word;
      currentY += lineHeight;
    } else {
      line = testLine;
    }
  }
  if (line) {
    ctx.fillText(line, x, currentY);
    currentY += lineHeight;
  }
  return currentY;
}

export function InviteEditor({ initialEvent }: InviteEditorProps) {
  const { data: event = initialEvent } = useEventDetail(
    initialEvent.id,
    initialEvent
  );
  const updateInviteMutation = useUpdateEventInviteMutation(event.id);
  const qrContainerRef = useRef<HTMLDivElement | null>(null);
  const [origin, setOrigin] = useState("https://givvly.store");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const publicEventUrl = `${origin}/e/${event.slug}`;

  const rawTemplateId = event.template?.templateId;
  const initialTemplateId: InviteTemplateId =
    rawTemplateId &&
    (INVITE_TEMPLATE_IDS as readonly string[]).includes(rawTemplateId)
      ? (rawTemplateId as InviteTemplateId)
      : "blush-minimal";

  const form = useForm<InviteEditorInput>({
    resolver: zodResolver(inviteEditorSchema),
    mode: "onBlur",
    defaultValues: {
      templateId: initialTemplateId,
      venue: event.template?.fields?.venue ?? "",
      mapUrl: event.template?.fields?.mapUrl ?? "",
      time: event.template?.fields?.time ?? "",
      dressCode: event.template?.fields?.dressCode ?? "",
      hostLine: event.template?.fields?.hostLine ?? "",
      scheduleItems: event.template?.scheduleItems ?? [],
    },
  });

  const {
    fields: scheduleFields,
    append: appendScheduleItem,
    remove: removeScheduleItem,
  } = useFieldArray({
    control: form.control,
    name: "scheduleItems",
  });

  const watchedTemplateId = useWatch({
    control: form.control,
    name: "templateId",
  });
  const watchedVenue = useWatch({ control: form.control, name: "venue" });
  const watchedMapUrl = useWatch({ control: form.control, name: "mapUrl" });
  const watchedTime = useWatch({ control: form.control, name: "time" });
  const watchedDressCode = useWatch({
    control: form.control,
    name: "dressCode",
  });
  const watchedHostLine = useWatch({
    control: form.control,
    name: "hostLine",
  });
  const watchedScheduleItems =
    useWatch({
      control: form.control,
      name: "scheduleItems",
    }) ?? [];

  const activeTemplateOption =
    INVITE_TEMPLATE_OPTIONS.find((t) => t.id === watchedTemplateId) ??
    INVITE_TEMPLATE_OPTIONS[0]!;

  const resolvedMapHref =
    watchedMapUrl?.trim() ||
    (watchedVenue?.trim()
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(watchedVenue.trim())}`
      : "");

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const cleanedSchedule = (values.scheduleItems ?? [])
        .map((item) => ({
          title: item.title.trim(),
          time: item.time.trim(),
          ...(item.venue?.trim() ? { venue: item.venue.trim() } : {}),
          ...(item.mapUrl?.trim() ? { mapUrl: item.mapUrl.trim() } : {}),
        }))
        .filter((item) => item.title && item.time);

      await updateInviteMutation.mutateAsync({
        templateId: values.templateId,
        fields: {
          venue: values.venue?.trim() ?? "",
          mapUrl: values.mapUrl?.trim() ?? "",
          time: values.time?.trim() ?? "",
          dressCode: values.dressCode?.trim() ?? "",
          hostLine: values.hostLine?.trim() ?? "",
        },
        scheduleItems: cleanedSchedule,
      });
      toast.success("Invitation card saved and published to your event page.");
    } catch {
      toast.error("Could not save invitation design. Please try again.");
    }
  });

  const handleCopyInviteLink = async () => {
    try {
      await navigator.clipboard.writeText(publicEventUrl);
      toast.success("Invite link copied to clipboard.");
    } catch {
      toast.error("Could not copy link. Please copy it manually.");
    }
  };

  const handleShareWhatsApp = () => {
    const details: string[] = [
      `*${event.name}*`,
      `Date: ${formatDate(event.date)}`,
    ];
    if (watchedTime?.trim()) details.push(`Time: ${watchedTime.trim()}`);
    if (watchedVenue?.trim()) details.push(`Venue: ${watchedVenue.trim()}`);
    if (watchedDressCode?.trim()) {
      details.push(`Dress code: ${watchedDressCode.trim()}`);
    }
    details.push("", `RSVP, view directions & send gifts: ${publicEventUrl}`);
    const shareUrl = `https://wa.me/?text=${encodeURIComponent(details.join("\n"))}`;
    window.open(shareUrl, "_blank", "noopener,noreferrer");
  };

  const handleDownloadCard = () => {
    const palette = TEMPLATE_CANVAS_PALETTE[watchedTemplateId];
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1350;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      toast.error("Could not generate invite image in this browser.");
      return;
    }

    // Background & double stationery border
    ctx.fillStyle = palette.bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = palette.border;
    ctx.lineWidth = 8;
    ctx.strokeRect(48, 48, canvas.width - 96, canvas.height - 96);

    ctx.lineWidth = 2;
    ctx.strokeRect(72, 72, canvas.width - 144, canvas.height - 144);

    ctx.textAlign = "center";
    ctx.textBaseline = "top";

    let cursorY = 140;

    // Host line
    ctx.fillStyle = palette.muted;
    ctx.font = "600 24px sans-serif";
    const hostLineText = (
      watchedHostLine?.trim() || "YOU ARE CORDIALLY INVITED"
    ).toUpperCase();
    cursorY = drawWrappedText(ctx, hostLineText, 540, cursorY, 820, 34);
    cursorY += 28;

    // Event title
    ctx.fillStyle = palette.text;
    ctx.font = "bold 60px Georgia, serif";
    cursorY = drawWrappedText(ctx, event.name, 540, cursorY, 840, 74);
    cursorY += 24;

    // Divider
    ctx.fillStyle = palette.accent;
    ctx.fillRect(460, cursorY, 160, 4);
    cursorY += 44;

    // Date & Time
    ctx.fillStyle = palette.text;
    ctx.font = "600 30px sans-serif";
    ctx.fillText(formatDate(event.date), 540, cursorY);
    cursorY += 48;

    if (watchedTime?.trim()) {
      ctx.fillStyle = palette.muted;
      ctx.font = "500 28px sans-serif";
      ctx.fillText(watchedTime.trim(), 540, cursorY);
      cursorY += 48;
    }

    // Venue
    if (watchedVenue?.trim()) {
      ctx.fillStyle = palette.text;
      ctx.font = "500 28px sans-serif";
      cursorY = drawWrappedText(
        ctx,
        watchedVenue.trim(),
        540,
        cursorY + 6,
        820,
        38
      );
      cursorY += 16;
    }

    // Dress code
    if (watchedDressCode?.trim()) {
      ctx.fillStyle = palette.accent;
      ctx.font = "600 24px sans-serif";
      cursorY = drawWrappedText(
        ctx,
        `Dress Code: ${watchedDressCode.trim()}`,
        540,
        cursorY + 8,
        820,
        34
      );
      cursorY += 18;
    }

    // Optional schedule preview (up to 3 items to fit cleanly above QR)
    const validSchedule = watchedScheduleItems.filter(
      (item) => item?.title?.trim() && item?.time?.trim()
    );
    if (validSchedule.length > 0) {
      cursorY += 14;
      ctx.fillStyle = palette.muted;
      ctx.font = "600 20px sans-serif";
      ctx.fillText("CELEBRATION SCHEDULE", 540, cursorY);
      cursorY += 34;

      for (const item of validSchedule.slice(0, 3)) {
        ctx.fillStyle = palette.text;
        ctx.font = "500 24px sans-serif";
        ctx.fillText(`${item.time.trim()} • ${item.title.trim()}`, 540, cursorY);
        cursorY += 34;
      }
    }

    // QR Code section pinned near bottom
    const qrCanvas = qrContainerRef.current?.querySelector("canvas");
    const qrBoxY = 980;
    if (qrCanvas) {
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(430, qrBoxY, 220, 220);
      ctx.drawImage(qrCanvas, 440, qrBoxY + 10, 200, 200);
    }

    ctx.fillStyle = palette.muted;
    ctx.font = "500 22px sans-serif";
    ctx.fillText(
      "Scan to RSVP, get directions & send gifts",
      540,
      qrBoxY + 236
    );
    ctx.fillStyle = palette.accent;
    ctx.font = "600 20px sans-serif";
    ctx.fillText(publicEventUrl.replace(/^https?:\/\//, ""), 540, qrBoxY + 268);

    const link = document.createElement("a");
    link.download = `${event.slug || "givvly"}-invite.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
    toast.success("E-invite card downloaded.");
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-xl font-semibold text-foreground">
          Invitation card designer
        </h2>
        <p className="text-sm text-muted-foreground">
          Pick a template and customize your event details. Your invite and
          event page share one link.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-7">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">1. Choose template</CardTitle>
              <CardDescription>
                Select the visual style for your digital invitation.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <InviteTemplatePicker
                selectedId={watchedTemplateId}
                onSelect={(id) =>
                  form.setValue("templateId", id, { shouldDirty: true })
                }
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                2. Invitation details
              </CardTitle>
              <CardDescription>
                Fill in the venue, time, and dress code shown to guests.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={onSubmit} className="space-y-4" noValidate>
                <div className="space-y-1.5">
                  <Label htmlFor="invite-host-line">Host line</Label>
                  <Input
                    id="invite-host-line"
                    maxLength={120}
                    placeholder="e.g. Together with their families"
                    {...form.register("hostLine")}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="invite-venue">Venue / location</Label>
                  <Input
                    id="invite-venue"
                    maxLength={120}
                    placeholder="e.g. The Monarch Event Centre, Lekki Phase 1, Lagos"
                    {...form.register("venue")}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="invite-map-url">
                    Google Maps link (optional)
                  </Label>
                  <Input
                    id="invite-map-url"
                    type="url"
                    maxLength={500}
                    placeholder="https://maps.google.com/?q=..."
                    {...form.register("mapUrl")}
                  />
                  {form.formState.errors.mapUrl ? (
                    <p className="text-xs text-destructive">
                      {form.formState.errors.mapUrl.message}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      If left blank, guests can still open Google Maps using
                      your venue address.
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="invite-time">Time</Label>
                    <Input
                      id="invite-time"
                      maxLength={60}
                      placeholder="e.g. 2:00 PM WAT"
                      {...form.register("time")}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="invite-dress-code">Dress code</Label>
                    <Input
                      id="invite-dress-code"
                      maxLength={80}
                      placeholder="e.g. Champagne Gold & Blush Rose"
                      {...form.register("dressCode")}
                    />
                  </div>
                </div>

                {/* Optional Multi-Part Schedule */}
                <div className="space-y-3 rounded-lg border border-border/80 bg-muted/20 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        Schedule / itinerary (optional)
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Great for weddings or multi-part events (e.g.
                        Traditional Engagement, Church/Nikah, Reception).
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={scheduleFields.length >= 6}
                      onClick={() =>
                        appendScheduleItem({
                          title: "",
                          time: "",
                          venue: "",
                          mapUrl: "",
                        })
                      }
                    >
                      <Plus className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                      Add item
                    </Button>
                  </div>

                  {scheduleFields.length > 0 ? (
                    <div className="space-y-3">
                      {scheduleFields.map((field, index) => {
                        const itemErrors =
                          form.formState.errors.scheduleItems?.[index];
                        return (
                          <div
                            key={field.id}
                            className="space-y-2.5 rounded-md border border-border bg-background p-3"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-medium text-muted-foreground">
                                Part {index + 1}
                              </span>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2 text-muted-foreground hover:text-destructive"
                                onClick={() => removeScheduleItem(index)}
                                aria-label={`Remove schedule item ${index + 1}`}
                              >
                                <Trash2
                                  className="h-3.5 w-3.5"
                                  aria-hidden="true"
                                />
                              </Button>
                            </div>

                            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                              <div className="space-y-1">
                                <Input
                                  placeholder="Title (e.g. Traditional Engagement)"
                                  maxLength={80}
                                  {...form.register(
                                    `scheduleItems.${index}.title`
                                  )}
                                />
                                {itemErrors?.title ? (
                                  <p className="text-xs text-destructive">
                                    {itemErrors.title.message}
                                  </p>
                                ) : null}
                              </div>

                              <div className="space-y-1">
                                <Input
                                  placeholder="Time (e.g. 10:00 AM)"
                                  maxLength={60}
                                  {...form.register(
                                    `scheduleItems.${index}.time`
                                  )}
                                />
                                {itemErrors?.time ? (
                                  <p className="text-xs text-destructive">
                                    {itemErrors.time.message}
                                  </p>
                                ) : null}
                              </div>
                            </div>

                            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                              <Input
                                placeholder="Venue (optional)"
                                maxLength={120}
                                {...form.register(
                                  `scheduleItems.${index}.venue`
                                )}
                              />
                              <div className="space-y-1">
                                <Input
                                  type="url"
                                  placeholder="Google Maps link (optional)"
                                  maxLength={500}
                                  {...form.register(
                                    `scheduleItems.${index}.mapUrl`
                                  )}
                                />
                                {itemErrors?.mapUrl ? (
                                  <p className="text-xs text-destructive">
                                    {itemErrors.mapUrl.message}
                                  </p>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : null}
                </div>

                <Button
                  type="submit"
                  disabled={updateInviteMutation.isPending}
                >
                  {updateInviteMutation.isPending
                    ? "Saving invite..."
                    : "Save invite design"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Live Preview & Share */}
        <div className="lg:col-span-5">
          <div className="sticky top-6 space-y-4">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Live invitation preview
              </p>
              <div
                className={cn(
                  "rounded-card border-2 p-6 text-center shadow-sm",
                  activeTemplateOption.cardClassName
                )}
              >
                <p className="text-xs uppercase tracking-widest text-muted-foreground">
                  {watchedHostLine || "You are cordially invited"}
                </p>
                <h3 className="mt-3 font-heading text-2xl font-bold text-foreground">
                  {event.name}
                </h3>

                <div className="mx-auto my-5 h-px w-16 bg-border" />

                <div className="space-y-2.5 text-sm text-foreground">
                  <div className="flex items-center justify-center gap-2">
                    <Calendar
                      className="h-4 w-4 text-primary"
                      aria-hidden="true"
                    />
                    <span>{formatDate(event.date)}</span>
                  </div>

                  {watchedTime ? (
                    <div className="flex items-center justify-center gap-2">
                      <Clock
                        className="h-4 w-4 text-primary"
                        aria-hidden="true"
                      />
                      <span>{watchedTime}</span>
                    </div>
                  ) : null}

                  {watchedVenue ? (
                    <div className="flex flex-col items-center gap-1">
                      <div className="flex items-center justify-center gap-2">
                        <MapPin
                          className="h-4 w-4 shrink-0 text-primary"
                          aria-hidden="true"
                        />
                        <span>{watchedVenue}</span>
                      </div>
                      {resolvedMapHref ? (
                        <a
                          href={resolvedMapHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                        >
                          <span>Get directions</span>
                          <ExternalLink
                            className="h-3 w-3"
                            aria-hidden="true"
                          />
                        </a>
                      ) : null}
                    </div>
                  ) : null}

                  {watchedDressCode ? (
                    <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-border bg-background/80 px-3 py-1 text-xs font-medium text-foreground">
                      <span>Dress code: {watchedDressCode}</span>
                    </div>
                  ) : null}

                  {watchedScheduleItems.some(
                    (i) => i?.title?.trim() || i?.time?.trim()
                  ) ? (
                    <div className="mt-4 border-t border-border/70 pt-3 text-left">
                      <p className="mb-2 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Schedule
                      </p>
                      <ul className="space-y-1.5 text-xs">
                        {watchedScheduleItems.map((item, idx) =>
                          item?.title?.trim() || item?.time?.trim() ? (
                            <li
                              key={idx}
                              className="flex items-baseline justify-between gap-2"
                            >
                              <span className="font-medium text-foreground">
                                {item.title || "Untitled"}
                              </span>
                              <span className="shrink-0 text-muted-foreground">
                                {item.time}
                              </span>
                            </li>
                          ) : null
                        )}
                      </ul>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            {/* WhatsApp Share & Downloadable E-Invite Card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Share &amp; download</CardTitle>
                <CardDescription className="text-xs">
                  Download a high-resolution PNG card with a QR code for
                  WhatsApp or print, or share your event link directly.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2.5">
                <div className="sr-only" aria-hidden="true" ref={qrContainerRef}>
                  <QRCodeCanvas
                    value={publicEventUrl}
                    size={220}
                    level="M"
                    includeMargin
                  />
                </div>

                <Button
                  type="button"
                  variant="default"
                  className="w-full"
                  onClick={handleDownloadCard}
                >
                  <Download className="mr-2 h-4 w-4" aria-hidden="true" />
                  Download E-Invite Card (PNG)
                </Button>

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleShareWhatsApp}
                  >
                    <MessageCircle
                      className="mr-1.5 h-4 w-4 text-emerald-600"
                      aria-hidden="true"
                    />
                    WhatsApp
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCopyInviteLink}
                  >
                    <Copy className="mr-1.5 h-4 w-4" aria-hidden="true" />
                    Copy link
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}


"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { QRCodeCanvas } from "qrcode.react";
import {
  Copy,
  Download,
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
import { formatDate } from "@/lib/format";
import { useEventDetail, useUpdateEventInviteMutation } from "../hooks/useEvents";
import { INVITE_TEMPLATE_IDS, inviteEditorSchema } from "../schemas";
import type { EventDetail, InviteEditorInput, InviteTemplateId } from "../types";
import { InviteTemplatePicker } from "./InviteTemplatePicker";
import {
  INVITE_CARD_HEIGHT,
  INVITE_CARD_WIDTH,
  renderInviteCard,
} from "../lib/inviteCardRenderer";
import { WhatsAppIcon } from "@/components/shared/WhatsAppOrderSection";

export type InviteEditorProps = {
  initialEvent: EventDetail;
};

/**
 * Canvas needs the real font-family stack (next/font hashes family names), so
 * read it from the live DOM instead of hard-coding it. Falls back to the
 * renderer defaults (Fraunces / Inter → Georgia / system) if nothing resolves.
 */
function computedFamily(className: string): string | undefined {
  const el = document.createElement("span");
  el.className = className;
  el.textContent = "Aa";
  el.style.cssText = "position:absolute;visibility:hidden;pointer-events:none;";
  document.body.appendChild(el);
  const family = getComputedStyle(el).fontFamily;
  el.remove();
  return family || undefined;
}

export function InviteEditor({ initialEvent }: InviteEditorProps) {
  const { data: event = initialEvent } = useEventDetail(
    initialEvent.id,
    initialEvent
  );
  const updateInviteMutation = useUpdateEventInviteMutation(event.id);
  const qrContainerRef = useRef<HTMLDivElement | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const origin = useSyncExternalStore(
    () => () => {},
    () => window.location.origin,
    () => "https://givvly.store"
  );
  const [isExporting, setIsExporting] = useState(false);

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

  const buildCardData = () => {
    const qrCanvas = qrContainerRef.current?.querySelector("canvas") ?? null;
    const schedule = watchedScheduleItems
      .filter((item) => item?.title?.trim() && item?.time?.trim())
      .map((item) => ({
        title: item.title.trim(),
        time: item.time.trim(),
        ...(item.venue?.trim() ? { venue: item.venue.trim() } : {}),
      }));

    return {
      templateId: watchedTemplateId,
      eventName: event.name,
      eventDate: String(event.date),
      dateLabel: formatDate(event.date),
      hostLine: watchedHostLine?.trim(),
      time: watchedTime?.trim(),
      venue: watchedVenue?.trim(),
      dressCode: watchedDressCode?.trim(),
      schedule,
      publicUrl: publicEventUrl,
      qr: qrCanvas,
    };
  };

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      const targetCanvas = previewCanvasRef.current;
      if (!targetCanvas) return;

      void renderInviteCard(buildCardData(), {
        scale: 1,
        fonts: {
          display: computedFamily("font-heading"),
          body: computedFamily("font-sans"),
        },
        createCanvas: (w, h) => {
          if (!cancelled) {
            targetCanvas.width = w;
            targetCanvas.height = h;
          }
          return targetCanvas;
        },
      }).catch(() => {
        // Ignore canvas context errors in non-browser test environments
      });
    }, 60);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    watchedTemplateId,
    watchedHostLine,
    watchedTime,
    watchedVenue,
    watchedDressCode,
    watchedScheduleItems,
    event.name,
    event.date,
    publicEventUrl,
  ]);

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

  const handleDownloadCard = async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      const qrCanvas = qrContainerRef.current?.querySelector("canvas") ?? null;

      const schedule = watchedScheduleItems
        .filter((item) => item?.title?.trim() && item?.time?.trim())
        .map((item) => ({
          title: item.title.trim(),
          time: item.time.trim(),
          ...(item.venue?.trim() ? { venue: item.venue.trim() } : {}),
        }));

      const card = await renderInviteCard(
        {
          templateId: watchedTemplateId,
          eventName: event.name,
          eventDate: String(event.date),
          dateLabel: formatDate(event.date),
          hostLine: watchedHostLine?.trim(),
          time: watchedTime?.trim(),
          venue: watchedVenue?.trim(),
          dressCode: watchedDressCode?.trim(),
          schedule,
          publicUrl: publicEventUrl,
          qr: qrCanvas,
        },
        {
          scale: 2, // 2160 x 2700 px, crisp for WhatsApp and print
          fonts: {
            display: computedFamily("font-heading"),
            body: computedFamily("font-sans"),
          },
        }
      );

      const blob = await new Promise<Blob | null>((resolve) =>
        card.toBlob((result) => resolve(result), "image/png")
      );
      if (!blob) {
        toast.error("Could not generate invite image in this browser.");
        return;
      }
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.download = `${event.slug || "givvly"}-invite.png`;
      link.href = url;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.success("E-invite card downloaded.");
    } catch {
      toast.error("Could not generate invite image in this browser.");
    } finally {
      setIsExporting(false);
    }
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
              <div className="overflow-hidden rounded-2xl border border-border bg-muted/20 shadow-sm">
                <canvas
                  ref={previewCanvasRef}
                  width={INVITE_CARD_WIDTH}
                  height={INVITE_CARD_HEIGHT}
                  aria-label={`Live invitation card preview for ${event.name}`}
                  className="block h-auto w-full aspect-[4/5]"
                />
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
                {/* Rendered large so the QR stays sharp on the 2x export */}
                <div className="sr-only" aria-hidden="true" ref={qrContainerRef}>
                  <QRCodeCanvas
                    value={publicEventUrl}
                    size={480}
                    level="M"
                    includeMargin
                  />
                </div>

                <Button
                  type="button"
                  variant="default"
                  className="w-full"
                  disabled={isExporting}
                  onClick={handleDownloadCard}
                >
                  <Download className="mr-2 h-4 w-4" aria-hidden="true" />
                  {isExporting ? "Preparing card..." : "Download E-Invite Card (PNG)"}
                </Button>

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleShareWhatsApp}
                  >
                    <WhatsAppIcon className="h-4 w-4" aria-hidden="true" />
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

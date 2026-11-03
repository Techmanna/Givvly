"use client";

import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Calendar, Clock, MapPin } from "lucide-react";
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

export function InviteEditor({ initialEvent }: InviteEditorProps) {
  const { data: event = initialEvent } = useEventDetail(
    initialEvent.id,
    initialEvent
  );
  const updateInviteMutation = useUpdateEventInviteMutation(event.id);

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
      venue:
        event.template?.fields?.venue ??
        "The Monarch Event Centre, Lekki Phase 1, Lagos",
      time: event.template?.fields?.time ?? "2:00 PM WAT",
      dressCode:
        event.template?.fields?.dressCode ?? "Champagne Gold & Blush Rose",
      hostLine:
        event.template?.fields?.hostLine ?? "Together with their families",
    },
  });

  const watchedTemplateId = useWatch({
    control: form.control,
    name: "templateId",
  });
  const watchedVenue = useWatch({ control: form.control, name: "venue" });
  const watchedTime = useWatch({ control: form.control, name: "time" });
  const watchedDressCode = useWatch({
    control: form.control,
    name: "dressCode",
  });
  const watchedHostLine = useWatch({
    control: form.control,
    name: "hostLine",
  });

  const activeTemplateOption =
    INVITE_TEMPLATE_OPTIONS.find((t) => t.id === watchedTemplateId) ??
    INVITE_TEMPLATE_OPTIONS[0]!;

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await updateInviteMutation.mutateAsync({
        templateId: values.templateId,
        fields: {
          venue: values.venue?.trim() ?? "",
          time: values.time?.trim() ?? "",
          dressCode: values.dressCode?.trim() ?? "",
          hostLine: values.hostLine?.trim() ?? "",
        },
      });
      toast.success("Invitation card saved and published to your event page.");
    } catch {
      toast.error("Could not save invitation design. Please try again.");
    }
  });

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
                    {...form.register("hostLine")}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="invite-venue">Venue / location</Label>
                  <Input
                    id="invite-venue"
                    maxLength={120}
                    {...form.register("venue")}
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="invite-time">Time</Label>
                    <Input
                      id="invite-time"
                      maxLength={60}
                      {...form.register("time")}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="invite-dress-code">Dress code</Label>
                    <Input
                      id="invite-dress-code"
                      maxLength={80}
                      {...form.register("dressCode")}
                    />
                  </div>
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

        {/* Live Preview */}
        <div className="lg:col-span-5">
          <div className="sticky top-6 space-y-2">
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
                  <div className="flex items-center justify-center gap-2">
                    <MapPin
                      className="h-4 w-4 shrink-0 text-primary"
                      aria-hidden="true"
                    />
                    <span>{watchedVenue}</span>
                  </div>
                ) : null}

                {watchedDressCode ? (
                  <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-border bg-background/80 px-3 py-1 text-xs font-medium text-foreground">
                    <span>Dress code: {watchedDressCode}</span>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


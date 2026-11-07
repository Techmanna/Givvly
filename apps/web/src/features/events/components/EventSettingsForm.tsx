"use client";

import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Archive, Lock, Save } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { FileDropzone } from "@/components/shared/FileDropzone";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { generateAccessCodeSuggestion } from "@/stores/event-wizard-store";
import { uploadMediaFile } from "../api";
import {
  useEventDetail,
  useUpdateEventSettingsMutation,
} from "../hooks/useEvents";
import { eventSettingsSchema } from "../schemas";
import type { EventDetail, EventSettingsInput, EventStatus } from "../types";

export type EventSettingsFormProps = {
  initialEvent: EventDetail;
};

export function EventSettingsForm({ initialEvent }: EventSettingsFormProps) {
  const { data: event = initialEvent } = useEventDetail(
    initialEvent.id,
    initialEvent
  );
  const updateMutation = useUpdateEventSettingsMutation(event.id);
  const [confirmAction, setConfirmAction] = useState<EventStatus | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | undefined>(event.coverUrl);
  const [coverKey, setCoverKey] = useState<string | undefined>(undefined);
  const [coverKind, setCoverKind] = useState<"IMAGE" | "VIDEO">("IMAGE");
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [coverUploadProgress, setCoverUploadProgress] = useState(0);

  const handleCoverUpload = async (file: File) => {
    setIsUploadingCover(true);
    setCoverUploadProgress(5);
    setCoverKind(file.type.startsWith("video/") ? "VIDEO" : "IMAGE");
    try {
      const uploaded = await uploadMediaFile(file, "EVENT_COVER", (pct) =>
        setCoverUploadProgress(pct)
      );
      setCoverKey(uploaded.key);
      setCoverUrl(uploaded.url);
      setCoverKind(uploaded.kind);
      toast.success(
        uploaded.kind === "VIDEO"
          ? "Cover video uploaded"
          : "Cover image uploaded"
      );
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not upload cover media"
      );
    } finally {
      setIsUploadingCover(false);
    }
  };

  const form = useForm<EventSettingsInput>({
    resolver: zodResolver(eventSettingsSchema),
    mode: "onBlur",
    defaultValues: {
      name: event.name,
      story: event.story ?? "",
      visibility: event.visibility,
      accessCode: event.accessCode ?? generateAccessCodeSuggestion(8),
      allowPlusOne: event.allowPlusOne,
    },
  });

  const watchedVisibility = useWatch({
    control: form.control,
    name: "visibility",
  });
  const watchedAllowPlusOne = useWatch({
    control: form.control,
    name: "allowPlusOne",
  });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await updateMutation.mutateAsync({
        name: values.name.trim(),
        story: values.story?.trim() || undefined,
        visibility: values.visibility,
        accessCode:
          values.visibility === "PRIVATE"
            ? values.accessCode?.trim().toUpperCase()
            : undefined,
        allowPlusOne: values.allowPlusOne,
        ...(coverKey ? { coverKey } : {}),
        ...(coverUrl !== undefined ? { coverUrl } : {}),
      });
      toast.success("Event settings updated.");
    } catch {
      toast.error("Could not save event settings. Please try again.");
    }
  });

  const handleStatusChange = async (nextStatus: EventStatus) => {
    try {
      await updateMutation.mutateAsync({ status: nextStatus });
      toast.success(`Event status updated to ${nextStatus}.`);
      setConfirmAction(null);
    } catch {
      toast.error("Could not update event status.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading text-xl font-semibold text-foreground">
            Event settings
          </h2>
          <p className="text-sm text-muted-foreground">
            Update your event details, privacy, and lifecycle state.
          </p>
        </div>
        <StatusBadge status={event.status} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">General and privacy</CardTitle>
          <CardDescription>
            Changes take effect immediately on your public event link.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="settings-event-name">Event name</Label>
              <Input
                id="settings-event-name"
                maxLength={80}
                {...form.register("name")}
              />
              {form.formState.errors.name ? (
                <p className="text-xs text-destructive" role="alert">
                  {form.formState.errors.name.message}
                </p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="settings-event-story">Our story</Label>
              <Textarea
                id="settings-event-story"
                rows={4}
                maxLength={1500}
                {...form.register("story")}
              />
              {form.formState.errors.story ? (
                <p className="text-xs text-destructive" role="alert">
                  {form.formState.errors.story.message}
                </p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <Label>Cover image or video</Label>
              <FileDropzone
                allowVideo={true}
                previewUrl={coverUrl}
                previewKind={coverKind}
                label="Tap or drag to upload cover image or video"
                isUploading={isUploadingCover}
                uploadProgress={coverUploadProgress}
                onSelectFile={handleCoverUpload}
                onRemove={() => {
                  setCoverUrl("");
                  setCoverKey(undefined);
                }}
              />
            </div>

            <div className="flex items-center justify-between gap-4 rounded-control border border-border p-4">
              <div className="space-y-0.5">
                <Label
                  htmlFor="settings-private-switch"
                  className="text-sm font-medium"
                >
                  Private event (require access code)
                </Label>
                <p className="text-xs text-muted-foreground">
                  Guests must enter your access code before viewing the page.
                </p>
              </div>
              <Switch
                id="settings-private-switch"
                checked={watchedVisibility === "PRIVATE"}
                onCheckedChange={(checked) =>
                  form.setValue(
                    "visibility",
                    checked ? "PRIVATE" : "PUBLIC",
                    { shouldValidate: true }
                  )
                }
              />
            </div>

            {watchedVisibility === "PRIVATE" ? (
              <div className="space-y-1.5">
                <Label htmlFor="settings-access-code">
                  Access code (6 to 12 alphanumeric characters)
                </Label>
                <Input
                  id="settings-access-code"
                  maxLength={12}
                  className="font-mono uppercase"
                  {...form.register("accessCode")}
                />
                {form.formState.errors.accessCode ? (
                  <p className="text-xs text-destructive" role="alert">
                    {form.formState.errors.accessCode.message}
                  </p>
                ) : null}
              </div>
            ) : null}

            <div className="flex items-center justify-between gap-4 rounded-control border border-border p-4">
              <div className="space-y-0.5">
                <Label
                  htmlFor="settings-plus-one"
                  className="text-sm font-medium"
                >
                  Allow guests to bring a plus-one
                </Label>
                <p className="text-xs text-muted-foreground">
                  Shows a plus-one name field on the RSVP form.
                </p>
              </div>
              <Switch
                id="settings-plus-one"
                checked={Boolean(watchedAllowPlusOne)}
                onCheckedChange={(checked) =>
                  form.setValue("allowPlusOne", Boolean(checked))
                }
              />
            </div>

            <Button type="submit" disabled={updateMutation.isPending}>
              <Save className="h-4 w-4" aria-hidden="true" />
              <span>
                {updateMutation.isPending ? "Saving..." : "Save changes"}
              </span>
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Close or archive event</CardTitle>
          <CardDescription>
            Closing stops new gifts and RSVPs. Archiving hides the event from
            your active dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          {event.status !== "CLOSED" ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmAction("CLOSED")}
            >
              <Lock className="h-4 w-4" aria-hidden="true" />
              <span>Close event</span>
            </Button>
          ) : null}
          {event.status !== "ARCHIVED" ? (
            <Button
              type="button"
              variant="destructive"
              onClick={() => setConfirmAction("ARCHIVED")}
            >
              <Archive className="h-4 w-4" aria-hidden="true" />
              <span>Archive event</span>
            </Button>
          ) : null}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={Boolean(confirmAction)}
        onOpenChange={(open) => {
          if (!open) setConfirmAction(null);
        }}
        title={
          confirmAction === "CLOSED"
            ? "Close this event?"
            : "Archive this event?"
        }
        description={
          confirmAction === "CLOSED"
            ? "Guests will still see the page, but new gifts and RSVPs will be disabled."
            : "This event will be moved to your archived state."
        }
        confirmLabel={
          confirmAction === "CLOSED" ? "Close event" : "Archive event"
        }
        variant={confirmAction === "ARCHIVED" ? "destructive" : "default"}
        isPending={updateMutation.isPending}
        onConfirm={() => {
          if (confirmAction) {
            void handleStatusChange(confirmAction);
          }
        }}
      />
    </div>
  );
}


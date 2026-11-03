"use client";

import * as React from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StepIndicator } from "@/components/shared/StepIndicator";
import { FileDropzone } from "@/components/shared/FileDropzone";
import { ShareMenu } from "@/components/shared/ShareMenu";
import { QrCard } from "@/components/shared/QrCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Money } from "@/components/shared/Money";
import { toast } from "@/components/ui/sonner";
import { env } from "@/lib/env";
import { formatDate, nairaToKobo } from "@/lib/format";
import { ApiClientError } from "@/lib/api-client";
import {
  generateAccessCodeSuggestion,
  useEventWizardStore,
  type WizardStep,
} from "@/stores/event-wizard-store";
import { uploadFileToPresignedUrl } from "../api";
import {
  useCreateAndPublishEventMutation,
  usePayoutAccountQuery,
  usePresignUploadMutation,
} from "../hooks/useEvents";
import {
  EVENT_TYPES,
  eventStep1Schema,
  eventStep2Schema,
  eventStep3Schema,
  eventStep4Schema,
  getLagosDateBounds,
  wizardRegistryItemSchema,
} from "../schemas";
import type { EventDetail, EventType } from "../types";

const WIZARD_STEPS = [
  { step: 1, label: "Basics" },
  { step: 2, label: "Story" },
  { step: 3, label: "Privacy" },
  { step: 4, label: "Registry" },
  { step: 5, label: "Review" },
] as const;

const EVENT_TYPE_LABELS: Record<EventType, string> = {
  BIRTHDAY: "Birthday",
  WEDDING: "Wedding",
  BABY_SHOWER: "Baby shower",
  GRADUATION: "Graduation",
  OTHER: "Other celebration",
};

export function CreateEventWizard() {
  const step = useEventWizardStore((s) => s.step);
  const draft = useEventWizardStore((s) => s.draft);
  const setStep = useEventWizardStore((s) => s.setStep);
  const updateDraft = useEventWizardStore((s) => s.updateDraft);
  const addRegistryItem = useEventWizardStore((s) => s.addRegistryItem);
  const removeRegistryItem = useEventWizardStore((s) => s.removeRegistryItem);
  const hydrateFromStorage = useEventWizardStore((s) => s.hydrateFromStorage);
  const clearWizard = useEventWizardStore((s) => s.clearWizard);

  const payoutQuery = usePayoutAccountQuery();
  const presignMutation = usePresignUploadMutation();
  const publishMutation = useCreateAndPublishEventMutation();

  const [stepErrors, setStepErrors] = React.useState<Record<string, string>>(
    {}
  );
  const [uploadProgress, setUploadProgress] = React.useState(0);
  const [isUploading, setIsUploading] = React.useState(false);
  const [newItemTitle, setNewItemTitle] = React.useState("");
  const [newItemPrice, setNewItemPrice] = React.useState("");
  const [publishedEvent, setPublishedEvent] =
    React.useState<EventDetail | null>(null);

  React.useEffect(() => {
    hydrateFromStorage();
  }, [hydrateFromStorage]);

  const { minDate, maxDate } = React.useMemo(() => getLagosDateBounds(), []);

  const validateCurrentStep = (targetStep: WizardStep): boolean => {
    setStepErrors({});
    if (targetStep === 1) {
      const parsed = eventStep1Schema.safeParse({
        type: draft.type,
        name: draft.name,
        date: draft.date,
      });
      if (!parsed.success) {
        const errs: Record<string, string> = {};
        for (const issue of parsed.error.issues) {
          const key = String(issue.path[0] ?? "form");
          if (!errs[key]) errs[key] = issue.message;
        }
        setStepErrors(errs);
        return false;
      }
      return true;
    }

    if (targetStep === 2) {
      const parsed = eventStep2Schema.safeParse({
        coverKey: draft.coverKey,
        coverUrl: draft.coverUrl,
        story: draft.story,
      });
      if (!parsed.success) {
        const errs: Record<string, string> = {};
        for (const issue of parsed.error.issues) {
          const key = String(issue.path[0] ?? "form");
          if (!errs[key]) errs[key] = issue.message;
        }
        setStepErrors(errs);
        return false;
      }
      return true;
    }

    if (targetStep === 3) {
      const parsed = eventStep3Schema.safeParse({
        visibility: draft.visibility,
        accessCode: draft.accessCode,
      });
      if (!parsed.success) {
        const errs: Record<string, string> = {};
        for (const issue of parsed.error.issues) {
          const key = String(issue.path[0] ?? "form");
          if (!errs[key]) errs[key] = issue.message;
        }
        setStepErrors(errs);
        return false;
      }
      return true;
    }

    if (targetStep === 4) {
      const parsed = eventStep4Schema.safeParse({
        registryItems: draft.registryItems,
      });
      if (!parsed.success) {
        setStepErrors({ registry: parsed.error.issues[0]?.message ?? "Invalid registry items" });
        return false;
      }
      return true;
    }

    return true;
  };

  const handleNext = () => {
    if (!validateCurrentStep(step)) return;
    if (step < 5) {
      setStep((step + 1) as WizardStep);
    }
  };

  const handleBack = () => {
    setStepErrors({});
    if (step > 1) {
      setStep((step - 1) as WizardStep);
    }
  };

  const handleFileUpload = async (file: File) => {
    setIsUploading(true);
    setUploadProgress(0);
    setStepErrors({});

    try {
      const contentType = file.type as
        | "image/jpeg"
        | "image/png"
        | "image/webp";
      const presigned = await presignMutation.mutateAsync({
        fileName: file.name,
        contentType,
        sizeBytes: file.size,
        purpose: "EVENT_COVER",
      });

      await uploadFileToPresignedUrl(presigned, file, (pct) =>
        setUploadProgress(pct)
      );

      const previewUrl =
        presigned.publicUrl ?? URL.createObjectURL(file);
      updateDraft({
        coverKey: presigned.key,
        coverUrl: previewUrl,
      });
      toast.success("Cover image uploaded");
    } catch (error) {
      const message =
        error instanceof ApiClientError
          ? error.message
          : "Could not upload cover image. Please try again.";
      setStepErrors({ cover: message });
    } finally {
      setIsUploading(false);
    }
  };

  const handleAddRegistryItem = () => {
    setStepErrors({});
    const parsed = wizardRegistryItemSchema.safeParse({
      id: crypto.randomUUID(),
      title: newItemTitle,
      targetPriceNaira: newItemPrice,
    });

    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "registry");
        if (!errs[key]) errs[key] = issue.message;
      }
      setStepErrors(errs);
      return;
    }

    addRegistryItem(parsed.data);
    setNewItemTitle("");
    setNewItemPrice("");
  };

  const handlePublish = async () => {
    for (const s of [1, 2, 3, 4] as const) {
      if (!validateCurrentStep(s)) {
        setStep(s);
        return;
      }
    }

    setStepErrors({});
    try {
      const published = await publishMutation.mutateAsync({
        type: draft.type,
        name: draft.name.trim(),
        date: draft.date,
        coverKey: draft.coverKey,
        story: draft.story.trim() || undefined,
        visibility: draft.visibility,
        accessCode:
          draft.visibility === "PRIVATE" ? draft.accessCode.trim() : undefined,
        registryItems: draft.registryItems.map((item) => ({
          productId: item.productId,
          title: item.title,
          priceKobo: nairaToKobo(item.targetPriceNaira),
        })),
      });

      clearWizard();
      setPublishedEvent(published);
      toast.success("Event published");
    } catch (error) {
      const message =
        error instanceof ApiClientError
          ? error.message
          : "Could not publish event. Check your connection and try again.";
      setStepErrors({ publish: message });
    }
  };

  const payoutVerified = payoutQuery.data?.status === "VERIFIED";

  if (publishedEvent) {
    const publicUrl = `${env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")}/e/${publishedEvent.slug}`;

    return (
      <div className="space-y-6" aria-live="polite">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-success">
              <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
            </div>
            <CardTitle className="text-2xl">Your event is live</CardTitle>
            <CardDescription>
              Share your link with family and friends so they can RSVP and send
              gifts.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {!payoutVerified && !publishedEvent.moneyGiftsEnabled ? (
              <div className="flex flex-col justify-between gap-3 rounded-control border border-warning/40 bg-warning/10 p-4 sm:flex-row sm:items-center">
                <div className="flex items-start gap-2.5 text-sm">
                  <AlertTriangle
                    className="mt-0.5 h-5 w-5 shrink-0 text-warning"
                    aria-hidden="true"
                  />
                  <div>
                    <p className="font-medium text-foreground">
                      Money gifts are currently off
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Add and verify your bank account to enable cash gifts on
                      your event page.
                    </p>
                  </div>
                </div>
                <Button asChild size="sm" variant="secondary">
                  <Link href="/account/payout">Save payout details</Link>
                </Button>
              </div>
            ) : null}

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    Public event link
                  </p>
                  <p className="mt-1 break-all font-mono text-sm font-medium text-foreground">
                    {publicUrl}
                  </p>
                </div>
                <ShareMenu url={publicUrl} title={publishedEvent.name} />
                <div className="flex flex-wrap gap-2 pt-2">
                  <Button asChild variant="default">
                    <Link href={`/e/${publishedEvent.slug}`}>
                      View public page
                    </Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link href={`/events/${publishedEvent.id}`}>
                      Manage event
                    </Link>
                  </Button>
                </div>
              </div>
              <QrCard url={publicUrl} />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <StepIndicator
        steps={WIZARD_STEPS}
        currentStep={step}
        onSelectStep={(s) => setStep(s as WizardStep)}
      />

      <Card>
        <CardHeader>
          <CardTitle>
            {step === 1 && "Event details"}
            {step === 2 && "Cover photo and story"}
            {step === 3 && "Visibility and access"}
            {step === 4 && "Gift registry (optional)"}
            {step === 5 && "Review and publish"}
          </CardTitle>
          <CardDescription>
            {step === 1 && "Choose the occasion, title, and date."}
            {step === 2 && "Add a cover photo and tell guests what you are celebrating."}
            {step === 3 && "Choose who can view your event page."}
            {step === 4 && "Add up to 50 items you would love to receive."}
            {step === 5 && "Confirm everything looks right before publishing."}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          {step === 1 ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Event type</Label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {EVENT_TYPES.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => updateDraft({ type: t })}
                      aria-pressed={draft.type === t}
                      className={`min-h-11 rounded-control border px-3 py-2 text-left text-sm font-medium transition-colors ${
                        draft.type === t
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-card text-foreground hover:bg-muted"
                      }`}
                    >
                      {EVENT_TYPE_LABELS[t]}
                    </button>
                  ))}
                </div>
                {stepErrors.type ? (
                  <p role="alert" className="text-xs font-medium text-destructive">
                    {stepErrors.type}
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="wizard-event-name">Event name</Label>
                <Input
                  id="wizard-event-name"
                  value={draft.name}
                  maxLength={80}
                  onChange={(e) => updateDraft({ name: e.target.value })}
                />
                {stepErrors.name ? (
                  <p role="alert" className="text-xs font-medium text-destructive">
                    {stepErrors.name}
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="wizard-event-date">Event date</Label>
                <Input
                  id="wizard-event-date"
                  type="date"
                  min={minDate}
                  max={maxDate}
                  value={draft.date}
                  onChange={(e) => updateDraft({ date: e.target.value })}
                />
                {stepErrors.date ? (
                  <p role="alert" className="text-xs font-medium text-destructive">
                    {stepErrors.date}
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Cover image (optional)</Label>
                <FileDropzone
                  previewUrl={draft.coverUrl}
                  isUploading={isUploading}
                  uploadProgress={uploadProgress}
                  onSelectFile={handleFileUpload}
                  onRemove={() =>
                    updateDraft({ coverKey: undefined, coverUrl: undefined })
                  }
                />
                {stepErrors.cover ? (
                  <p role="alert" className="text-xs font-medium text-destructive">
                    {stepErrors.cover}
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="wizard-event-story">Our story (optional)</Label>
                  <span className="text-xs text-muted-foreground">
                    {draft.story.length}/1500
                  </span>
                </div>
                <Textarea
                  id="wizard-event-story"
                  maxLength={1500}
                  rows={5}
                  value={draft.story}
                  onChange={(e) => updateDraft({ story: e.target.value })}
                />
                {stepErrors.story ? (
                  <p role="alert" className="text-xs font-medium text-destructive">
                    {stepErrors.story}
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}

          {step === 3 ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => updateDraft({ visibility: "PUBLIC" })}
                  aria-pressed={draft.visibility === "PUBLIC"}
                  className={`rounded-card border p-4 text-left transition-colors ${
                    draft.visibility === "PUBLIC"
                      ? "border-primary bg-primary/10"
                      : "border-border bg-card hover:bg-muted"
                  }`}
                >
                  <p className="font-heading text-base font-semibold text-foreground">
                    Public
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Anyone with the link can view your event page and send gifts.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    updateDraft({
                      visibility: "PRIVATE",
                      accessCode:
                        draft.accessCode || generateAccessCodeSuggestion(8),
                    })
                  }
                  aria-pressed={draft.visibility === "PRIVATE"}
                  className={`rounded-card border p-4 text-left transition-colors ${
                    draft.visibility === "PRIVATE"
                      ? "border-primary bg-primary/10"
                      : "border-border bg-card hover:bg-muted"
                  }`}
                >
                  <p className="font-heading text-base font-semibold text-foreground">
                    Private with access code
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Guests must enter a 6 to 12 character code before viewing.
                  </p>
                </button>
              </div>

              {draft.visibility === "PRIVATE" ? (
                <div className="space-y-2 pt-2">
                  <Label htmlFor="wizard-access-code">Access code</Label>
                  <div className="flex gap-2">
                    <Input
                      id="wizard-access-code"
                      value={draft.accessCode}
                      maxLength={12}
                      onChange={(e) =>
                        updateDraft({
                          accessCode: e.target.value.replace(/[^A-Za-z0-9]/g, ""),
                        })
                      }
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() =>
                        updateDraft({
                          accessCode: generateAccessCodeSuggestion(8),
                        })
                      }
                    >
                      <RefreshCw className="h-4 w-4" aria-hidden="true" />
                      <span>Suggest</span>
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    6 to 12 letters and numbers. Share this code with your invited guests.
                  </p>
                  {stepErrors.accessCode ? (
                    <p role="alert" className="text-xs font-medium text-destructive">
                      {stepErrors.accessCode}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}

          {step === 4 ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
                <div className="space-y-1.5 sm:col-span-6">
                  <Label htmlFor="registry-item-title">Item title</Label>
                  <Input
                    id="registry-item-title"
                    value={newItemTitle}
                    maxLength={80}
                    onChange={(e) => setNewItemTitle(e.target.value)}
                  />
                  {stepErrors.title ? (
                    <p role="alert" className="text-xs font-medium text-destructive">
                      {stepErrors.title}
                    </p>
                  ) : null}
                </div>
                <div className="space-y-1.5 sm:col-span-4">
                  <Label htmlFor="registry-item-price">Target price (₦)</Label>
                  <Input
                    id="registry-item-price"
                    inputMode="numeric"
                    value={newItemPrice}
                    onChange={(e) =>
                      setNewItemPrice(e.target.value.replace(/\D/g, ""))
                    }
                  />
                  {stepErrors.targetPriceNaira ? (
                    <p role="alert" className="text-xs font-medium text-destructive">
                      {stepErrors.targetPriceNaira}
                    </p>
                  ) : null}
                </div>
                <div className="flex items-end sm:col-span-2">
                  <Button
                    type="button"
                    variant="secondary"
                    className="w-full"
                    disabled={draft.registryItems.length >= 50}
                    onClick={handleAddRegistryItem}
                  >
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    <span>Add</span>
                  </Button>
                </div>
              </div>

              {draft.registryItems.length > 0 ? (
                <ul className="divide-y divide-border rounded-card border border-border">
                  {draft.registryItems.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-center justify-between px-4 py-3 text-sm"
                    >
                      <div>
                        <p className="font-medium text-foreground">
                          {item.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          <Money
                            amountKobo={nairaToKobo(item.targetPriceNaira)}
                          />
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        aria-label={`Remove ${item.title}`}
                        onClick={() => removeRegistryItem(item.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-muted-foreground">
                  No registry items added yet. You can also manage registry items after publishing.
                </p>
              )}
            </div>
          ) : null}

          {step === 5 ? (
            <div className="space-y-4">
              {stepErrors.publish ? (
                <div
                  role="alert"
                  className="rounded-control border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
                >
                  {stepErrors.publish}
                </div>
              ) : null}

              <dl className="divide-y divide-border rounded-card border border-border bg-muted/30 p-4 text-sm">
                <div className="flex justify-between py-2">
                  <dt className="text-muted-foreground">Type</dt>
                  <dd className="font-medium text-foreground">
                    {EVENT_TYPE_LABELS[draft.type]}
                  </dd>
                </div>
                <div className="flex justify-between py-2">
                  <dt className="text-muted-foreground">Event name</dt>
                  <dd className="font-medium text-foreground">{draft.name}</dd>
                </div>
                <div className="flex justify-between py-2">
                  <dt className="text-muted-foreground">Date</dt>
                  <dd className="font-medium text-foreground">
                    {draft.date ? formatDate(draft.date) : "—"}
                  </dd>
                </div>
                <div className="flex justify-between py-2">
                  <dt className="text-muted-foreground">Visibility</dt>
                  <dd className="font-medium text-foreground">
                    {draft.visibility === "PRIVATE"
                      ? `Private (Code: ${draft.accessCode})`
                      : "Public"}
                  </dd>
                </div>
                <div className="flex justify-between py-2">
                  <dt className="text-muted-foreground">Registry items</dt>
                  <dd className="font-medium text-foreground">
                    {draft.registryItems.length}
                  </dd>
                </div>
                <div className="flex items-center justify-between py-2">
                  <dt className="text-muted-foreground">Payout status</dt>
                  <dd className="flex items-center gap-2">
                    <StatusBadge
                      status={payoutQuery.data?.status ?? "NOT_SET"}
                    />
                  </dd>
                </div>
              </dl>

              {!payoutVerified ? (
                <div className="flex flex-col justify-between gap-3 rounded-control border border-warning/40 bg-warning/10 p-4 sm:flex-row sm:items-center">
                  <div className="flex items-start gap-2.5 text-xs">
                    <AlertTriangle
                      className="mt-0.5 h-4 w-4 shrink-0 text-warning"
                      aria-hidden="true"
                    />
                    <span>
                      Payout details are not verified yet. You can publish now,
                      and money gifts will turn on once you save your bank
                      account.
                    </span>
                  </div>
                  <Button asChild size="sm" variant="outline">
                    <Link href="/account/payout">Save payout details</Link>
                  </Button>
                </div>
              ) : null}
            </div>
          ) : null}
        </CardContent>

        <CardFooter className="flex items-center justify-between border-t border-border pt-4">
          {step > 1 ? (
            <Button type="button" variant="outline" onClick={handleBack}>
              Back
            </Button>
          ) : (
            <div />
          )}

          {step < 5 ? (
            <Button
              type="button"
              onClick={handleNext}
              disabled={isUploading}
            >
              Continue
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handlePublish}
              disabled={publishMutation.isPending}
            >
              {publishMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : null}
              <span>Publish event</span>
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}


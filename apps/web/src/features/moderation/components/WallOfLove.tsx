"use client";

import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertTriangle,
  Heart,
  ImagePlus,
  MessageSquarePlus,
  X,
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
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/shared/EmptyState";
import { PaginationBar } from "@/components/shared/PaginationBar";
import { ApiClientError } from "@/lib/api-client";
import {
  uploadFileToPresignedUrl,
  validateClientMediaFile,
} from "@/features/events/api";
import type { AllowedMediaMimeType } from "@/features/events/types";
import { presignWallPhoto } from "../api";
import {
  useCreateWallPostMutation,
  usePublicWall,
} from "../hooks/useWall";
import { hasProfanityWarning, wallPostSchema } from "../schemas";
import type { WallPostFormInput } from "../types";
import { WallPostCard } from "./WallPostCard";

export type WallOfLoveProps = {
  slug: string;
  ownerFirstName: string;
};

type UploadedPhoto = {
  name: string;
  url: string;
  type: "IMAGE" | "VIDEO";
};

const MAX_WALL_PHOTOS = 3;
const MAX_PHOTO_SIZE_BYTES = 8 * 1024 * 1024; // 8 MB for images
const MAX_VIDEO_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB for videos
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/webm",
  "video/quicktime",
]);

export function WallOfLove({ slug, ownerFirstName }: WallOfLoveProps) {
  const [flaggedNotice, setFlaggedNotice] = useState<string | null>(null);
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const wallQuery = usePublicWall(slug);
  const createMutation = useCreateWallPostMutation(slug);

  const form = useForm<WallPostFormInput>({
    resolver: zodResolver(wallPostSchema),
    mode: "onBlur",
    defaultValues: {
      authorName: "",
      text: "",
    },
  });

  const watchedText = useWatch({ control: form.control, name: "text" });
  const showProfanityWarning = hasProfanityWarning(watchedText);

  const handlePhotoFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setPhotoError(null);

    const files = Array.from(fileList);
    if (photos.length + files.length > MAX_WALL_PHOTOS) {
      setPhotoError("You can attach up to 3 photos or videos per message.");
      return;
    }

    for (const file of files) {
      if (!ALLOWED_MIME_TYPES.has(file.type)) {
        setPhotoError(
          "Only JPG, PNG, WebP, GIF photos and MP4, WebM, MOV videos are allowed."
        );
        return;
      }
      const isVideo = file.type.startsWith("video/");
      if (!isVideo && file.size > MAX_PHOTO_SIZE_BYTES) {
        setPhotoError("Each photo must be 8 MB or smaller.");
        return;
      }
      if (isVideo && file.size > MAX_VIDEO_SIZE_BYTES) {
        setPhotoError("Each video must be 50 MB or smaller.");
        return;
      }
    }

    setIsUploadingPhoto(true);
    try {
      const nextUploaded: UploadedPhoto[] = [];
      for (const file of files) {
        await validateClientMediaFile(file, {
          allowVideo: true,
          maxImageBytes: MAX_PHOTO_SIZE_BYTES,
          maxVideoBytes: MAX_VIDEO_SIZE_BYTES,
        });
        const contentType = file.type as AllowedMediaMimeType;
        const presign = await presignWallPhoto({
          fileName: file.name,
          contentType,
          mime: contentType,
          sizeBytes: file.size,
          purpose: "WALL_PHOTO",
        });

        await uploadFileToPresignedUrl(presign, file);

        const previewUrl =
          presign.publicUrl ??
          presign.url ??
          `https://cdn.givvly.store/${presign.key}`;
        nextUploaded.push({
          name: file.name,
          url: previewUrl,
          type:
            presign.kind ?? (file.type.startsWith("video/") ? "VIDEO" : "IMAGE"),
        });
      }
      setPhotos((prev) => [...prev, ...nextUploaded]);
    } catch (err) {
      setPhotoError(
        err instanceof Error
          ? err.message
          : "Could not upload media. Please try again."
      );
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const onSubmit = form.handleSubmit(async (values) => {
    setFlaggedNotice(null);
    try {
      const created = await createMutation.mutateAsync({
        authorName: values.authorName.trim(),
        text: values.text.trim(),
        media: photos.map((p) => ({ url: p.url, type: p.type })),
      });

      form.reset();
      setPhotos([]);
      if (created.status === "PENDING") {
        setFlaggedNotice(
          "Thank you! Your message has been received and will appear after review."
        );
      } else {
        toast.success("Your message is now on the Wall of Love.");
      }
    } catch (err) {
      if (err instanceof ApiClientError && err.code === "CONTENT_FLAGGED") {
        form.reset();
        setPhotos([]);
        setFlaggedNotice(
          "Thank you! Your message has been received and will appear after review."
        );
        return;
      }
      toast.error(
        err instanceof Error
          ? err.message
          : "Could not post your message. Check your connection and try again."
      );
    }
  });

  const posts = wallQuery.data ?? [];
  const [page, setPage] = useState(1);

  const PAGE_SIZE = 8;
  const totalPages = Math.max(1, Math.ceil(posts.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginatedPosts = posts.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  return (
    <section className="space-y-6" aria-labelledby="wall-of-love-heading">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Heart className="h-5 w-5 text-primary" aria-hidden="true" />
          <h2
            id="wall-of-love-heading"
            className="font-heading text-xl font-semibold text-foreground"
          >
            Wall of love
          </h2>
        </div>
        <span className="text-xs text-muted-foreground">
          {posts.length} {posts.length === 1 ? "message" : "messages"}
        </span>
      </div>

      <Card className="shadow-none">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            Leave a note for {ownerFirstName}
          </CardTitle>
          <CardDescription>
            Share your wishes and up to 3 celebration photos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            {flaggedNotice ? (
              <div
                role="status"
                aria-live="polite"
                className="rounded-control border border-border bg-muted/50 p-3 text-xs text-foreground"
              >
                {flaggedNotice}
              </div>
            ) : null}

            <div className="space-y-1.5">
              <Label htmlFor="wall-author-name">Your name</Label>
              <Input
                id="wall-author-name"
                maxLength={60}
                {...form.register("authorName")}
                aria-describedby={
                  form.formState.errors.authorName
                    ? "wall-author-error"
                    : undefined
                }
              />
              {form.formState.errors.authorName ? (
                <p
                  id="wall-author-error"
                  className="text-xs text-destructive"
                  role="alert"
                >
                  {form.formState.errors.authorName.message}
                </p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="wall-message-text">Your message</Label>
                <span className="text-xs text-muted-foreground">
                  {(watchedText ?? "").length}/500
                </span>
              </div>
              <Textarea
                id="wall-message-text"
                rows={3}
                maxLength={500}
                {...form.register("text")}
                aria-describedby={
                  form.formState.errors.text
                    ? "wall-text-error"
                    : showProfanityWarning
                      ? "wall-profanity-warning"
                      : undefined
                }
              />
              {form.formState.errors.text ? (
                <p
                  id="wall-text-error"
                  className="text-xs text-destructive"
                  role="alert"
                >
                  {form.formState.errors.text.message}
                </p>
              ) : null}

              {showProfanityWarning ? (
                <div
                  id="wall-profanity-warning"
                  role="status"
                  className="flex items-start gap-2 rounded-control border border-warning/40 bg-warning/10 p-2.5 text-xs text-foreground"
                >
                  <AlertTriangle
                    className="mt-0.5 h-4 w-4 shrink-0 text-warning"
                    aria-hidden="true"
                  />
                  <span>
                    Please keep messages celebratory. Messages flagged by our
                    filter are held for review before appearing publicly.
                  </span>
                </div>
              ) : null}
            </div>

            {/* Optional photo upload (up to 3 photos, JPG/PNG/WebP, max 8 MB) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label
                  htmlFor="wall-photo-input"
                  className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                >
                  <ImagePlus className="h-4 w-4" aria-hidden="true" />
                  <span>
                    Add photos or videos ({photos.length}/{MAX_WALL_PHOTOS}, photos max 8 MB, videos max 50 MB)
                  </span>
                </Label>
                <input
                  id="wall-photo-input"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
                  multiple
                  disabled={
                    isUploadingPhoto || photos.length >= MAX_WALL_PHOTOS
                  }
                  className="sr-only"
                  onChange={(e) => {
                    void handlePhotoFiles(e.target.files);
                    e.currentTarget.value = "";
                  }}
                />
              </div>

              {photoError ? (
                <p className="text-xs text-destructive" role="alert">
                  {photoError}
                </p>
              ) : null}

              {photos.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {photos.map((photo, idx) => (
                    <div
                      key={`${photo.name}_${idx}`}
                      className="flex items-center gap-1.5 rounded-control border border-border bg-muted/40 px-2.5 py-1 text-xs"
                    >
                      <span className="max-w-36 truncate text-foreground">
                        {photo.name}
                      </span>
                      <button
                        type="button"
                        aria-label={`Remove ${photo.name}`}
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() =>
                          setPhotos((prev) => prev.filter((_, i) => i !== idx))
                        }
                      >
                        <X className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            <Button
              type="submit"
              size="sm"
              disabled={createMutation.isPending || isUploadingPhoto}
            >
              <MessageSquarePlus className="h-4 w-4" aria-hidden="true" />
              <span>
                {createMutation.isPending ? "Posting..." : "Post message"}
              </span>
            </Button>
          </form>
        </CardContent>
      </Card>

      {posts.length === 0 ? (
        <EmptyState
          title="No messages yet"
          description={`Be the first to leave a wish for ${ownerFirstName}.`}
        />
      ) : (
        <div className="space-y-4">
          <div className="space-y-3">
            {paginatedPosts.map((post) => (
              <WallPostCard key={post.id} post={post} mode="public" />
            ))}
          </div>

          <PaginationBar
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={posts.length}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
            itemName="wishes"
          />
        </div>
      )}
    </section>
  );
}

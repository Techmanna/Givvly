"use client";

import * as React from "react";
import { useDropzone, type FileRejection } from "react-dropzone";
import { Film, ImagePlus, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  isVideoMediaUrl,
  validateClientMediaFile,
} from "@/features/events/api";
import { cn } from "@/lib/cn";

const ALLOWED_IMAGE_MIME: Record<string, string[]> = {
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
  "image/gif": [".gif"],
};

const ALLOWED_VIDEO_MIME: Record<string, string[]> = {
  "video/mp4": [".mp4"],
  "video/webm": [".webm"],
  "video/quicktime": [".mov"],
};

export type FileDropzoneProps = {
  maxSizeBytes?: number;
  maxVideoSizeBytes?: number;
  allowVideo?: boolean;
  previewUrl?: string;
  previewKind?: "IMAGE" | "VIDEO";
  label?: string;
  isUploading?: boolean;
  uploadProgress?: number;
  onSelectFile: (file: File) => void;
  onRemove?: () => void;
  helperText?: string;
  className?: string;
};

export function FileDropzone({
  maxSizeBytes = 10 * 1024 * 1024,
  maxVideoSizeBytes = 50 * 1024 * 1024,
  allowVideo = true,
  previewUrl,
  previewKind,
  label,
  isUploading = false,
  uploadProgress = 0,
  onSelectFile,
  onRemove,
  helperText,
  className,
}: FileDropzoneProps) {
  const [rejectionMessage, setRejectionMessage] = React.useState<string | null>(
    null
  );
  const [selectedMime, setSelectedMime] = React.useState<string | null>(null);

  const defaultHelperText = allowVideo
    ? `JPG, PNG, WebP, GIF up to ${Math.round(
        maxSizeBytes / (1024 * 1024)
      )} MB or MP4, WebM, MOV video up to ${Math.round(
        maxVideoSizeBytes / (1024 * 1024)
      )} MB`
    : `JPG, PNG, WebP or GIF up to ${Math.round(
        maxSizeBytes / (1024 * 1024)
      )} MB`;

  const resolvedHelperText = helperText ?? defaultHelperText;
  const effectiveMaxDropzoneSize = allowVideo
    ? Math.max(maxSizeBytes, maxVideoSizeBytes)
    : maxSizeBytes;

  const onDrop = React.useCallback(
    async (acceptedFiles: File[], rejections: FileRejection[]) => {
      setRejectionMessage(null);
      if (rejections.length > 0) {
        const firstErr = rejections[0]?.errors[0];
        if (firstErr?.code === "file-too-large") {
          setRejectionMessage(
            `File exceeds the ${Math.round(
              effectiveMaxDropzoneSize / (1024 * 1024)
            )} MB maximum size.`
          );
        } else if (firstErr?.code === "file-invalid-type") {
          setRejectionMessage(
            allowVideo
              ? "Only JPG, PNG, WebP, GIF images and MP4, WebM, MOV videos are allowed."
              : "Only JPG, PNG, WebP, and GIF images are allowed."
          );
        } else {
          setRejectionMessage(
            firstErr?.message ?? "Could not accept that file."
          );
        }
        return;
      }

      const file = acceptedFiles[0];
      if (!file) return;

      try {
        await validateClientMediaFile(file, {
          allowVideo,
          maxImageBytes: maxSizeBytes,
          maxVideoBytes: maxVideoSizeBytes,
        });
        setSelectedMime(file.type);
        onSelectFile(file);
      } catch (err) {
        setRejectionMessage(
          err instanceof Error ? err.message : "Invalid media file selected."
        );
      }
    },
    [
      allowVideo,
      effectiveMaxDropzoneSize,
      maxSizeBytes,
      maxVideoSizeBytes,
      onSelectFile,
    ]
  );

  const acceptMap = React.useMemo(
    () =>
      allowVideo
        ? { ...ALLOWED_IMAGE_MIME, ...ALLOWED_VIDEO_MIME }
        : ALLOWED_IMAGE_MIME,
    [allowVideo]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: acceptMap,
    maxSize: effectiveMaxDropzoneSize,
    maxFiles: 1,
    disabled: isUploading,
  });

  const isPreviewVideo = isVideoMediaUrl(
    previewUrl,
    previewKind ?? selectedMime
  );

  return (
    <div className={cn("space-y-2", className)}>
      {previewUrl ? (
        <div className="relative overflow-hidden rounded-card border border-border bg-muted">
          {isPreviewVideo ? (
            <video
              src={previewUrl}
              controls
              preload="metadata"
              playsInline
              className="aspect-[2/1] w-full object-cover"
            />
          ) : (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={previewUrl}
              alt="Media preview"
              className="aspect-[2/1] w-full object-cover"
            />
          )}
          {onRemove && !isUploading ? (
            <div className="absolute right-3 top-3">
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => {
                  setSelectedMime(null);
                  setRejectionMessage(null);
                  onRemove();
                }}
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                <span>Remove</span>
              </Button>
            </div>
          ) : null}
        </div>
      ) : (
        <div
          {...getRootProps()}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center rounded-card border-2 border-dashed border-border bg-card/60 p-8 text-center transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
            isDragActive && "border-primary bg-primary/5",
            isUploading && "pointer-events-none opacity-60"
          )}
        >
          <input
            {...getInputProps()}
            aria-label={
              label ??
              (allowVideo
                ? "Upload image or video"
                : "Upload cover image")
            }
          />
          {isUploading ? (
            <Loader2
              className="h-8 w-8 animate-spin text-primary"
              aria-hidden="true"
            />
          ) : (
            <div className="flex items-center gap-2 text-muted-foreground">
              <ImagePlus className="h-8 w-8" aria-hidden="true" />
              {allowVideo ? (
                <Film className="h-6 w-6 opacity-75" aria-hidden="true" />
              ) : null}
            </div>
          )}
          <p className="mt-2 text-sm font-medium text-foreground">
            {isDragActive
              ? allowVideo
                ? "Drop your image or video here"
                : "Drop your image here"
              : label ??
                (allowVideo
                  ? "Tap or drag to upload image or video"
                  : "Tap or drag to upload cover image")}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {resolvedHelperText}
          </p>
        </div>
      )}

      {isUploading ? (
        <div className="space-y-1" aria-live="polite">
          <Progress value={uploadProgress} />
          <p className="text-xs text-muted-foreground">
            Uploading media ({uploadProgress}%)...
          </p>
        </div>
      ) : null}

      {rejectionMessage ? (
        <p role="alert" className="text-xs font-medium text-destructive">
          {rejectionMessage}
        </p>
      ) : null}
    </div>
  );
}


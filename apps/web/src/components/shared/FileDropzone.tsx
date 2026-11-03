"use client";

import * as React from "react";
import { useDropzone, type FileRejection } from "react-dropzone";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/cn";

const ALLOWED_IMAGE_MIME = {
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
};

export type FileDropzoneProps = {
  maxSizeBytes?: number;
  previewUrl?: string;
  isUploading?: boolean;
  uploadProgress?: number;
  onSelectFile: (file: File) => void;
  onRemove?: () => void;
  helperText?: string;
  className?: string;
};

export function FileDropzone({
  maxSizeBytes = 5 * 1024 * 1024,
  previewUrl,
  isUploading = false,
  uploadProgress = 0,
  onSelectFile,
  onRemove,
  helperText = "JPG, PNG or WebP up to 5 MB (1200x600 px recommended)",
  className,
}: FileDropzoneProps) {
  const [rejectionMessage, setRejectionMessage] = React.useState<string | null>(
    null
  );

  const onDrop = React.useCallback(
    (acceptedFiles: File[], rejections: FileRejection[]) => {
      setRejectionMessage(null);
      if (rejections.length > 0) {
        const firstErr = rejections[0]?.errors[0];
        if (firstErr?.code === "file-too-large") {
          setRejectionMessage(
            `File exceeds the ${Math.round(maxSizeBytes / (1024 * 1024))} MB maximum size. Choose a smaller image.`
          );
        } else if (firstErr?.code === "file-invalid-type") {
          setRejectionMessage(
            "Only JPG, PNG, and WebP images are allowed."
          );
        } else {
          setRejectionMessage(
            firstErr?.message ?? "Could not accept that file."
          );
        }
        return;
      }

      const file = acceptedFiles[0];
      if (file) {
        onSelectFile(file);
      }
    },
    [maxSizeBytes, onSelectFile]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ALLOWED_IMAGE_MIME,
    maxSize: maxSizeBytes,
    maxFiles: 1,
    disabled: isUploading,
  });

  return (
    <div className={cn("space-y-2", className)}>
      {previewUrl ? (
        <div className="relative overflow-hidden rounded-card border border-border bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt="Cover preview"
            className="aspect-[2/1] w-full object-cover"
          />
          {onRemove && !isUploading ? (
            <div className="absolute right-3 top-3">
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={onRemove}
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
          <input {...getInputProps()} aria-label="Upload cover image" />
          {isUploading ? (
            <Loader2
              className="h-8 w-8 animate-spin text-primary"
              aria-hidden="true"
            />
          ) : (
            <ImagePlus
              className="h-8 w-8 text-muted-foreground"
              aria-hidden="true"
            />
          )}
          <p className="mt-2 text-sm font-medium text-foreground">
            {isDragActive
              ? "Drop your image here"
              : "Tap or drag to upload cover image"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{helperText}</p>
        </div>
      )}

      {isUploading ? (
        <div className="space-y-1" aria-live="polite">
          <Progress value={uploadProgress} />
          <p className="text-xs text-muted-foreground">
            Uploading cover image ({uploadProgress}%)...
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


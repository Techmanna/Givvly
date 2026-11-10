import { api } from "@/lib/api-client";
import type {
  AllowedMediaMimeType,
  Bank,
  CompleteUploadResponse,
  CreateEventRequest,
  EventDetail,
  EventStats,
  EventSummary,
  InviteTemplateData,
  KeepsakeSummary,
  MediaUploadPurpose,
  PayoutAccount,
  PresignUploadRequest,
  PresignUploadResponse,
  PublicEvent,
  ResolvedBankAccount,
  UpdateEventRequest,
} from "./types";

export function fetchMyEvents(): Promise<EventSummary[]> {
  return api<EventSummary[]>("/events");
}

export function fetchEventDetail(id: string): Promise<EventDetail> {
  return api<EventDetail>(`/events/${encodeURIComponent(id)}`);
}

export function fetchEventStats(id: string): Promise<EventStats> {
  return api<EventStats>(`/events/${encodeURIComponent(id)}/stats`);
}

export function createEvent(payload: CreateEventRequest): Promise<EventDetail> {
  return api<EventDetail>("/events", {
    method: "POST",
    body: payload,
  });
}

export function updateEventInvite(
  id: string,
  template: InviteTemplateData
): Promise<EventDetail> {
  return api<EventDetail>(`/events/${encodeURIComponent(id)}/invite`, {
    method: "PUT",
    body: template,
  });
}

export function publishEvent(id: string): Promise<EventDetail> {
  return api<EventDetail>(`/events/${encodeURIComponent(id)}/publish`, {
    method: "POST",
  });
}

export function updateEventSettings(
  id: string,
  payload: UpdateEventRequest
): Promise<EventDetail> {
  return api<EventDetail>(`/events/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: payload,
  });
}

export function fetchEventSummary(id: string): Promise<KeepsakeSummary> {
  return api<KeepsakeSummary>(`/events/${encodeURIComponent(id)}/summary`);
}

export function updateEventSummary(
  id: string,
  keepsakePublished: boolean
): Promise<KeepsakeSummary> {
  return api<KeepsakeSummary>(`/events/${encodeURIComponent(id)}/summary`, {
    method: "PATCH",
    body: { keepsakePublished },
  });
}

export const ALLOWED_CLIENT_IMAGE_MIMES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

export const ALLOWED_CLIENT_VIDEO_MIMES = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
] as const;

export const ALLOWED_CLIENT_MEDIA_MIMES = [
  ...ALLOWED_CLIENT_IMAGE_MIMES,
  ...ALLOWED_CLIENT_VIDEO_MIMES,
] as const;

const DISALLOWED_FILE_EXTENSIONS = /\.(svg|svgz|html|htm|xhtml|js|mjs|cjs|ts|tsx|php|phtml|sh|bat|cmd|exe|dll|jsp|asp|aspx|xml)$/i;
const SCRIPT_POLYGLOT_PATTERNS = [
  /<script\b/i,
  /javascript:/i,
  /vbscript:/i,
  /<\?php/i,
  /<!doctype\s+html/i,
  /<html\b/i,
  /<svg\b/i,
  /onload\s*=/i,
  /onerror\s*=/i,
];

export function isVideoMediaUrl(
  url?: string | null,
  mimeOrKind?: string | null
): boolean {
  if (mimeOrKind === "VIDEO" || mimeOrKind?.startsWith("video/")) {
    return true;
  }
  if (!url) return false;
  return /\.(mp4|webm|mov)(\?.*|#.*)?$/i.test(url);
}

/**
 * Validates a client File before initiating any upload:
 * - Blocks null bytes, control chars, and executable/script/SVG extensions
 * - Enforces strict MIME allowlist (JPEG, PNG, WebP, GIF, MP4, WebM, MOV)
 * - Enforces image and video byte-size limits
 * - Scans file header for embedded script/SVG/HTML polyglot payloads
 */
export async function validateClientMediaFile(
  file: File,
  options?: {
    allowVideo?: boolean;
    maxImageBytes?: number;
    maxVideoBytes?: number;
  }
): Promise<void> {
  const allowVideo = options?.allowVideo ?? true;
  const maxImageBytes = options?.maxImageBytes ?? 10 * 1024 * 1024;
  const maxVideoBytes = options?.maxVideoBytes ?? 50 * 1024 * 1024;

  if (!file || file.size <= 0) {
    throw new Error("Selected file is empty.");
  }

  if (/[\u0000-\u001F\u007F]/.test(file.name)) {
    throw new Error("File name contains invalid control characters.");
  }

  if (DISALLOWED_FILE_EXTENSIONS.test(file.name)) {
    throw new Error(
      "Executable, script, HTML, and SVG files are strictly prohibited."
    );
  }

  const mime = file.type as AllowedMediaMimeType;
  const isImage = (ALLOWED_CLIENT_IMAGE_MIMES as readonly string[]).includes(mime);
  const isVideo = (ALLOWED_CLIENT_VIDEO_MIMES as readonly string[]).includes(mime);

  if (!isImage && !isVideo) {
    throw new Error(
      allowVideo
        ? "Only JPG, PNG, WebP, GIF images and MP4, WebM, MOV videos are allowed."
        : "Only JPG, PNG, WebP, and GIF images are allowed."
    );
  }

  if (isVideo && !allowVideo) {
    throw new Error("Video files are not allowed for this field.");
  }

  const maxBytes = isVideo ? maxVideoBytes : maxImageBytes;
  if (file.size > maxBytes) {
    throw new Error(
      `File exceeds the ${Math.round(maxBytes / (1024 * 1024))} MB maximum size limit.`
    );
  }

  if (typeof file.slice === "function") {
    try {
      const headSlice = file.slice(0, Math.min(file.size, 512));
      if (typeof headSlice.text === "function") {
        const textSample = await headSlice.text();
        for (const pattern of SCRIPT_POLYGLOT_PATTERNS) {
          if (pattern.test(textSample)) {
            throw new Error(
              "File rejected: detected embedded script or markup signature."
            );
          }
        }
      }
    } catch (err) {
      if (
        err instanceof Error &&
        err.message.includes("detected embedded script")
      ) {
        throw err;
      }
    }
  }
}

export function requestUploadPresign(
  payload: PresignUploadRequest
): Promise<PresignUploadResponse> {
  return api<PresignUploadResponse>("/uploads/presign", {
    method: "POST",
    body: {
      ...payload,
      mime: payload.mime ?? payload.contentType,
      contentType: payload.contentType ?? payload.mime,
    },
  });
}

export function completeMediaUpload(
  mediaId: string
): Promise<CompleteUploadResponse> {
  return api<CompleteUploadResponse>(
    `/uploads/${encodeURIComponent(mediaId)}/complete`,
    {
      method: "POST",
    }
  );
}

/**
 * Uploads a file directly to storage using the presigned URL (PUT binary or POST fields)
 * and reports progress (0 to 100). Automatically marks the media record READY if mediaId is present.
 */
export async function uploadFileToPresignedUrl(
  presign: PresignUploadResponse,
  file: File,
  onProgress?: (percent: number) => void
): Promise<void> {
  await validateClientMediaFile(file);

  if (presign.uploadUrl.startsWith("mock://")) {
    await new Promise<void>((resolve) => {
      onProgress?.(45);
      setTimeout(() => {
        onProgress?.(100);
        resolve();
      }, 150);
    });
    if (presign.mediaId) {
      try {
        await completeMediaUpload(presign.mediaId);
      } catch {
        // Ignore in isolated mock tests that only stub /uploads/presign
      }
    }
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const isFormPost =
      presign.method === "POST" ||
      Boolean(presign.fields && Object.keys(presign.fields).length > 0);

    xhr.open(isFormPost ? "POST" : "PUT", presign.uploadUrl);

    if (!isFormPost) {
      if (presign.headers) {
        for (const [headerName, headerVal] of Object.entries(presign.headers)) {
          xhr.setRequestHeader(headerName, headerVal);
        }
      } else if (file.type) {
        xhr.setRequestHeader("Content-Type", file.type);
      }
    }

    if (onProgress && xhr.upload) {
      xhr.upload.onprogress = (evt) => {
        if (evt.lengthComputable && evt.total > 0) {
          const pct = Math.min(100, Math.round((evt.loaded / evt.total) * 100));
          onProgress(pct);
        }
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(100);
        resolve();
      } else {
        reject(new Error(`Upload failed with status ${xhr.status}`));
      }
    };

    xhr.onerror = () => {
      reject(new Error("Network error while uploading file"));
    };

    if (isFormPost && presign.fields) {
      const formData = new FormData();
      for (const [k, v] of Object.entries(presign.fields)) {
        formData.append(k, v);
      }
      formData.append("file", file);
      xhr.send(formData);
    } else {
      xhr.send(file);
    }
  });

  if (presign.mediaId) {
    await completeMediaUpload(presign.mediaId);
  }
}

/**
 * Full end-to-end file upload workflow:
 * 1. Validates file MIME, extension, size, and header safety on the client
 * 2. Requests a presigned upload session from the backend File Management Service
 * 3. Uploads the binary to the active storage provider (Disk, S3, or Cloudinary)
 * 4. Completes the upload and returns the canonical URL, storage key, and media kind
 */
export async function uploadMediaFile(
  file: File,
  purpose: MediaUploadPurpose,
  onProgress?: (percent: number) => void
): Promise<{
  mediaId?: string;
  key: string;
  url: string;
  kind: "IMAGE" | "VIDEO";
}> {
  await validateClientMediaFile(file, {
    allowVideo: purpose !== "AVATAR",
  });

  const mime = (file.type || "image/jpeg") as AllowedMediaMimeType;
  const presigned = await requestUploadPresign({
    fileName: file.name,
    contentType: mime,
    mime,
    sizeBytes: file.size,
    purpose,
  });

  await uploadFileToPresignedUrl(presigned, file, onProgress);

  const kind: "IMAGE" | "VIDEO" =
    presigned.kind ?? (mime.startsWith("video/") ? "VIDEO" : "IMAGE");
  const resolvedUrl =
    presigned.publicUrl ||
    presigned.url ||
    `https://cdn.givvly.store/${presigned.key}`;

  return {
    mediaId: presigned.mediaId,
    key: presigned.key,
    url: resolvedUrl,
    kind,
  };
}

export function fetchPublicEvent(slug: string): Promise<PublicEvent> {
  return api<PublicEvent>(`/public/events/${encodeURIComponent(slug)}`);
}

export function fetchPublicEventsList(filters?: {
  type?: string;
  q?: string;
}): Promise<PublicEvent[]> {
  const qs = new URLSearchParams();
  if (filters?.type) qs.set("type", filters.type);
  if (filters?.q) qs.set("q", filters.q);
  const query = qs.toString();
  return api<PublicEvent[]>(query ? `/public/events?${query}` : "/public/events");
}

export function unlockPrivateEvent(
  slug: string,
  accessCode: string
): Promise<{ unlocked: boolean }> {
  return api<{ unlocked: boolean }>(
    `/public/events/${encodeURIComponent(slug)}/unlock`,
    {
      method: "POST",
      body: { accessCode },
    }
  );
}

export function fetchBanks(): Promise<Bank[]> {
  return api<Bank[]>("/banks");
}

export function fetchPayoutAccount(): Promise<PayoutAccount | null> {
  return api<PayoutAccount | null>("/payout-accounts");
}

export function resolveBankAccount(payload: {
  bankCode: string;
  accountNumber: string;
}): Promise<ResolvedBankAccount> {
  return api<ResolvedBankAccount>("/payout-accounts/resolve", {
    method: "POST",
    body: payload,
  });
}

export function savePayoutAccount(payload: {
  bankCode: string;
  accountNumber: string;
  accountName: string;
  confirmedOwnership: boolean;
}): Promise<PayoutAccount> {
  return api<PayoutAccount>("/payout-accounts", {
    method: "POST",
    body: payload,
  });
}


import { api } from "@/lib/api-client";
import type {
  Bank,
  CreateEventRequest,
  EventDetail,
  EventStats,
  EventSummary,
  InviteTemplateData,
  KeepsakeSummary,
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

export function requestUploadPresign(
  payload: PresignUploadRequest
): Promise<PresignUploadResponse> {
  return api<PresignUploadResponse>("/uploads/presign", {
    method: "POST",
    body: payload,
  });
}

/**
 * Uploads a file directly to storage using the presigned URL (PUT binary or POST fields)
 * and reports progress (0 to 100).
 */
export function uploadFileToPresignedUrl(
  presign: PresignUploadResponse,
  file: File,
  onProgress?: (percent: number) => void
): Promise<void> {
  if (presign.uploadUrl.startsWith("mock://")) {
    return new Promise((resolve) => {
      onProgress?.(45);
      setTimeout(() => {
        onProgress?.(100);
        resolve();
      }, 150);
    });
  }

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const isFormPost =
      presign.fields && Object.keys(presign.fields).length > 0;

    xhr.open(isFormPost ? "POST" : "PUT", presign.uploadUrl);

    if (!isFormPost && file.type) {
      xhr.setRequestHeader("Content-Type", file.type);
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


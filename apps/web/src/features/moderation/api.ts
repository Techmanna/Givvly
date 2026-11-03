import { api } from "@/lib/api-client";
import type { PresignUploadRequest, PresignUploadResponse } from "@givvly/contracts";
import type {
  CreateReportRequest,
  CreateWallPostRequest,
  WallModerationPatch,
  WallPost,
} from "./types";

export function presignWallPhoto(
  payload: PresignUploadRequest
): Promise<PresignUploadResponse> {
  return api<PresignUploadResponse>("/uploads/presign", {
    method: "POST",
    body: payload,
  });
}

export function fetchPublicWall(slug: string): Promise<WallPost[]> {
  return api<WallPost[]>(`/public/events/${encodeURIComponent(slug)}/wall`);
}

export function createWallPost(
  slug: string,
  payload: CreateWallPostRequest
): Promise<WallPost> {
  return api<WallPost>(`/public/events/${encodeURIComponent(slug)}/wall`, {
    method: "POST",
    body: payload,
  });
}

export function fetchOwnerWall(eventId: string): Promise<WallPost[]> {
  return api<WallPost[]>(`/events/${encodeURIComponent(eventId)}/wall`);
}

export function moderateWallPost(
  eventId: string,
  postId: string,
  status: WallModerationPatch["status"]
): Promise<WallPost> {
  return api<WallPost>(
    `/events/${encodeURIComponent(eventId)}/wall/${encodeURIComponent(postId)}`,
    {
      method: "PATCH",
      body: { status },
    }
  );
}

export function submitContentReport(
  payload: CreateReportRequest
): Promise<{ id: string; status: string }> {
  return api<{ id: string; status: string }>("/reports", {
    method: "POST",
    body: payload,
  });
}


"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createWallPost,
  fetchOwnerWall,
  fetchPublicWall,
  moderateWallPost,
  submitContentReport,
} from "../api";
import { moderationKeys } from "../keys";
import type {
  CreateReportRequest,
  CreateWallPostRequest,
  WallModerationPatch,
  WallPost,
} from "../types";

export function usePublicWall(slug: string, initialData?: WallPost[]) {
  return useQuery({
    queryKey: moderationKeys.publicWall(slug),
    queryFn: () => fetchPublicWall(slug),
    refetchInterval: 30_000,
    initialData,
  });
}

export function useCreateWallPostMutation(slug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateWallPostRequest) =>
      createWallPost(slug, payload),
    onSuccess: (created) => {
      if (created.status === "VISIBLE") {
        queryClient.setQueryData<WallPost[]>(
          moderationKeys.publicWall(slug),
          (old = []) => [created, ...old]
        );
      }
      queryClient.invalidateQueries({
        queryKey: moderationKeys.publicWall(slug),
      });
    },
  });
}

export function useOwnerWall(eventId: string) {
  return useQuery({
    queryKey: moderationKeys.ownerWall(eventId),
    queryFn: () => fetchOwnerWall(eventId),
    refetchInterval: 15_000,
  });
}

export function useModerateWallPostMutation(
  eventId: string,
  eventSlug?: string
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      postId,
      status,
    }: {
      postId: string;
      status: WallModerationPatch["status"];
    }) => moderateWallPost(eventId, postId, status),
    onMutate: async ({ postId, status }) => {
      await queryClient.cancelQueries({
        queryKey: moderationKeys.ownerWall(eventId),
      });
      const previousOwner = queryClient.getQueryData<WallPost[]>(
        moderationKeys.ownerWall(eventId)
      );

      queryClient.setQueryData<WallPost[]>(
        moderationKeys.ownerWall(eventId),
        (old = []) => {
          if (status === "REMOVED") {
            return old.filter((p) => p.id !== postId);
          }
          return old.map((p) => (p.id === postId ? { ...p, status } : p));
        }
      );

      return { previousOwner };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousOwner) {
        queryClient.setQueryData(
          moderationKeys.ownerWall(eventId),
          context.previousOwner
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: moderationKeys.ownerWall(eventId),
      });
      if (eventSlug) {
        queryClient.invalidateQueries({
          queryKey: moderationKeys.publicWall(eventSlug),
        });
      }
    },
  });
}

export function useReportContentMutation() {
  return useMutation({
    mutationFn: (payload: CreateReportRequest) => submitContentReport(payload),
  });
}


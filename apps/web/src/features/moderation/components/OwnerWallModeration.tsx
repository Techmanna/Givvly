"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useModerateWallPostMutation,
  useOwnerWall,
} from "../hooks/useWall";
import type { WallModerationPatch, WallPost, WallPostStatus } from "../types";
import { WallPostCard } from "./WallPostCard";

export type OwnerWallModerationProps = {
  eventId: string;
  eventSlug?: string;
};

type FilterTab = "ALL" | Extract<WallPostStatus, "VISIBLE" | "PENDING" | "HIDDEN">;

export function OwnerWallModeration({
  eventId,
  eventSlug,
}: OwnerWallModerationProps) {
  const [filter, setFilter] = useState<FilterTab>("ALL");
  const [postToDelete, setPostToDelete] = useState<WallPost | null>(null);

  const wallQuery = useOwnerWall(eventId);
  const moderateMutation = useModerateWallPostMutation(eventId, eventSlug);

  const handleModerate = (
    postId: string,
    status: WallModerationPatch["status"]
  ) => {
    moderateMutation.mutate(
      { postId, status },
      {
        onSuccess: () => {
          if (status === "HIDDEN") {
            toast.success("Message hidden from public wall.");
          } else if (status === "VISIBLE") {
            toast.success("Message is now visible on your wall.");
          } else if (status === "REMOVED") {
            toast.success("Message deleted.");
          }
        },
        onError: () => {
          toast.error("Could not update message status. Please try again.");
        },
      }
    );
  };

  if (wallQuery.isLoading) {
    return (
      <div className="space-y-3" aria-busy="true">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (wallQuery.isError) {
    return (
      <ErrorState
        title="Could not load wall messages"
        description="Check your connection and try again."
        onRetry={() => wallQuery.refetch()}
      />
    );
  }

  const allPosts = wallQuery.data ?? [];
  const filteredPosts =
    filter === "ALL"
      ? allPosts
      : allPosts.filter((p) => p.status === filter);

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="font-heading text-xl font-semibold text-foreground">
            Wall of love moderation
          </h2>
          <p className="text-sm text-muted-foreground">
            Show, hide, or remove messages left by guests on your event page.
          </p>
        </div>

        <Tabs
          value={filter}
          onValueChange={(v) => setFilter(v as FilterTab)}
        >
          <TabsList>
            <TabsTrigger value="ALL">All ({allPosts.length})</TabsTrigger>
            <TabsTrigger value="VISIBLE">
              Visible ({allPosts.filter((p) => p.status === "VISIBLE").length})
            </TabsTrigger>
            <TabsTrigger value="PENDING">
              Pending ({allPosts.filter((p) => p.status === "PENDING").length})
            </TabsTrigger>
            <TabsTrigger value="HIDDEN">
              Hidden ({allPosts.filter((p) => p.status === "HIDDEN").length})
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {filteredPosts.length === 0 ? (
        <EmptyState
          title="No messages in this view"
          description="Share your event link so guests can leave their wishes."
        />
      ) : (
        <div className="space-y-3">
          {filteredPosts.map((post) => (
            <WallPostCard
              key={post.id}
              post={post}
              mode="owner"
              isModerating={moderateMutation.isPending}
              onModerate={handleModerate}
              onRequestDelete={(target) => setPostToDelete(target)}
            />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(postToDelete)}
        onOpenChange={(open) => {
          if (!open) setPostToDelete(null);
        }}
        title="Delete this message?"
        description={
          postToDelete
            ? `Remove the message from ${postToDelete.authorName}? This removes it from your event wall.`
            : ""
        }
        confirmLabel="Delete message"
        variant="destructive"
        isPending={moderateMutation.isPending}
        onConfirm={() => {
          if (!postToDelete) return;
          handleModerate(postToDelete.id, "REMOVED");
          setPostToDelete(null);
        }}
      />
    </div>
  );
}


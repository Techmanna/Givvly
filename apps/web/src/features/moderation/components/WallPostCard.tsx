"use client";

import { useState } from "react";
import {
  Crown,
  Eye,
  EyeOff,
  Flag,
  Maximize2,
  Play,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MediaLightboxModal } from "@/components/shared/MediaLightboxModal";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { isVideoMediaUrl } from "@/features/events/api";
import { formatDate } from "@/lib/format";
import type { WallModerationPatch, WallPost } from "../types";
import { ReportDialog } from "./ReportDialog";

export type WallPostCardProps = {
  post: WallPost;
  mode?: "public" | "owner";
  isModerating?: boolean;
  onModerate?: (
    postId: string,
    status: WallModerationPatch["status"]
  ) => void;
  onRequestDelete?: (post: WallPost) => void;
};

export function WallPostCard({
  post,
  mode = "public",
  isModerating = false,
  onModerate,
  onRequestDelete,
}: WallPostCardProps) {
  const [reportOpen, setReportOpen] = useState(false);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);

  return (
    <>
      <Card className="shadow-none">
        <CardContent className="space-y-2.5 p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <p className="text-sm font-semibold text-foreground">
                  {post.authorName}
                </p>
                {post.isHost && (
                  <Badge
                    variant="outline"
                    className="border-primary/30 bg-primary/10 text-primary text-[10px] font-semibold px-1.5 py-0 inline-flex items-center gap-1"
                  >
                    <Crown className="h-2.5 w-2.5 text-primary" />
                    Host
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {formatDate(post.createdAt, "d MMM yyyy, h:mm a")}
              </p>
            </div>

            {mode === "owner" ? (
              <StatusBadge status={post.status} />
            ) : (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                aria-label={`Report message from ${post.authorName}`}
                onClick={() => setReportOpen(true)}
              >
                <Flag className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Report</span>
              </Button>
            )}
          </div>

          {post.text ? (
            <p className="whitespace-pre-line text-sm leading-relaxed text-foreground">
              {post.text}
            </p>
          ) : null}

          {post.media.length > 0 ? (
            <div className="grid grid-cols-3 gap-2 pt-1">
              {post.media.map((item, idx) => {
                const isVideo = isVideoMediaUrl(item.url, item.type);
                return (
                  <button
                    key={`${post.id}_media_${idx}`}
                    type="button"
                    onClick={() => setPreviewIndex(idx)}
                    aria-label={`Preview ${isVideo ? "video" : "photo"} ${idx + 1} from ${post.authorName}`}
                    className="group relative overflow-hidden rounded-control border border-border bg-muted/40 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    {isVideo ? (
                      <>
                        <video
                          src={item.url}
                          preload="metadata"
                          muted
                          playsInline
                          className="pointer-events-none h-24 w-full object-cover transition-transform duration-200 group-hover:scale-105"
                        />
                        <span className="absolute inset-0 flex items-center justify-center bg-black/25 transition-colors group-hover:bg-black/40">
                          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-background/90 text-foreground shadow-sm">
                            <Play className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
                          </span>
                        </span>
                      </>
                    ) : (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={item.url}
                          alt={`Photo ${idx + 1} from ${post.authorName}`}
                          className="h-24 w-full object-cover transition-transform duration-200 group-hover:scale-105"
                          loading="lazy"
                        />
                        <span className="pointer-events-none absolute right-1.5 top-1.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-black/55 text-white opacity-0 transition-opacity group-hover:opacity-100">
                          <Maximize2 className="h-3 w-3" aria-hidden="true" />
                        </span>
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          ) : null}

          {mode === "owner" && onModerate ? (
            <div className="flex flex-wrap items-center gap-2 pt-2">
              {post.status !== "VISIBLE" ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={isModerating}
                  onClick={() => onModerate(post.id, "VISIBLE")}
                >
                  <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Show on wall</span>
                </Button>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={isModerating}
                  onClick={() => onModerate(post.id, "HIDDEN")}
                >
                  <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Hide</span>
                </Button>
              )}

              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="text-destructive hover:text-destructive"
                disabled={isModerating}
                onClick={() => onRequestDelete?.(post)}
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Delete</span>
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {mode === "public" ? (
        <ReportDialog
          open={reportOpen}
          onOpenChange={setReportOpen}
          postId={post.id}
          authorName={post.authorName}
        />
      ) : null}

      <MediaLightboxModal
        items={post.media.map((item, idx) => ({
          url: item.url,
          type: item.type,
          alt: `Media ${idx + 1} from ${post.authorName}`,
        }))}
        activeIndex={previewIndex}
        onClose={() => setPreviewIndex(null)}
        onIndexChange={setPreviewIndex}
        title={post.authorName}
        subtitle={formatDate(post.createdAt, "d MMM yyyy, h:mm a")}
      />
    </>
  );
}


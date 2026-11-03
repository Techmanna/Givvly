"use client";

import { useState } from "react";
import { Eye, EyeOff, Flag, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/StatusBadge";
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

  return (
    <>
      <Card className="shadow-none">
        <CardContent className="space-y-2.5 p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-foreground">
                {post.authorName}
              </p>
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
              {post.media.map((item, idx) => (
                <div
                  key={`${post.id}_media_${idx}`}
                  className="overflow-hidden rounded-control border border-border bg-muted/40"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.url}
                    alt={`Photo ${idx + 1} from ${post.authorName}`}
                    className="h-24 w-full object-cover"
                    loading="lazy"
                  />
                </div>
              ))}
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
    </>
  );
}


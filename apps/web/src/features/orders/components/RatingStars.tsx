"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/cn";
import { useSubmitOrderReview } from "../hooks/useOrders";

export type RatingStarsProps = {
  orderId: string;
  initialRating?: number;
  readOnly?: boolean;
};

export function RatingStars({
  orderId,
  initialRating = 5,
  readOnly = false,
}: RatingStarsProps) {
  const [rating, setRating] = useState<number>(initialRating);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const reviewMutation = useSubmitOrderReview(orderId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await reviewMutation.mutateAsync({
        rating,
        comment: comment.trim() || undefined,
      });
      setSubmitted(true);
      toast.success("Thank you for reviewing your gift order!");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not submit review."
      );
    }
  };

  if (readOnly || submitted) {
    return (
      <div className="space-y-1.5">
        <div
          className="flex items-center gap-1"
          aria-label={`Rated ${rating} out of 5 stars`}
        >
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              className={cn(
                "h-4 w-4",
                star <= rating
                  ? "fill-accent text-accent"
                  : "text-border"
              )}
            />
          ))}
          {submitted && (
            <span className="ml-2 text-xs text-success">Review submitted</span>
          )}
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <Label className="mb-1.5 block text-xs uppercase tracking-wider text-ink-muted">
          Rate your experience
        </Label>
        <div className="flex items-center gap-1.5">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              aria-label={`Rate ${star} star${star === 1 ? "" : "s"}`}
              className="rounded-md p-1 transition hover:scale-110 focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <Star
                className={cn(
                  "h-5 w-5",
                  star <= rating
                    ? "fill-accent text-accent"
                    : "text-border"
                )}
              />
            </button>
          ))}
          <span className="ml-2 text-xs text-ink-muted">{rating} / 5</span>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`review-comment-${orderId}`}>
          Comment (optional)
        </Label>
        <Textarea
          id={`review-comment-${orderId}`}
          rows={2}
          maxLength={500}
          placeholder="How was the gift packaging and delivery?"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
      </div>

      <Button
        type="submit"
        size="sm"
        variant="secondary"
        disabled={reviewMutation.isPending}
      >
        {reviewMutation.isPending ? "Submitting..." : "Submit review"}
      </Button>
    </form>
  );
}


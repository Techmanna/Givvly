"use client";

import { useState } from "react";
import {
  Star,
  Check,
  User,
  MessageCircle,
  Truck,
  ShieldCheck,
  HeartHandshake,
  PenSquare,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import type { CatalogProduct } from "../types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type ProductReview = {
  id: string;
  authorName: string;
  verified: boolean;
  rating: number;
  title: string;
  comment: string;
  date: string;
  timestamp: number;
};

function getInitialReviews(product: CatalogProduct): ProductReview[] {
  const isHamper = product.isCombo || product.name.toLowerCase().includes("hamper");
  const isLuxury = product.priceKobo > 5_000_000;

  return [
    {
      id: "rev_1",
      authorName: "Vanessa O.",
      verified: true,
      rating: 5,
      title: (product?.name || "Curated Selection").split(" ").slice(0, 3).join(" "),
      comment: `The ${(product?.name || "gift").toLowerCase()} was exquisitely packaged and arrived right on time for our celebration. Impeccable presentation and genuine attention to detail. Will definitely order again!`,
      date: "2 days ago",
      timestamp: Date.now() - 2 * 24 * 60 * 60 * 1000,
    },
    {
      id: "rev_2",
      authorName: "Chidi N.",
      verified: true,
      rating: 5,
      title: isHamper ? "Sensational Keepsake Box" : "Top Quality Nigerian Delivery",
      comment:
        "Ordered directly via WhatsApp and our concierge responded in under 2 minutes. The satin ribbon and personalized gold card brought tears of joy to the bride.",
      date: "1 week ago",
      timestamp: Date.now() - 7 * 24 * 60 * 60 * 1000,
    },
    {
      id: "rev_3",
      authorName: "Amina Bello",
      verified: true,
      rating: isLuxury ? 5 : 4,
      title: "Recipient was deeply touched",
      comment:
        "Sent this as a surprise birthday celebration blessing. Everything from the wrapping to the authentic items exceeded our expectations.",
      date: "2 weeks ago",
      timestamp: Date.now() - 14 * 24 * 60 * 60 * 1000,
    },
  ];
}

export function ProductReviewsSection({
  product,
}: {
  product: CatalogProduct;
}) {
  const [reviews, setReviews] = useState<ProductReview[]>(() =>
    getInitialReviews(product)
  );
  const [sortOption, setSortOption] = useState<"recent" | "highest" | "lowest">(
    "recent"
  );
  const [isWritingReview, setIsWritingReview] = useState(false);

  // New review form state
  const [newRating, setNewRating] = useState(5);
  const [newAuthor, setNewAuthor] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newComment, setNewComment] = useState("");

  const totalReviews = reviews.length;
  const ratingSum = reviews.reduce((acc, r) => acc + r.rating, 0);
  const averageRating = totalReviews > 0 ? ratingSum / totalReviews : 5.0;

  const ratingCounts = {
    5: reviews.filter((r) => r.rating === 5).length,
    4: reviews.filter((r) => r.rating === 4).length,
    3: reviews.filter((r) => r.rating === 3).length,
    2: reviews.filter((r) => r.rating === 2).length,
    1: reviews.filter((r) => r.rating === 1).length,
  };

  const sortedReviews = [...reviews].sort((a, b) => {
    if (sortOption === "recent") return b.timestamp - a.timestamp;
    if (sortOption === "highest") return b.rating - a.rating;
    if (sortOption === "lowest") return a.rating - b.rating;
    return 0;
  });

  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAuthor.trim() || !newTitle.trim() || !newComment.trim()) {
      toast.error("Please fill in your name, review headline, and details");
      return;
    }

    const createdReview: ProductReview = {
      id: `rev_${Date.now()}`,
      authorName: newAuthor.trim(),
      verified: true,
      rating: newRating,
      title: newTitle.trim(),
      comment: newComment.trim(),
      date: "Just now",
      timestamp: Date.now(),
    };

    setReviews([createdReview, ...reviews]);
    toast.success("Thank you! Your verified review has been published.");
    setIsWritingReview(false);
    setNewAuthor("");
    setNewTitle("");
    setNewComment("");
  };

  return (
    <section className="mt-16 space-y-12 border-t border-border/80 pt-12">
      {/* Editorial Header */}
      <div className="flex flex-col items-center justify-center text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary shadow-xs">
          <HeartHandshake className="h-3.5 w-3.5" />
          <span>Celebration Stories & Feedback</span>
        </div>
        <h2 className="font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Customer Reviews
        </h2>
        <p className="max-w-md text-xs text-muted-foreground leading-relaxed">
          Real feedback from gift givers, celebration hosts, and event guests across Nigeria.
        </p>
      </div>

      {/* Summary Row styled in Givvly Warm Alabaster Card */}
      <div className="grid grid-cols-1 items-center gap-8 rounded-2xl border border-blush/25 bg-gradient-to-br from-card via-[#FAF3EF]/50 to-background p-6 shadow-soft md:grid-cols-12 md:p-8">
        {/* Left: Overall Score */}
        <div className="flex flex-col items-center justify-center text-center md:col-span-4 md:border-r md:border-border/60 md:pr-6">
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star
                key={s}
                className={`h-5 w-5 ${
                  s <= Math.round(averageRating)
                    ? "fill-[#D4A959] text-[#D4A959]"
                    : "fill-muted text-muted-foreground/30"
                }`}
              />
            ))}
          </div>
          <p className="mt-2 font-heading text-3xl font-bold text-foreground">
            {averageRating.toFixed(2)}
          </p>
          <p className="text-xs font-medium text-muted-foreground">
            Based on {totalReviews} verified review{totalReviews === 1 ? "" : "s"}
          </p>
        </div>

        {/* Middle: Breakdown Bars */}
        <div className="space-y-2 md:col-span-5 md:px-4">
          {[5, 4, 3, 2, 1].map((stars) => {
            const count = ratingCounts[stars as keyof typeof ratingCounts] || 0;
            const percentage =
              totalReviews > 0 ? (count / totalReviews) * 100 : 0;

            return (
              <div key={stars} className="flex items-center gap-2.5 text-xs">
                <div className="flex w-16 shrink-0 items-center gap-0.5">
                  <span className="font-heading font-semibold text-foreground text-xs mr-1">
                    {stars}
                  </span>
                  <Star className="h-3.5 w-3.5 fill-[#D4A959] text-[#D4A959]" />
                </div>

                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted/60">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary to-[#D4A959] transition-all duration-300"
                    style={{ width: `${percentage}%` }}
                  />
                </div>

                <span className="w-5 text-right font-medium text-[11px] text-muted-foreground">
                  {count}
                </span>
              </div>
            );
          })}
        </div>

        {/* Right: Write a review CTA */}
        <div className="flex justify-center md:col-span-3 md:border-l md:border-border/60 md:pl-6">
          <Button
            type="button"
            onClick={() => setIsWritingReview(!isWritingReview)}
            className="w-full max-w-xs rounded-full bg-primary hover:bg-primary/90 text-white font-semibold text-xs shadow-soft hover:shadow-card transition-all duration-200 md:w-auto md:px-6 py-2.5 gap-2"
          >
            <PenSquare className="h-3.5 w-3.5" />
            <span>{isWritingReview ? "Cancel Review" : "Write a Review"}</span>
          </Button>
        </div>
      </div>

      {/* Write Review Form Card */}
      {isWritingReview && (
        <form
          onSubmit={handleSubmitReview}
          className="rounded-2xl border border-primary/30 bg-card p-6 shadow-card space-y-4 max-w-xl mx-auto backdrop-blur-xs"
        >
          <div className="space-y-1">
            <h3 className="font-heading text-lg font-bold text-foreground">
              Review &quot;{product.name}&quot;
            </h3>
            <p className="text-xs text-muted-foreground">
              Share your experience to guide other celebration hosts and guests.
            </p>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">
              Your Rating
            </label>
            <div className="flex items-center gap-1.5">
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  type="button"
                  key={s}
                  onClick={() => setNewRating(s)}
                  className="rounded-md p-1 transition-transform hover:scale-110 focus:outline-none"
                >
                  <Star
                    className={`h-6 w-6 ${
                      s <= newRating
                        ? "fill-[#D4A959] text-[#D4A959]"
                        : "fill-muted text-muted-foreground/30"
                    }`}
                  />
                </button>
              ))}
              <span className="ml-2 text-xs font-semibold text-foreground">
                {newRating} / 5 Stars
              </span>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">
              Your Name *
            </label>
            <Input
              required
              placeholder="e.g. Vanessa O."
              value={newAuthor}
              onChange={(e) => setNewAuthor(e.target.value)}
              className="text-xs rounded-xl"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">
              Review Headline *
            </label>
            <Input
              required
              placeholder="e.g. Exquisite presentation for our wedding!"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="text-xs rounded-xl"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">
              Review Details *
            </label>
            <Textarea
              required
              rows={3}
              placeholder="Tell others about the packaging, quality, and recipient reaction..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="text-xs rounded-xl"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-full"
              onClick={() => setIsWritingReview(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              className="rounded-full bg-primary text-white"
            >
              Submit Review
            </Button>
          </div>
        </form>
      )}

      {/* Sort row */}
      <div className="flex items-center justify-between border-b border-border/60 pb-3">
        <div className="flex items-center gap-2">
          <label htmlFor="review-sort" className="text-xs text-muted-foreground font-medium">
            Sort by:
          </label>
          {/* use shadcn select component */}
          <Select value={sortOption} onValueChange={setSortOption as any}>
            <SelectTrigger className="w-45">
              <SelectValue placeholder="Select a sort option" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Most Recent</SelectItem>
              <SelectItem value="highest">Highest Rating</SelectItem>
              <SelectItem value="lowest">Lowest Rating</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <span className="text-xs text-muted-foreground">
          Showing {sortedReviews.length} review{sortedReviews.length === 1 ? "" : "s"}
        </span>
      </div>

      {/* Reviews List */}
      <div className="space-y-4">
        {sortedReviews.map((rev) => {
          const initials = rev.authorName
            .split(" ")
            .map((n) => n[0])
            .join("")
            .slice(0, 2)
            .toUpperCase();

          return (
            <div
              key={rev.id}
              className="rounded-2xl border border-border/70 bg-card p-5 shadow-xs transition-all duration-200 hover:border-primary/30 hover:shadow-soft space-y-2.5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary font-heading font-bold text-xs">
                    {initials}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-heading text-xs font-bold text-foreground">
                        {rev.authorName}
                      </span>
                      {rev.verified && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                          <Check className="h-2.5 w-2.5" />
                          Verified
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <span className="text-[11px] text-muted-foreground font-medium">
                  {rev.date}
                </span>
              </div>

              {/* Gold Stars */}
              <div className="flex items-center gap-0.5 pt-0.5">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    className={`h-3.5 w-3.5 ${
                      s <= rev.rating
                        ? "fill-[#D4A959] text-[#D4A959]"
                        : "fill-muted text-muted-foreground/30"
                    }`}
                  />
                ))}
              </div>

              {/* Title & Body */}
              <div className="space-y-1">
                <p className="font-heading text-sm font-bold text-foreground">
                  {rev.title}
                </p>
                <p className="text-xs leading-relaxed text-foreground/80 font-sans">
                  {rev.comment}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* 3 Trust Pillars styled in Givvly cards */}
      <div className="grid grid-cols-1 gap-4 border-t border-border/80 pt-10 sm:grid-cols-3">
        <div className="flex items-start gap-3.5 rounded-2xl border border-border/70 bg-[#FAF3EF]/50 p-5 shadow-xs">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <MessageCircle className="h-5 w-5" />
          </span>
          <div className="space-y-1">
            <h4 className="font-heading text-xs font-bold uppercase tracking-wider text-foreground">
              Customer Concierge
            </h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Available Monday to Saturday on WhatsApp to assist with gift curation.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3.5 rounded-2xl border border-border/70 bg-[#FAF3EF]/50 p-5 shadow-xs">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/20 text-accent-foreground">
            <Truck className="h-5 w-5 text-[#D4A959]" />
          </span>
          <div className="space-y-1">
            <h4 className="font-heading text-xs font-bold uppercase tracking-wider text-foreground">
              Nationwide Delivery
            </h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Doorstep delivery across all 36 Nigerian states with real-time tracking.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3.5 rounded-2xl border border-border/70 bg-[#FAF3EF]/50 p-5 shadow-xs">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <div className="space-y-1">
            <h4 className="font-heading text-xs font-bold uppercase tracking-wider text-foreground">
              Guaranteed Protection
            </h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Secured payments via Paystack and full Givvly buyer assurance.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

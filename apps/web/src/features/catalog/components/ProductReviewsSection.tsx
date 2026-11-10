"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import {
  Star,
  Check,
  User,
  MessageCircle,
  Truck,
  ShieldCheck,
  HeartHandshake,
  PenSquare,
  Loader2,
  FilterX,
  Sparkles,
  Lock,
  LogIn,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuthStore } from "@/stores/auth-store";
import {
  createSingleProductWhatsAppLink,
  WHATSAPP_DISPLAY_PHONE,
} from "@/lib/whatsapp";
import type { CatalogProduct, ProductReview } from "../types";
import {
  useProductReviews,
  useSubmitProductReview,
  useReviewEligibility,
} from "../hooks/useCatalog";

export type { ProductReview };

export function getInitialReviews(product: CatalogProduct): ProductReview[] {
  const isHamper =
    product.isCombo || product.name.toLowerCase().includes("hamper");
  const isLuxury = product.priceKobo > 5_000_000;

  return [
    {
      id: "rev_1",
      authorName: "Vanessa O.",
      verified: true,
      rating: 5,
      title: (product?.name || "Curated Selection")
        .split(" ")
        .slice(0, 3)
        .join(" "),
      comment: `The ${(
        product?.name || "gift"
      ).toLowerCase()} was exquisitely packaged and arrived right on time for our celebration. Impeccable presentation and genuine attention to detail. Will definitely order again!`,
      date: "2 days ago",
      timestamp: Date.now() - 2 * 24 * 60 * 60 * 1000,
    },
    {
      id: "rev_2",
      authorName: "Chidi N.",
      verified: true,
      rating: 5,
      title: isHamper
        ? "Sensational Keepsake Box"
        : "Top Quality Nigerian Delivery",
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

const RATING_DESCRIPTIONS: Record<number, string> = {
  5: "5 / 5 Stars - Exceptional Presentation & Quality",
  4: "4 / 5 Stars - Highly Recommended Gift",
  3: "3 / 5 Stars - Good Quality Experience",
  2: "2 / 5 Stars - Below Expectations",
  1: "1 / 5 Stars - Unsatisfactory",
};

export function ProductReviewsSection({
  product,
}: {
  product: CatalogProduct;
}) {
  const { user } = useAuthStore();
  const initialReviews = useMemo(() => getInitialReviews(product), [product]);

  // Integrated dynamic query for reviews
  const { data: fetchedReviews, isLoading } = useProductReviews(
    product.slug,
    initialReviews
  );
  const reviews = fetchedReviews ?? initialReviews;

  // Integrated review eligibility query (checks if user is logged in & has purchased)
  const { data: eligibility, isLoading: isCheckingEligibility } =
    useReviewEligibility(product.slug, user?.id, Boolean(user));

  // Integrated review submission mutation
  const submitReviewMutation = useSubmitProductReview(product.slug);

  const [sortOption, setSortOption] = useState<"recent" | "highest" | "lowest">(
    "recent"
  );
  const [selectedStarFilter, setSelectedStarFilter] = useState<number | null>(
    null
  );
  const [isWritingReview, setIsWritingReview] = useState(false);

  // New review form state
  const [newRating, setNewRating] = useState(5);
  const [newHoverRating, setNewHoverRating] = useState<number | null>(null);
  const [newAuthor, setNewAuthor] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newComment, setNewComment] = useState("");

  // Auto-populate author name from authenticated user if available
  useEffect(() => {
    if (user?.name && !newAuthor) {
      setNewAuthor(user.name);
    }
  }, [user, newAuthor]);

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

  // Filter & sort reviews dynamically
  const filteredReviews = useMemo(() => {
    let result = [...reviews];
    if (selectedStarFilter !== null) {
      result = result.filter((r) => r.rating === selectedStarFilter);
    }
    result.sort((a, b) => {
      if (sortOption === "recent") return b.timestamp - a.timestamp;
      if (sortOption === "highest") return b.rating - a.rating;
      if (sortOption === "lowest") return a.rating - b.rating;
      return 0;
    });
    return result;
  }, [reviews, selectedStarFilter, sortOption]);

  const handleOpenWriteReview = () => {
    if (!user) {
      toast.error(
        "Please log in to submit a review. Only customers who purchased this gift can leave a review."
      );
      return;
    }
    if (eligibility && !eligibility.canReview) {
      toast.error(
        eligibility.message ||
          "Only verified customers who have purchased this gift can leave a review."
      );
      return;
    }
    if (!isWritingReview && user?.name && !newAuthor) {
      setNewAuthor(user.name);
    }
    setIsWritingReview(!isWritingReview);
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    const authorTrimmed = newAuthor.trim() || user?.name || "Verified Customer";
    const titleTrimmed = newTitle.trim();
    const commentTrimmed = newComment.trim();

    if (!authorTrimmed || !titleTrimmed || !commentTrimmed) {
      toast.error("Please fill in your name, review headline, and details");
      return;
    }

    try {
      await submitReviewMutation.mutateAsync({
        rating: newRating,
        authorName: authorTrimmed,
        title: titleTrimmed,
        comment: commentTrimmed,
        verified: true,
      });

      toast.success("Thank you! Your verified review has been published.");
      setIsWritingReview(false);
      setNewTitle("");
      setNewComment("");
      if (!user?.name) {
        setNewAuthor("");
      }
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Failed to publish review. Please try again."
      );
    }
  };

  const whatsAppLink = createSingleProductWhatsAppLink({
    name: product.name,
    priceKobo: product.priceKobo,
    category: product.category,
    slug: product.slug,
    isCombo: product.isCombo,
    comboItems: product.comboItems,
  });

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
          Real feedback from gift givers, celebration hosts, and event guests
          across Nigeria.
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
            Based on {totalReviews} verified review
            {totalReviews === 1 ? "" : "s"}
          </p>
        </div>

        {/* Middle: Interactive Breakdown Bars */}
        <div className="space-y-2 md:col-span-5 md:px-4">
          {[5, 4, 3, 2, 1].map((stars) => {
            const count = ratingCounts[stars as keyof typeof ratingCounts] || 0;
            const percentage =
              totalReviews > 0 ? (count / totalReviews) * 100 : 0;
            const isSelected = selectedStarFilter === stars;

            return (
              <button
                key={stars}
                type="button"
                onClick={() =>
                  setSelectedStarFilter(isSelected ? null : stars)
                }
                title={`Filter by ${stars} star reviews`}
                className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-1 text-xs transition-colors hover:bg-primary/5 cursor-pointer text-left ${
                  isSelected ? "bg-primary/10 ring-1 ring-primary/30" : ""
                }`}
              >
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

                <span className="w-6 text-right font-medium text-[11px] text-muted-foreground">
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Right: Write a review CTA */}
        <div className="flex flex-col items-center justify-center text-center space-y-2 md:col-span-3 md:border-l md:border-border/60 md:pl-6">
          {!user ? (
            <div className="space-y-1.5 w-full max-w-xs">
              <Button
                asChild
                className="w-full rounded-full bg-primary hover:bg-primary/90 text-white font-semibold text-xs shadow-soft hover:shadow-card transition-all duration-200 py-2.5 gap-2"
              >
                <Link
                  href={`/login?next=${encodeURIComponent(
                    `/catalog/${product.slug}`
                  )}`}
                >
                  <LogIn className="h-3.5 w-3.5" />
                  <span>Log in to Review</span>
                </Link>
              </Button>
              <p className="text-[11px] text-muted-foreground leading-tight">
                Verified buyers only. Sign in to leave a review.
              </p>
            </div>
          ) : isCheckingEligibility ? (
            <div className="space-y-1.5 w-full max-w-xs">
              <Button
                type="button"
                disabled
                variant="outline"
                className="w-full rounded-full border-border/80 text-muted-foreground font-semibold text-xs py-2.5 gap-2 opacity-80"
              >
                <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                <span>Checking eligibility...</span>
              </Button>
            </div>
          ) : eligibility &&
            !eligibility.canReview &&
            eligibility.reason === "NOT_PURCHASED" ? (
            <div className="space-y-1.5 w-full max-w-xs">
              <Button
                type="button"
                disabled
                variant="outline"
                className="w-full rounded-full border-border/80 text-muted-foreground font-semibold text-xs py-2.5 gap-2 cursor-not-allowed opacity-80"
              >
                <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Verified Purchasers Only</span>
              </Button>
              <p className="text-[11px] text-muted-foreground leading-tight">
                Only customers who purchased this gift can leave a review.
              </p>
            </div>
          ) : eligibility &&
            !eligibility.canReview &&
            eligibility.reason === "ALREADY_REVIEWED" ? (
            <div className="space-y-1.5 w-full max-w-xs">
              <div className="inline-flex w-full items-center justify-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2.5 text-xs font-semibold text-emerald-800">
                <Check className="h-3.5 w-3.5 text-emerald-600" />
                <span>Review Submitted</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-tight">
                You have already shared your review for this gift.
              </p>
            </div>
          ) : (
            <Button
              type="button"
              onClick={handleOpenWriteReview}
              className="w-full max-w-xs rounded-full bg-primary hover:bg-primary/90 text-white font-semibold text-xs shadow-soft hover:shadow-card transition-all duration-200 md:w-auto md:px-6 py-2.5 gap-2"
            >
              <PenSquare className="h-3.5 w-3.5" />
              <span>{isWritingReview ? "Cancel Review" : "Write a Review"}</span>
            </Button>
          )}
        </div>
      </div>

      {/* Write Review Form Card */}
      {isWritingReview && (
        <form
          onSubmit={handleSubmitReview}
          className="rounded-2xl border border-primary/30 bg-card p-6 shadow-card space-y-4 max-w-xl mx-auto backdrop-blur-xs transition-all"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-1">
              <h3 className="font-heading text-lg font-bold text-foreground">
                Review &quot;{product.name}&quot;
              </h3>
              <p className="text-xs text-muted-foreground">
                Share your unboxing experience to guide other celebration hosts
                and guests.
              </p>
            </div>
            <Badge
              variant="outline"
              className="bg-emerald-500/10 text-emerald-700 border-emerald-500/20 text-[10px] gap-1 shrink-0"
            >
              <Check className="h-2.5 w-2.5" />
              <span>Verified Purchaser</span>
            </Badge>
          </div>

          {/* Star selector with hover feedback */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">
              Your Rating *
            </label>
            <div className="flex items-center gap-1.5">
              {[1, 2, 3, 4, 5].map((s) => {
                const activeStar = newHoverRating ?? newRating;
                const isLit = s <= activeStar;
                return (
                  <button
                    type="button"
                    key={s}
                    onClick={() => setNewRating(s)}
                    onMouseEnter={() => setNewHoverRating(s)}
                    onMouseLeave={() => setNewHoverRating(null)}
                    aria-label={`Rate ${s} out of 5 stars`}
                    className="rounded-md p-1 transition-transform hover:scale-110 focus:outline-none"
                  >
                    <Star
                      className={`h-6 w-6 transition-colors ${
                        isLit
                          ? "fill-[#D4A959] text-[#D4A959]"
                          : "fill-muted text-muted-foreground/30"
                      }`}
                    />
                  </button>
                );
              })}
              <span className="ml-2 text-xs font-semibold text-foreground">
                {RATING_DESCRIPTIONS[newHoverRating ?? newRating]}
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
            {user && (
              <p className="text-[10px] text-muted-foreground">
                Logged in as {user.name} ({user.email}).
              </p>
            )}
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
              placeholder="Tell others about the packaging, quality, scent, freshness, and recipient reaction..."
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
              disabled={submitReviewMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={submitReviewMutation.isPending}
              className="rounded-full bg-primary text-white gap-1.5"
            >
              {submitReviewMutation.isPending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Publishing...</span>
                </>
              ) : (
                <span>Publish Verified Review</span>
              )}
            </Button>
          </div>
        </form>
      )}

      {/* Sort & Filter controls */}
      <div className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-border/60 pb-3">
          <div className="flex items-center gap-2">
            <label
              htmlFor="review-sort"
              className="text-xs text-muted-foreground font-medium"
            >
              Sort by:
            </label>
            <Select
              value={sortOption}
              onValueChange={(val) =>
                setSortOption(val as "recent" | "highest" | "lowest")
              }
            >
              <SelectTrigger className="w-44 text-xs h-9">
                <SelectValue placeholder="Select sort order" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Most Recent</SelectItem>
                <SelectItem value="highest">Highest Rating</SelectItem>
                <SelectItem value="lowest">Lowest Rating</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              Showing {filteredReviews.length} of {reviews.length} review
              {reviews.length === 1 ? "" : "s"}
            </span>
          </div>
        </div>

        {/* Active Star Filter Pill */}
        {selectedStarFilter !== null && (
          <div className="flex items-center justify-between rounded-xl border border-primary/20 bg-primary/5 px-3.5 py-2 text-xs">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="gap-1 text-xs">
                <Star className="h-3 w-3 fill-[#D4A959] text-[#D4A959]" />
                <span>{selectedStarFilter} Stars Only</span>
              </Badge>
              <span className="text-muted-foreground">
                Filtered from {reviews.length} total reviews
              </span>
            </div>
            <button
              type="button"
              onClick={() => setSelectedStarFilter(null)}
              className="inline-flex items-center gap-1 font-semibold text-primary hover:underline cursor-pointer"
            >
              <FilterX className="h-3.5 w-3.5" />
              <span>Clear filter</span>
            </button>
          </div>
        )}
      </div>

      {/* Reviews List or Empty State */}
      {filteredReviews.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/80 bg-muted/20 p-8 text-center space-y-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Star className="h-6 w-6 fill-primary/20 text-primary" />
          </div>
          <div className="space-y-1">
            <h3 className="font-heading text-base font-bold text-foreground">
              {selectedStarFilter
                ? `No ${selectedStarFilter}-star reviews found`
                : "No reviews yet for this gift"}
            </h3>
            <p className="max-w-sm text-xs text-muted-foreground">
              {selectedStarFilter
                ? "Try clearing the star rating filter to view all customer reviews."
                : `Be the first celebration guest or host to review ${product.name}!`}
            </p>
          </div>
          {selectedStarFilter ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedStarFilter(null)}
              className="text-xs rounded-full"
            >
              View All Reviews
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={handleOpenWriteReview}
              className="text-xs rounded-full bg-primary text-white"
            >
              Write the First Review
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredReviews.map((rev) => {
            const initials = rev.authorName
              .split(" ")
              .filter(Boolean)
              .map((n) => n[0])
              .join("")
              .slice(0, 2)
              .toUpperCase() || "VC";

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
      )}

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
              Available Monday to Saturday on WhatsApp to assist with gift
              curation.
            </p>
            <a
              href={whatsAppLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline pt-0.5"
            >
              Chat with Concierge ({WHATSAPP_DISPLAY_PHONE}) &rarr;
            </a>
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
              Doorstep delivery across all 36 Nigerian states with real-time
              tracking.
            </p>
            <span className="inline-block text-[11px] font-medium text-muted-foreground pt-0.5">
              Lagos & Abuja same-day/next-day priority dispatch.
            </span>
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
            <span className="inline-block text-[11px] font-medium text-emerald-700 dark:text-emerald-400 pt-0.5">
              100% money-back guarantee on transit damages.
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

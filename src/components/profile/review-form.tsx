"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Star } from "lucide-react";
import { pluralize } from "@/lib/format";

import {
  createReviewAction,
  updateReviewAction,
  type ReviewActionState,
} from "@/lib/actions/reviews";
import {
  REVIEW_COMMENT_MAX_CHARS,
  REVIEW_COMMENT_MAX_WORDS,
} from "@/lib/validations/reviews";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const initialState: ReviewActionState = {};

const RATINGS = [1, 2, 3, 4, 5] as const;

export function ReviewForm({
  bookingId,
  tripTitle,
  review,
  onSubmitted,
}: {
  bookingId: string;
  tripTitle: string;
  review?: { id: string; rating: number; comment: string } | null;
  onSubmitted?: () => void;
}) {
  const router = useRouter();
  const isEditing = Boolean(review);
  const [rating, setRating] = useState(review?.rating ?? 0);
  const [comment, setComment] = useState(review?.comment ?? "");
  const [state, formAction, isPending] = useActionState(
    isEditing ? updateReviewAction : createReviewAction,
    initialState,
  );

  useEffect(() => {
    if (state.success) {
      onSubmitted?.();
      // Refresh server components so the parent card reflects the change and
      // the review appears across the home/trip/guide pages.
      router.refresh();
    }
  }, [state.success, router, onSubmitted]);

  const wordCount = comment.trim() ? comment.trim().split(/\s+/).length : 0;

  return (
    <form
      action={formAction}
      className="border-t border-border/70 bg-muted/10 px-4 py-4"
    >
      <input type="hidden" name="bookingId" value={bookingId} />
      <input type="hidden" name="rating" value={rating} />
      {review ? <input type="hidden" name="reviewId" value={review.id} /> : null}

      {state.success ? (
        <div
          role="status"
          className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-600 dark:text-emerald-400"
        >
          <Check className="h-4 w-4" />
          {isEditing ? "Thanks! Your review has been updated." : "Thanks! Your review is now live."}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Your rating
            </span>
            <div className="flex items-center gap-1">
              {RATINGS.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRating(value)}
                  aria-label={`${value} ${pluralize(value, "star")}`}
                  aria-pressed={rating === value}
                  className="text-muted-foreground transition-colors hover:text-amber-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
                >
                  <Star
                    className={cn(
                      "h-6 w-6",
                      value <= rating ? "fill-amber-400 text-amber-400" : "",
                    )}
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label
              htmlFor={`review-comment-${bookingId}`}
              className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground"
            >
              Your review of {tripTitle}
            </Label>
            <textarea
              id={`review-comment-${bookingId}`}
              name="comment"
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              maxLength={REVIEW_COMMENT_MAX_CHARS}
              rows={3}
              placeholder="Share what you loved about the trip…"
              className="w-full rounded-xl border border-border/80 bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:border-foreground/40 focus:ring-2 focus:ring-ring/20"
            />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {wordCount}/{REVIEW_COMMENT_MAX_WORDS} words
              </span>
              <span>
                {comment.length}/{REVIEW_COMMENT_MAX_CHARS}
              </span>
            </div>
          </div>

          {state.error ? (
            <p
              role="alert"
              className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {state.error}
            </p>
          ) : null}

          <div className="flex items-center justify-end">
            <Button
              type="submit"
              disabled={isPending || rating === 0 || comment.trim().length === 0}
              className="rounded-full"
            >
              {isPending
                ? "Saving…"
                : isEditing
                  ? "Save changes"
                  : "Submit review"}
            </Button>
          </div>
        </div>
      )}
    </form>
  );
}

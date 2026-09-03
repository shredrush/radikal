"use client";

import { useState, useTransition } from "react";
import { ChevronDown, Star, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { deleteReviewAction } from "@/lib/actions/reviews";
import { formatShortDate, pluralize } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export type AdminGuideReviewData = {
  id: string;
  authorName: string;
  rating: number;
  comment: string;
  tripName: string | null;
  tripDate: Date | null;
  createdAt: Date;
};

export function AdminGuideReviews({ reviews }: { reviews: AdminGuideReviewData[] }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleDelete(review: AdminGuideReviewData) {
    if (!window.confirm(`Delete ${review.authorName}'s review? This action cannot be undone.`)) return;

    startTransition(async () => {
      try {
        await deleteReviewAction(review.id);
        toast.success("Review deleted.");
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not delete review.");
      }
    });
  }

  return (
    <div className="md:col-span-2 overflow-hidden rounded-xl border border-border/70">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 bg-muted/20 px-4 py-3 text-left transition-colors hover:bg-muted/40"
      >
        <span className="text-sm font-medium">
          Reviews <span className="text-muted-foreground">({reviews.length} {pluralize(reviews.length, "review")})</span>
        </span>
        <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform duration-200", open && "rotate-180")} />
      </button>
      <div className={cn("grid transition-all duration-200 ease-out", open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0")}>
        <div className="overflow-hidden">
          <div className="space-y-3 border-t border-border/70 p-4">
            {reviews.length === 0 ? (
              <p className="text-sm text-muted-foreground">No reviews yet.</p>
            ) : (
              reviews.map((review) => (
                <article key={review.id} className="rounded-xl border border-border/70 bg-background p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">{review.authorName}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {review.tripName ?? "Radikal experience"} · {formatShortDate(review.tripDate ?? review.createdAt)}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Delete review by ${review.authorName}`}
                      className="shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      disabled={isPending}
                      onClick={() => handleDelete(review)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="mt-2 flex items-center gap-1 text-amber-500" aria-label={`${review.rating} out of 5 stars`}>
                    {Array.from({ length: 5 }, (_, index) => (
                      <Star key={index} className={cn("h-3.5 w-3.5", index < review.rating && "fill-current")} />
                    ))}
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{review.comment}</p>
                </article>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

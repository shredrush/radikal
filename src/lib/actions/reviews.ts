"use server";

import { revalidatePath, updateTag } from "next/cache";

import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity-log";
import { rateLimit, rateLimitError } from "@/lib/rate-limit";
import { reviewSchema } from "@/lib/validations/reviews";

export type ReviewActionState = {
  error?: string;
  success?: boolean;
  fieldErrors?: { rating?: string; comment?: string };
};

type ValidatedReview = {
  userId: string;
  bookingId: string;
  tripId: string;
  guideId: string;
  tripSlug: string;
  // Snapshot taken at review time so the review stays meaningful if the trip
  // is later retired.
  tripName: string;
  tripDate: Date;
  rating: number;
  comment: string;
};

/**
 * Shared validation for creating and editing a review:
 *   - The user is always derived from the server-side session, never the client.
 *   - The booking must belong to the user, not be cancelled, and have completed
 *     (either explicitly marked COMPLETED, or CONFIRMED with dates in the past).
 *   - Input is validated and sanitized via `reviewSchema` (control chars
 *     stripped, whitespace normalized, length + word limits enforced).
 *   - Per-user rate limiting throttles abuse.
 */
async function validateReviewSubmission(
  formData: FormData,
): Promise<
  | { ok: true; data: ValidatedReview }
  | { ok: false; state: ReviewActionState }
> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return { ok: false, state: { error: "You must be logged in to leave a review." } };
  }

  const reviewLimit = rateLimit(`review:user:${userId}`, 10, 60 * 60_000);
  if (!reviewLimit.success) {
    return { ok: false, state: { error: rateLimitError(reviewLimit) } };
  }

  const parsed = reviewSchema.safeParse({
    bookingId: formData.get("bookingId"),
    rating: formData.get("rating"),
    comment: formData.get("comment"),
  });

  if (!parsed.success) {
    const fieldErrors: ReviewActionState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0];
      if (field === "rating" || field === "comment") {
        fieldErrors[field] ??= issue.message;
      }
    }
    return {
      ok: false,
      state: {
        error:
          fieldErrors.comment ??
          fieldErrors.rating ??
          "Please check your review and try again.",
        fieldErrors,
      },
    };
  }

  const { bookingId, rating, comment } = parsed.data;

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: {
      userId: true,
      status: true,
      tripId: true,
      trip: {
        select: { slug: true, guideId: true, title: true },
      },
      slot: { select: { date: true } },
    },
  });

  if (!booking || booking.userId !== userId) {
    return { ok: false, state: { error: "This booking could not be found." } };
  }

  if (booking.status === "CANCELLED") {
    return { ok: false, state: { error: "Cancelled trips cannot be reviewed." } };
  }

  // Completion is persisted before the completed-trips list is rendered, so
  // the booking's stored status is the single source of truth here.
  const completed = booking.status === "COMPLETED";

  if (!completed) {
    return {
      ok: false,
      state: { error: "You can review a trip only after it has completed." },
    };
  }

  if (!booking.trip.guideId) {
    return {
      ok: false,
      state: { error: "This trip is not currently associated with a guide." },
    };
  }

  return {
    ok: true,
    data: {
      userId,
      bookingId,
      tripId: booking.tripId,
      guideId: booking.trip.guideId,
      tripSlug: booking.trip.slug,
      tripName: booking.trip.title,
      tripDate: booking.slot.date,
      rating,
      comment,
    },
  };
}

function revalidateReviewCaches(tripSlug: string): void {
  revalidatePath("/profile");
  revalidatePath("/");
  revalidatePath(`/trips/${tripSlug}`);
  updateTag("trips");
  updateTag("reviews");
  updateTag("guides");
}

export async function createReviewAction(
  _prevState: ReviewActionState,
  formData: FormData,
): Promise<ReviewActionState> {
  const validated = await validateReviewSubmission(formData);
  if (!validated.ok) return validated.state;

  const { userId, bookingId, tripId, guideId, tripSlug, tripName, tripDate, rating, comment } =
    validated.data;

  const existing = await prisma.review.findFirst({
    where: { userId, tripId },
    select: { id: true },
  });
  if (existing) {
    return { error: "You have already reviewed this trip." };
  }

  await prisma.review.create({
    data: { userId, tripId, guideId, tripName, tripDate, rating, comment },
  });

  await logActivity({
    userId,
    action: "REVIEW_SUBMITTED",
    label: "Left a review on a completed trip",
    metadata: { tripId, bookingId, rating },
  });

  revalidateReviewCaches(tripSlug);

  return { success: true };
}

export async function updateReviewAction(
  _prevState: ReviewActionState,
  formData: FormData,
): Promise<ReviewActionState> {
  const validated = await validateReviewSubmission(formData);
  if (!validated.ok) return validated.state;

  const { userId, bookingId, tripId, tripSlug, rating, comment } =
    validated.data;

  const reviewId = (formData.get("reviewId")?.toString() ?? "").trim();

  const existing = await prisma.review.findFirst({
    where: { userId, tripId },
    select: { id: true },
  });
  if (!existing) {
    return { error: "You haven't reviewed this trip yet." };
  }
  if (reviewId && reviewId !== existing.id) {
    return { error: "This review could not be found." };
  }

  await prisma.review.update({
    where: { id: existing.id },
    data: { rating, comment },
  });

  await logActivity({
    userId,
    action: "REVIEW_UPDATED",
    label: "Edited a review",
    metadata: { tripId, bookingId, reviewId: existing.id, rating },
  });

  revalidateReviewCaches(tripSlug);

  return { success: true };
}

/** Soft-delete a review from the staff guide-management panel. */
export async function deleteReviewAction(reviewId: string): Promise<void> {
  const session = await requirePermission("guides.manage", "/login?callbackUrl=/admin/guides");

  if (!reviewId) {
    throw new Error("Missing review id.");
  }

  const review = await prisma.review.findFirst({
    where: { id: reviewId, deletedAt: null },
    select: { id: true, guideId: true, tripId: true },
  });
  if (!review) {
    throw new Error("Review not found.");
  }

  await prisma.review.update({
    where: { id: review.id },
    data: { deletedAt: new Date() },
  });

  await logActivity({
    userId: session.user.id,
    action: "REVIEW_DELETED",
    label: "Deleted a traveller review",
    metadata: { reviewId: review.id, guideId: review.guideId, tripId: review.tripId },
  });

  revalidatePath("/admin/guides");
  revalidatePath("/");
  updateTag("reviews");
  updateTag("guides");
}

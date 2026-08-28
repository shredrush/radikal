import { z } from "zod";

import { sanitizeText } from "@/lib/sanitize";

export const REVIEW_COMMENT_MAX_CHARS = 1500;
export const REVIEW_COMMENT_MAX_WORDS = 250;

/**
 * A review comment is free text. We keep the limit generous so travellers can
 * write a real story (not a single tweet-length line), while still bounding
 * storage/rendering cost. Sanitization strips control characters and collapses
 * whitespace before the length/word checks run.
 */
export const reviewSchema = z.object({
  bookingId: z.string().trim().min(1).max(64),
  rating: z.coerce
    .number()
    .int("Choose a whole-star rating.")
    .min(1, "Please choose a rating.")
    .max(5, "Rating must be between 1 and 5 stars."),
  comment: z
    .string()
    .transform((value) =>
      sanitizeText(value, {
        maxLength: REVIEW_COMMENT_MAX_CHARS,
        allowNewlines: true,
      }),
    )
    .refine((value) => value.length > 0, "Write a short review.")
    .refine(
      (value) => value.trim().split(/\s+/).length <= REVIEW_COMMENT_MAX_WORDS,
      `Keep your review under ${REVIEW_COMMENT_MAX_WORDS} words.`,
    ),
});

export type ReviewInput = z.infer<typeof reviewSchema>;

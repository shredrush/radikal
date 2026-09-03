import { z } from "zod";

/**
 * Bank transfer references (UTR / NEFT / IMPS / UPI) are alphanumeric, often
 * with hyphens. Restricting to this whitelist rejects control characters and
 * other unsafe input before it ever reaches the database.
 */
const TRANSACTION_ID_PATTERN = /^[A-Za-z0-9-]+$/;

/** Cap on the free-text special needs / services note on a booking. */
export const SPECIAL_REQUESTS_MAX_LENGTH = 500;

export const createBookingSchema = z.object({
  tripId: z.string().min(1, "Trip is required"),
  slotId: z.string().min(1, "Slot is required"),
  participantCount: z.coerce.number().int().min(1).max(20).default(1),
  adventureInsurance: z.boolean().optional().default(false),
  specialRequests: z
    .string()
    .trim()
    .max(SPECIAL_REQUESTS_MAX_LENGTH, "Special requests must be 500 characters or fewer.")
    .optional(),
  transactionId: z
    .string()
    .trim()
    .min(1, "Transaction ID is required")
    .max(100, "Transaction ID is too long")
    .regex(
      TRANSACTION_ID_PATTERN,
      "Transaction ID can only contain letters, numbers and hyphens."
    ),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;

export const processPaymentSchema = z.object({
  bookingId: z.string().min(1, "Booking is required"),
  transactionId: z
    .string()
    .trim()
    .min(1, "Transaction ID is required")
    .max(100, "Transaction ID is too long")
    .regex(
      TRANSACTION_ID_PATTERN,
      "Transaction ID can only contain letters, numbers and hyphens."
    ),
});

export type ProcessPaymentInput = z.infer<typeof processPaymentSchema>;

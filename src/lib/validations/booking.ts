import { z } from "zod";

export const createBookingSchema = z.object({
  activityId: z.string().min(1, "Activity is required"),
  slotId: z.string().min(1, "Slot is required"),
  participantCount: z.coerce.number().int().min(1).max(20).default(1),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;

/**
 * Bank transfer references (UTR / NEFT / IMPS / UPI) are alphanumeric, often
 * with hyphens. Restricting to this whitelist rejects control characters and
 * other unsafe input before it ever reaches the database.
 */
const TRANSACTION_ID_PATTERN = /^[A-Za-z0-9-]+$/;

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

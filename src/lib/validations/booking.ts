import { z } from "zod";

export const createBookingSchema = z.object({
  activityId: z.string().min(1, "Activity is required"),
  slotId: z.string().min(1, "Slot is required"),
  participantCount: z.coerce.number().int().min(1).max(20).default(1),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;

export const processPaymentSchema = z.object({
  bookingId: z.string().min(1, "Booking is required"),
});

export type ProcessPaymentInput = z.infer<typeof processPaymentSchema>;

import { z } from "zod";

import { sanitizeText } from "@/lib/sanitize";

export const CUSTOM_TRIP_SPORT_VALUES = [
  "TREK",
  "BIKE",
  "SNOWBOARD",
  "SKI",
  "ROCKCLIMB",
  "EXPEDITION",
  "YOGA",
] as const;

export type CustomTripSport = (typeof CUSTOM_TRIP_SPORT_VALUES)[number];

export const customTripSportSchema = z.enum(CUSTOM_TRIP_SPORT_VALUES);

export const createCustomTripSchema = z
  .object({
    groupType: z.enum(["PRIVATE", "CORPORATE"]),
    sports: z
      .array(customTripSportSchema)
      .min(1, "Select at least one sport")
      .max(CUSTOM_TRIP_SPORT_VALUES.length),
    startDate: z.string().trim().min(1, "Start date is required"),
    endDate: z.string().trim().min(1, "End date is required"),
    location: z
      .string()
      .trim()
      .transform((value) => sanitizeText(value, { maxLength: 100 }))
      .refine((value) => value.length > 0, "Location is required"),
    participantCount: z.coerce.number().int().min(1, "At least 1 participant").max(200),
    budgetRupees: z.preprocess(
      (value) => (value === "" || value === null || value === undefined ? undefined : value),
      z.coerce
        .number()
        .int()
        .min(0)
        .max(10_000_000)
        .optional(),
    ),
    requirements: z
      .string()
      .trim()
      .transform((value) => sanitizeText(value, { maxLength: 4000, allowNewlines: true }))
      .optional(),
  })
  .refine(
    (data) => {
      const start = new Date(`${data.startDate}T00:00:00`);
      const end = new Date(`${data.endDate}T00:00:00`);
      return !Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && end >= start;
    },
    { message: "End date must be on or after the start date", path: ["endDate"] },
  );

export type CreateCustomTripInput = z.infer<typeof createCustomTripSchema>;

export const customTripMessageSchema = z.object({
  body: z
    .string()
    .transform((value) => sanitizeText(value, { maxLength: 2000, allowNewlines: true }))
    .refine((value) => value.length > 0, "Message cannot be empty"),
});

export type CustomTripMessageInput = z.infer<typeof customTripMessageSchema>;

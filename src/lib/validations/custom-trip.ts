import { z } from "zod";

import { sanitizeText } from "@/lib/sanitize";

export const CUSTOM_TRIP_LOCATION_MAX_CHARS = 100;
export const CUSTOM_TRIP_REQUIREMENTS_MAX_CHARS = 4000;
export const CUSTOM_TRIP_MESSAGE_MAX_CHARS = 2000;

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isValidIsoDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

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
    startDate: z
      .string()
      .regex(ISO_DATE_PATTERN, "Start date must be a valid date")
      .refine(isValidIsoDate, "Start date must be a valid date"),
    endDate: z
      .string()
      .regex(ISO_DATE_PATTERN, "End date must be a valid date")
      .refine(isValidIsoDate, "End date must be a valid date"),
    location: z
      .string()
      .max(CUSTOM_TRIP_LOCATION_MAX_CHARS, "Location must be 100 characters or fewer")
      .trim()
      .transform((value) => sanitizeText(value, { maxLength: CUSTOM_TRIP_LOCATION_MAX_CHARS }))
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
      .max(
        CUSTOM_TRIP_REQUIREMENTS_MAX_CHARS,
        "Requirements must be 4,000 characters or fewer",
      )
      .trim()
      .transform((value) =>
        sanitizeText(value, {
          maxLength: CUSTOM_TRIP_REQUIREMENTS_MAX_CHARS,
          allowNewlines: true,
        }),
      )
      .optional(),
    contactName: z.string().optional(),
    contactEmail: z.string().optional(),
    contactPhone: z.string().optional(),
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
    .max(CUSTOM_TRIP_MESSAGE_MAX_CHARS, "Message must be 2,000 characters or fewer")
    .transform((value) =>
      sanitizeText(value, { maxLength: CUSTOM_TRIP_MESSAGE_MAX_CHARS, allowNewlines: true }),
    )
    .refine((value) => value.length > 0, "Message cannot be empty"),
});

export type CustomTripMessageInput = z.infer<typeof customTripMessageSchema>;

/**
 * Shared types and helpers for the guide trip-change workflow. Kept separate
 * from the server actions so the admin review page and the guide form can both
 * interpret the JSON snapshots without importing "use server" code.
 */

import { ACTIVITY_TYPE_LABELS, TRIP_CATEGORY_LABELS } from "@/lib/trip-metadata";

export type TripProposal = {
  slug: string;
  title: string;
  type: string;
  location: string;
  description: string;
  priceInRupees: number;
  durationDays: number;
  maxGroupSize: number;
  categories: string[];
  images: string[];
  videos: string[];
  mediaOrder: string[];
  pickup: string;
  drop: string;
  inclusions: string[];
  exclusions: string[];
  highlights: string[];
};

const FIELD_LABELS: Record<string, string> = {
  title: "Title",
  type: "Sport type",
  location: "Location",
  description: "Description",
  priceInRupees: "Price (₹)",
  durationDays: "Duration (days)",
  maxGroupSize: "Max group size",
  categories: "Categories",
  images: "Images",
  videos: "Videos",
  mediaOrder: "Media order",
  pickup: "Pickup point",
  drop: "Drop point",
  inclusions: "Included",
  exclusions: "Not included",
  highlights: "Highlights",
};

const FIELD_ORDER = [
  "title",
  "type",
  "location",
  "description",
  "priceInRupees",
  "durationDays",
  "maxGroupSize",
  "categories",
  "images",
  "videos",
  "mediaOrder",
  "pickup",
  "drop",
  "inclusions",
  "exclusions",
  "highlights",
] as const;

function formatValue(key: string, value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (key === "type") return ACTIVITY_TYPE_LABELS[String(value)] ?? String(value);
  if (key === "categories" && Array.isArray(value)) {
    return value.map((item) => TRIP_CATEGORY_LABELS[String(item)] ?? String(item)).join(", ");
  }
  if (Array.isArray(value)) return value.join("\n");
  return String(value);
}

export type TripDiffRow = {
  key: string;
  label: string;
  before: string;
  after: string;
};

/**
 * Lightweight summary of a trip change used by the guide's review history.
 * Title is extracted from the `proposed` JSON snapshot without loading the
 * full diff; the full snapshot is fetched lazily when a row is expanded.
 */
export type TripChangeSummary = {
  id: string;
  type: "CREATE" | "UPDATE";
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: Date;
  reviewedAt: Date | null;
  title: string | null;
};

/**
 * Lightweight summary of a trip change used by the admin review page. The
 * title is extracted from the `proposed` JSON snapshot without loading the
 * full diff; the full snapshot is fetched lazily when a card is expanded.
 */
export type AdminTripChangeSummary = {
  id: string;
  type: "CREATE" | "UPDATE" | "DELETE";
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: Date;
  reviewedAt: Date | null;
  title: string | null;
  guideName: string | null;
  submittedByName: string | null;
  submittedByUsername: string | null;
  tripTitle: string | null;
  reviewedByName: string | null;
};

/**
 * Produce the ordered list of changed fields for display in the admin review
 * UI. For a CREATE there is no `original`, so every field is shown as new.
 */
export function buildTripDiff(
  proposed: TripProposal,
  original: TripProposal | null,
): TripDiffRow[] {
  return FIELD_ORDER.filter((key) => {
    if (!original) return true;
    return formatValue(key, proposed[key]) !== formatValue(key, original[key]);
  }).map((key) => ({
    key,
    label: FIELD_LABELS[key],
    before: original ? formatValue(key, original[key]) : "—",
    after: formatValue(key, proposed[key]),
  }));
}

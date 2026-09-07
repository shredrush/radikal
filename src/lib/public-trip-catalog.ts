import type { Prisma, TripType } from "@/generated/prisma/client";
import { MAX_TRAVEL_STYLE_FILTERS } from "@/lib/trip-filter-constants";

export const PUBLIC_CATALOG_PAGE_SIZE = 24;
export const PUBLIC_CATALOG_OTHER_TRIPS_LIMIT = 12;
export const HOME_TRIP_LIMIT = 5;
export const HOME_SEARCH_LIMIT = 6;

export type PublicTripSearchParams = Record<string, string | string[] | undefined>;

export type PublicTripFilters = {
  page: number;
  query: string;
  sports: TripType[];
  travelStyles: string[];
  locations: string[];
  startDate: Date | null;
  endDate: Date | null;
};

export const publicTripCardSelect = {
  id: true,
  slug: true,
  title: true,
  type: true,
  travelStyleLinks: { where: { travelStyle: { active: true } }, select: { travelStyle: { select: { name: true, slug: true } } } },
  location: true,
  priceInRupees: true,
  durationDays: true,
  images: true,
} satisfies Prisma.TripSelect;

export const publicTripVisibilityWhere = {
  deletedAt: null,
  OR: [{ guideId: null }, { guide: { deletedAt: null, user: { deletedAt: null } } }],
} satisfies Prisma.TripWhereInput;

const SPORT_TYPES = {
  winter: ["SKI", "SNOWBOARD"],
  bike: ["BIKE"],
  trek: ["TREK"],
  expedition: ["EXPEDITION"],
  rockclimb: ["ROCKCLIMB"],
  yoga: ["YOGA"],
} as const satisfies Record<string, TripType[]>;

const SEARCH_TYPES: Record<string, TripType[]> = {
  trek: ["TREK"],
  trekking: ["TREK"],
  hiking: ["TREK"],
  hike: ["TREK"],
  bike: ["BIKE"],
  biking: ["BIKE"],
  cycling: ["BIKE"],
  cycle: ["BIKE"],
  mountain: ["BIKE"],
  mtb: ["BIKE"],
  ski: ["SKI", "SNOWBOARD"],
  skiing: ["SKI", "SNOWBOARD"],
  snowboard: ["SKI", "SNOWBOARD"],
  snowboarding: ["SKI", "SNOWBOARD"],
  snow: ["SKI", "SNOWBOARD"],
  winter: ["SKI", "SNOWBOARD"],
  rock: ["ROCKCLIMB"],
  climbing: ["ROCKCLIMB"],
  rockclimb: ["ROCKCLIMB"],
  bouldering: ["ROCKCLIMB"],
  yoga: ["YOGA"],
  meditation: ["YOGA"],
  wellness: ["YOGA"],
  expedition: ["EXPEDITION"],
  summit: ["EXPEDITION"],
  peak: ["EXPEDITION"],
  mountaineering: ["EXPEDITION"],
};

function getValues(params: PublicTripSearchParams, key: string) {
  const value = params[key];
  return (Array.isArray(value) ? value : value ? [value] : []).filter(Boolean);
}

function parseDate(value: string | undefined) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;

  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value ? null : date;
}

function parsePage(value: string | undefined) {
  const page = Number.parseInt(value ?? "", 10);
  return Number.isSafeInteger(page) && page > 0 ? page : 1;
}

export function getPublicTripFilters(params: PublicTripSearchParams): PublicTripFilters {
  const sports = getValues(params, "sport")
    .flatMap((sport) => SPORT_TYPES[sport as keyof typeof SPORT_TYPES] ?? [])
    .filter((sport, index, values) => values.indexOf(sport) === index)
    .slice(0, 3);
  const travelStyles = Array.from(
    new Set(
      getValues(params, "travelStyle")
        .map((style) => style.trim().toLowerCase())
        .filter((style) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(style)),
    ),
  ).slice(0, MAX_TRAVEL_STYLE_FILTERS);
  const locations = getValues(params, "location")
    .map((location) => location.trim().slice(0, 200))
    .filter(Boolean)
    .slice(0, 10);

  return {
    page: parsePage(getValues(params, "page")[0]),
    query: (getValues(params, "q")[0] ?? "").trim().slice(0, 200),
    sports,
    travelStyles,
    locations,
    startDate: parseDate(getValues(params, "startDate")[0]),
    endDate: parseDate(getValues(params, "endDate")[0]),
  };
}

export function getPublicTripFilterWhere(filters: PublicTripFilters): Prisma.TripWhereInput {
  const conditions: Prisma.TripWhereInput[] = [];

  if (filters.sports.length > 0) {
    conditions.push({ type: { in: filters.sports } });
  }

  if (filters.travelStyles.length > 0) {
    conditions.push({
      travelStyleLinks: { some: { travelStyle: { active: true, slug: { in: filters.travelStyles } } } },
    });
  }

  if (filters.locations.length > 0) {
    conditions.push({
      OR: filters.locations.map((location) => ({ location: { contains: location, mode: "insensitive" } })),
    });
  }

  if (filters.startDate || filters.endDate) {
    conditions.push({
      slots: {
        some: {
          deletedAt: null,
          date: {
            ...(filters.startDate ? { gte: filters.startDate } : {}),
            ...(filters.endDate ? { lte: filters.endDate } : {}),
          },
        },
      },
    });
  }

  const terms = filters.query.toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length > 0) {
    conditions.push({
      AND: terms.map((term) => {
        const types = SEARCH_TYPES[term] ?? [];
        return {
          OR: [
            { title: { contains: term, mode: "insensitive" } },
            { description: { contains: term, mode: "insensitive" } },
            { location: { contains: term, mode: "insensitive" } },
            { guide: { name: { contains: term, mode: "insensitive" } } },
            ...(types.length > 0 ? [{ type: { in: types } }] : []),
            { travelStyleLinks: { some: { travelStyle: { active: true, name: { contains: term, mode: "insensitive" } } } } },
          ],
        } satisfies Prisma.TripWhereInput;
      }),
    });
  }

  return conditions.length > 0 ? { AND: conditions } : {};
}

export function getPublicTripWhere(filters: PublicTripFilters): Prisma.TripWhereInput {
  return { AND: [publicTripVisibilityWhere, getPublicTripFilterWhere(filters)] };
}

export function hasPublicTripFilters(filters: PublicTripFilters) {
  return Boolean(
    filters.query ||
      filters.sports.length ||
      filters.travelStyles.length ||
      filters.locations.length ||
      filters.startDate ||
      filters.endDate,
  );
}

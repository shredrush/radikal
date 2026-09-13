import { NextResponse } from "next/server";

import { prisma, safeDb } from "@/lib/prisma";
import {
  getPublicTripFilters,
  getPublicTripWhere,
  publicTripMapSelect,
  type PublicTripSearchParams,
} from "@/lib/public-trip-catalog";

const VIEWPORT_LIMIT = 250;

function parseCoordinate(value: string | null, min: number, max: number) {
  if (value === null) return null;
  const coordinate = Number(value);
  return Number.isFinite(coordinate) && coordinate >= min && coordinate <= max ? coordinate : null;
}

function parseLongitude(value: string | null) {
  if (value === null) return null;
  const coordinate = Number(value);
  return Number.isFinite(coordinate) ? coordinate : null;
}

function normalizeLongitude(longitude: number) {
  return ((longitude + 180) % 360 + 360) % 360 - 180;
}

function readFilters(searchParams: URLSearchParams): PublicTripSearchParams {
  const filters: PublicTripSearchParams = {};
  for (const key of new Set(searchParams.keys())) {
    const values = searchParams.getAll(key);
    filters[key] = values.length > 1 ? values : values[0];
  }
  return filters;
}

type MapTripRow = {
  id: string;
  slug: string;
  title: string;
  location: string;
  latitude: number | null;
  longitude: number | null;
  priceInRupees: number;
  images: string[];
};

function toPublicTrip(trip: MapTripRow) {
  if (trip.latitude === null || trip.longitude === null) return null;
  return {
    ...trip,
    latitude: Math.round(trip.latitude * 1_000) / 1_000,
    longitude: Math.round(trip.longitude * 1_000) / 1_000,
  };
}

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const includeAll = searchParams.get("initial") === "1";
  const west = parseLongitude(searchParams.get("west"));
  const east = parseLongitude(searchParams.get("east"));
  const south = parseCoordinate(searchParams.get("south"), -90, 90);
  const north = parseCoordinate(searchParams.get("north"), -90, 90);

  if (west === null || east === null || south === null || north === null || south >= north) {
    return NextResponse.json({ trips: [], truncated: false }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }

  const filters = getPublicTripFilters(readFilters(searchParams));
  const normalizedWest = normalizeLongitude(west);
  const normalizedEast = normalizeLongitude(east);
  const longitudeWhere = Math.abs(east - west) >= 360
    ? {}
    : normalizedWest <= normalizedEast
      ? { longitude: { gte: normalizedWest, lte: normalizedEast } }
      : { OR: [{ longitude: { gte: normalizedWest } }, { longitude: { lte: normalizedEast } }] };
  const viewportWhere = includeAll
    ? { mapVisible: true, latitude: { not: null }, longitude: { not: null } }
    : { mapVisible: true, latitude: { gte: south, lte: north }, ...longitudeWhere };
  const rows = await safeDb(
    "trips.map-viewport",
    () => prisma.trip.findMany({
      where: {
        AND: [
          getPublicTripWhere(filters),
          viewportWhere,
        ],
      },
      select: publicTripMapSelect,
      orderBy: { createdAt: "desc" },
      take: VIEWPORT_LIMIT + 1,
    }),
    [],
  );
  const truncated = rows.length > VIEWPORT_LIMIT;
  const trips = rows.slice(0, VIEWPORT_LIMIT).flatMap((trip) => {
    const publicTrip = toPublicTrip(trip);
    return publicTrip ? [publicTrip] : [];
  });

  return NextResponse.json(
    { trips, truncated },
    { headers: { "Cache-Control": "no-store" } },
  );
}

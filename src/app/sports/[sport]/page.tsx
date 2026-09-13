import type { Metadata } from "next";
import { unstable_cache } from "next/cache";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import { SportGuidePage } from "@/components/sports/sport-guide-page";
import { prisma, safeDb } from "@/lib/prisma";
import { publicTripCardSelect, publicTripVisibilityWhere } from "@/lib/public-trip-catalog";
import { isSportGuideId, SPORT_GUIDES, type SportGuideId } from "@/lib/sport-guides";

const SPORT_GUIDE_TRIP_LIMIT = 4;

const getSportTrips = unstable_cache(async (sport: SportGuideId) => prisma.trip.findMany({
  where: { AND: [publicTripVisibilityWhere, { type: { in: SPORT_GUIDES[sport].tripTypes } }] },
  select: publicTripCardSelect,
  orderBy: { createdAt: "asc" },
  take: SPORT_GUIDE_TRIP_LIMIT,
}), ["sport-guide-trips"], { tags: ["trips"] });

function getGuideOr404(sport: string) {
  if (!isSportGuideId(sport)) notFound();
  return SPORT_GUIDES[sport];
}

export function generateStaticParams() {
  return Object.keys(SPORT_GUIDES).map((sport) => ({ sport }));
}

export async function generateMetadata({ params }: { params: Promise<{ sport: string }> }): Promise<Metadata> {
  const { sport } = await params;
  const guide = getGuideOr404(sport);
  const title = `${guide.label}: Beginner Guide`;
  return { title, description: guide.summary, alternates: { canonical: `/sports/${guide.id}` }, openGraph: { title, description: guide.summary, type: "website" } };
}

export default async function SportPage({ params }: { params: Promise<{ sport: string }> }) {
  // Trip availability is request data; do not make the database a build dependency.
  await connection();
  const { sport } = await params;
  const guide = getGuideOr404(sport);
  const trips = await safeDb("sport-guide.trips", () => getSportTrips(guide.id), []);
  return <SportGuidePage guide={guide} trips={trips} />;
}

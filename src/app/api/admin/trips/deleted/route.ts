import { NextResponse } from "next/server";
import { TripType } from "@/generated/prisma/client";

import { getAuthorizedUser } from "@/lib/authz";
import { getDatabaseErrorStatus, loadDb, prisma } from "@/lib/prisma";
import { fetchDeletedTripsWithDetails } from "@/lib/trips";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await getAuthorizedUser("trips.manage");
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const guideId = searchParams.get("guide") || undefined;
    const type = searchParams.get("type");
    const validType = Object.values(TripType).includes(type as TripType) ? (type as TripType) : undefined;
    const where = { ...(guideId ? { guideId } : {}), ...(validType ? { type: validType } : {}) };

    const deletedTrips = await loadDb("api.admin.trips.deleted", () =>
      fetchDeletedTripsWithDetails(where, { take: 50 }),
    );
    const deletedByIds = [...new Set(deletedTrips.map((trip) => trip.deletedById).filter((id): id is string => Boolean(id)))];
    const deletedByUsers = deletedByIds.length
      ? await loadDb("api.admin.trips.deleted-by-users", () =>
          prisma.user.findMany({
            where: { id: { in: deletedByIds } },
            select: { id: true, name: true, email: true },
          }),
        )
      : [];
    const deletedByNameById = Object.fromEntries(
      deletedByUsers.map((user) => [user.id, user.name || user.email]),
    );

    return NextResponse.json({ trips: deletedTrips, deletedByNameById });
  } catch (error) {
    console.error("[api/admin/trips/deleted] failed to load deleted trips", error);
    return NextResponse.json({ error: "Failed to load deleted trips" }, { status: getDatabaseErrorStatus(error) });
  }
}

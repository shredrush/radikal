import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { getDatabaseErrorStatus, prisma } from "@/lib/prisma";
import { toProfileCustomTripRequest } from "@/lib/custom-trips";

export const dynamic = "force-dynamic";
const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 25;

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const cursor = searchParams.get("cursor") || undefined;
  const requestedLimit = Number(searchParams.get("limit"));
  const limit = Number.isFinite(requestedLimit)
    ? Math.min(Math.max(Math.trunc(requestedLimit), 1), MAX_PAGE_SIZE)
    : DEFAULT_PAGE_SIZE;

  try {
    const requests = await prisma.customTripRequest.findMany({
      where: { userId: session.user.id, deletedAt: null },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: {
        id: true,
        status: true,
        groupType: true,
        sports: true,
        location: true,
        startDate: true,
        endDate: true,
        participantCount: true,
        budgetRupees: true,
      },
    });
    const page = requests.slice(0, limit);

    return NextResponse.json({
      requests: page.map(toProfileCustomTripRequest),
      nextCursor: requests.length > limit ? page.at(-1)?.id : null,
    });
  } catch (error) {
    console.error("[api/profile/custom-trips] failed to load requests", error);
    return NextResponse.json({ error: "Failed to load requests" }, { status: getDatabaseErrorStatus(error) });
  }
}

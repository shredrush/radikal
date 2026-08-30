import { NextResponse } from "next/server";

import { getAuthorizedUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { toCustomTripRequestListItem } from "@/lib/custom-trips";

export const dynamic = "force-dynamic";
const MAX_REQUESTS = 100;

export async function GET() {
  const user = await getAuthorizedUser("support.manage");
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [requests, deletedRequests] = await Promise.all([
      prisma.customTripRequest.findMany({
        where: { deletedAt: null },
        orderBy: { updatedAt: "desc" },
        take: MAX_REQUESTS,
        include: {
          user: { select: { id: true, name: true, email: true, username: true } },
          chat: { include: { messages: { orderBy: { createdAt: "desc" }, take: 1 } } },
        },
      }),
      prisma.customTripRequest.findMany({
        where: { deletedAt: { not: null } },
        orderBy: { deletedAt: "desc" },
        take: MAX_REQUESTS,
        include: {
          user: { select: { id: true, name: true, email: true, username: true } },
          chat: { include: { messages: { orderBy: { createdAt: "desc" }, take: 1 } } },
        },
      }),
    ]);

    return NextResponse.json({
      requests: requests.map(toCustomTripRequestListItem),
      deleted: deletedRequests.map(toCustomTripRequestListItem),
    });
  } catch (error) {
    console.error("[api/custom-trips/requests] failed to load requests", error);
    return NextResponse.json({ error: "Failed to load requests" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { toCustomTripRequestListItem } from "@/lib/custom-trips";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();

  if (!session?.user || !hasPermission(session.user.role, "support.manage")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [requests, deletedRequests] = await Promise.all([
      prisma.customTripRequest.findMany({
        where: { deletedAt: null },
        orderBy: { updatedAt: "desc" },
        include: {
          user: { select: { id: true, name: true, email: true, username: true } },
          chat: { include: { messages: { orderBy: { createdAt: "desc" }, take: 1 } } },
        },
      }),
      prisma.customTripRequest.findMany({
        where: { deletedAt: { not: null } },
        orderBy: { deletedAt: "desc" },
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

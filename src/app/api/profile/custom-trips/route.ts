import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toCustomTripRequestListItem } from "@/lib/custom-trips";

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
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: {
        user: { select: { id: true, name: true, email: true, username: true } },
        chat: { include: { messages: { orderBy: { createdAt: "desc" }, take: 1 } } },
      },
    });
    const page = requests.slice(0, limit);

    return NextResponse.json({
      requests: page.map(toCustomTripRequestListItem),
      nextCursor: requests.length > limit ? page.at(-1)?.id : null,
    });
  } catch (error) {
    console.error("[api/profile/custom-trips] failed to load requests", error);
    return NextResponse.json({ error: "Failed to load requests" }, { status: 500 });
  }
}

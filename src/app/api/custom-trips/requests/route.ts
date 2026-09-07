import { NextResponse } from "next/server";
import type { Prisma } from "@/generated/prisma/client";

import { getAuthorizedUser } from "@/lib/authz";
import { getDatabaseErrorStatus, prisma } from "@/lib/prisma";
import { toCustomTripRequestBoardListItem } from "@/lib/custom-trips";

export const dynamic = "force-dynamic";
const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 50;
type RequestSection = "open" | "confirmed" | "cancelled" | "deleted";

const SECTION_WHERE: Record<RequestSection, Prisma.CustomTripRequestWhereInput> = {
  open: { deletedAt: null, status: { notIn: ["CONFIRMED", "CANCELLED"] } },
  confirmed: { deletedAt: null, status: "CONFIRMED" },
  cancelled: { deletedAt: null, status: "CANCELLED" },
  deleted: { deletedAt: { not: null } },
};

function isRequestSection(value: string | null): value is RequestSection {
  return value === "open" || value === "confirmed" || value === "cancelled" || value === "deleted";
}

export async function GET(request: Request) {
  let user;
  try {
    user = await getAuthorizedUser("support.manage");
  } catch (error) {
    console.error("[api/custom-trips/requests] failed to authorize request", error);
    return NextResponse.json({ error: "Service unavailable" }, { status: getDatabaseErrorStatus(error) });
  }
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const section = searchParams.get("section");
  if (!isRequestSection(section)) {
    return NextResponse.json({ error: "Invalid request section" }, { status: 400 });
  }

  const cursor = searchParams.get("cursor") || undefined;
  const requestedLimit = Number(searchParams.get("limit"));
  const limit = Number.isFinite(requestedLimit)
    ? Math.min(Math.max(Math.trunc(requestedLimit), 1), MAX_PAGE_SIZE)
    : DEFAULT_PAGE_SIZE;

  try {
    const requests = await prisma.customTripRequest.findMany({
      where: SECTION_WHERE[section],
      orderBy: section === "deleted"
        ? [{ deletedAt: "desc" }, { id: "desc" }]
        : [{ updatedAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: {
        id: true,
        status: true,
        groupType: true,
        startDate: true,
        endDate: true,
        updatedAt: true,
        deletedAt: true,
        user: { select: { name: true, email: true } },
        chat: {
          select: {
            messages: {
              select: { senderId: true, body: true },
              orderBy: { createdAt: "desc" },
              take: 1,
            },
          },
        },
      },
    });

    const page = requests.slice(0, limit);
    return NextResponse.json({
      [section]: page.map(toCustomTripRequestBoardListItem),
      nextCursor: requests.length > limit ? page.at(-1)?.id ?? null : null,
    });
  } catch (error) {
    console.error("[api/custom-trips/requests] failed to load requests", error);
    return NextResponse.json({ error: "Failed to load requests" }, { status: getDatabaseErrorStatus(error) });
  }
}

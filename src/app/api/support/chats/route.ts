import { NextResponse } from "next/server";
import type { Prisma } from "@/generated/prisma/client";

import { getAuthorizedUser } from "@/lib/authz";
import { getDatabaseErrorStatus, prisma } from "@/lib/prisma";
import { toSupportChatBoardListItem } from "@/lib/support";

export const dynamic = "force-dynamic";
const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 50;
type ChatSection = "open" | "closed" | "resolved";

const SECTION_WHERE: Record<ChatSection, Prisma.SupportChatWhereInput> = {
  open: { deletedAt: null, status: "OPEN" },
  closed: { deletedAt: null, status: "CLOSED" },
  resolved: { deletedAt: { not: null } },
};

function isChatSection(value: string | null): value is ChatSection {
  return value === "open" || value === "closed" || value === "resolved";
}

export async function GET(request: Request) {
  let user;
  try {
    user = await getAuthorizedUser("support.manage");
  } catch (error) {
    console.error("[api/support/chats] failed to authorize request", error);
    return NextResponse.json({ error: "Service unavailable" }, { status: getDatabaseErrorStatus(error) });
  }
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const section = searchParams.get("section");
  if (!isChatSection(section)) {
    return NextResponse.json({ error: "Invalid chat section" }, { status: 400 });
  }

  const cursor = searchParams.get("cursor") || undefined;
  const requestedLimit = Number(searchParams.get("limit"));
  const limit = Number.isFinite(requestedLimit)
    ? Math.min(Math.max(Math.trunc(requestedLimit), 1), MAX_PAGE_SIZE)
    : DEFAULT_PAGE_SIZE;

  try {
    const chats = await prisma.supportChat.findMany({
      where: SECTION_WHERE[section],
      orderBy: section === "resolved"
        ? [{ deletedAt: "desc" }, { id: "desc" }]
        : [{ updatedAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: {
        id: true,
        status: true,
        updatedAt: true,
        deletedAt: true,
        user: { select: { id: true, name: true, email: true } },
        messages: {
          select: { senderId: true, body: true },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    const page = chats.slice(0, limit);
    return NextResponse.json({
      [section]: page.map(toSupportChatBoardListItem),
      nextCursor: chats.length > limit ? page.at(-1)?.id ?? null : null,
    });
  } catch (error) {
    console.error("[api/support/chats] failed to load conversations", error);
    return NextResponse.json({ error: "Failed to load conversations" }, { status: getDatabaseErrorStatus(error) });
  }
}

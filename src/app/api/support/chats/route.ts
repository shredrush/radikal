import { NextResponse } from "next/server";
import type { Prisma } from "@/generated/prisma/client";

import { getAuthorizedUser } from "@/lib/authz";
import { getDatabaseErrorStatus, prisma } from "@/lib/prisma";
import { toSupportChatBoardListItem } from "@/lib/support";

export const dynamic = "force-dynamic";
const MAX_CHATS = 100;
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

  const section = new URL(request.url).searchParams.get("section");
  if (!isChatSection(section)) {
    return NextResponse.json({ error: "Invalid chat section" }, { status: 400 });
  }

  try {
    const chats = await prisma.supportChat.findMany({
      where: SECTION_WHERE[section],
      orderBy: section === "resolved" ? { deletedAt: "desc" } : { updatedAt: "desc" },
      take: MAX_CHATS,
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

    return NextResponse.json({
      [section]: chats.map(toSupportChatBoardListItem),
    });
  } catch (error) {
    console.error("[api/support/chats] failed to load conversations", error);
    return NextResponse.json({ error: "Failed to load conversations" }, { status: getDatabaseErrorStatus(error) });
  }
}

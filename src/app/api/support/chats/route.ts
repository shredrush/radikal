import { NextResponse } from "next/server";

import { getAuthorizedUser } from "@/lib/authz";
import { getDatabaseErrorStatus, prisma } from "@/lib/prisma";
import { toSupportChatListItem } from "@/lib/support";

export const dynamic = "force-dynamic";
const MAX_CHATS = 100;

export async function GET() {
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

  try {
    const [chats, resolved] = await Promise.all([
      prisma.supportChat.findMany({
        where: { deletedAt: null },
        orderBy: { updatedAt: "desc" },
        take: MAX_CHATS,
        include: {
          user: { select: { id: true, name: true, email: true } },
          messages: { orderBy: { createdAt: "desc" }, take: 1 },
        },
      }),
      prisma.supportChat.findMany({
        where: { deletedAt: { not: null } },
        orderBy: { deletedAt: "desc" },
        take: MAX_CHATS,
        include: {
          user: { select: { id: true, name: true, email: true } },
          messages: { orderBy: { createdAt: "desc" }, take: 1 },
        },
      }),
    ]);

    return NextResponse.json({
      chats: chats.map(toSupportChatListItem),
      resolved: resolved.map(toSupportChatListItem),
    });
  } catch (error) {
    console.error("[api/support/chats] failed to load conversations", error);
    return NextResponse.json({ error: "Failed to load conversations" }, { status: getDatabaseErrorStatus(error) });
  }
}

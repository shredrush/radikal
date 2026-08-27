import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { toSupportChatListItem } from "@/lib/support";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();

  if (!session?.user || !hasPermission(session.user.role, "support.manage")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const chats = await prisma.supportChat.findMany({
      orderBy: { updatedAt: "desc" },
      include: {
        user: { select: { id: true, name: true, email: true } },
        messages: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    });

    return NextResponse.json({ chats: chats.map(toSupportChatListItem) });
  } catch (error) {
    console.error("[api/support/chats] failed to load conversations", error);
    return NextResponse.json({ error: "Failed to load conversations" }, { status: 500 });
  }
}

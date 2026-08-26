import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { countUnreadSupportMessages, toSupportMessageViews } from "@/lib/support";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const chatId = searchParams.get("chatId");

  try {
    // Users with support access may read any conversation by id; everyone
    // else reads their own (single) support thread.
    if (hasPermission(session.user.role, "support.manage") && chatId) {
      const chat = await prisma.supportChat.findUnique({
        where: { id: chatId },
        include: { messages: { orderBy: { createdAt: "asc" } } },
      });

      if (!chat) {
        return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
      }

      return NextResponse.json({
        status: chat.status,
        messages: toSupportMessageViews(chat.messages, session.user.id),
      });
    }

    const chat = await prisma.supportChat.findUnique({
      where: { userId: session.user.id },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });

    // Viewing the thread marks any pending agent replies as read for the
    // customer, which clears the unread notification badge.
    if (chat && countUnreadSupportMessages(chat, session.user.id) > 0) {
      await prisma.supportChat.update({
        where: { id: chat.id },
        data: { customerLastReadAt: new Date() },
      });
    }

    return NextResponse.json({
      status: chat?.status ?? "OPEN",
      messages: chat ? toSupportMessageViews(chat.messages, session.user.id) : [],
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load messages" },
      { status: 500 },
    );
  }
}

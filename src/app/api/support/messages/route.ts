import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { countUnreadSupportMessages, toSupportMessageViews } from "@/lib/support";

export const dynamic = "force-dynamic";

// Cap the number of messages loaded per request so long-running threads don't
// grow the response (and the 3s poll) without bound. The newest messages are
// fetched and re-sorted to chronological order for display.
const MAX_MESSAGES = 100;

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
        include: { messages: { orderBy: { createdAt: "desc" }, take: MAX_MESSAGES } },
      });

      if (!chat) {
        return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
      }

      return NextResponse.json({
        status: chat.status,
        messages: toSupportMessageViews(chat.messages.slice().reverse(), session.user.id),
      });
    }

    const chat = await prisma.supportChat.findUnique({
      where: { userId: session.user.id },
      include: { messages: { orderBy: { createdAt: "desc" }, take: MAX_MESSAGES } },
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
      messages: chat ? toSupportMessageViews(chat.messages.slice().reverse(), session.user.id) : [],
    });
  } catch (error) {
    console.error("[api/support/messages] failed to load messages", error);
    return NextResponse.json({ error: "Failed to load messages" }, { status: 500 });
  }
}

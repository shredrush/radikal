import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { getAuthorizedUser } from "@/lib/authz";
import { getDatabaseErrorStatus, prisma } from "@/lib/prisma";
import { revalidateProfileSummary } from "@/lib/profile-summary";
import { countUnreadSupportMessages, toSupportMessageViews } from "@/lib/support";

export const dynamic = "force-dynamic";

// Cap the number of messages loaded per request so long-running threads don't
// grow the response without bound. The newest messages are fetched and
// re-sorted to chronological order for display.
const MAX_MESSAGES = 100;

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const chatId = searchParams.get("chatId");
  const after = searchParams.get("after");

  try {
    // Users with support access may read any conversation by id; everyone
    // else reads their own (single) support thread.
    const supportUser = chatId ? await getAuthorizedUser("support.manage") : null;
    if (supportUser && chatId) {
      const chat = await prisma.supportChat.findUnique({
        where: { id: chatId },
        select: {
          status: true,
          messages: {
            select: { id: true, body: true, senderId: true, createdAt: true },
            ...(after ? { cursor: { id: after }, skip: 1 } : {}),
            orderBy: [{ createdAt: after ? "asc" : "desc" }, { id: after ? "asc" : "desc" }],
            take: MAX_MESSAGES,
          },
        },
      });

      if (!chat) {
        return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
      }

      return NextResponse.json({
        status: chat.status,
        messages: toSupportMessageViews(after ? chat.messages : chat.messages.slice().reverse(), supportUser.id),
      });
    }

    const chat = await prisma.supportChat.findUnique({
      where: { userId: session.user.id, deletedAt: null },
      select: {
        id: true,
        status: true,
        createdAt: true,
        customerLastReadAt: true,
        messages: {
          select: { id: true, body: true, senderId: true, createdAt: true },
          ...(after ? { cursor: { id: after }, skip: 1 } : {}),
          orderBy: [{ createdAt: after ? "asc" : "desc" }, { id: after ? "asc" : "desc" }],
          take: MAX_MESSAGES,
        },
      },
    });

    // Viewing the thread marks any pending agent replies as read for the
    // customer, which clears the unread notification badge.
    if (chat && countUnreadSupportMessages(chat, session.user.id) > 0) {
      await prisma.supportChat.update({
        where: { id: chat.id },
        data: { customerLastReadAt: new Date() },
      });
      revalidateProfileSummary(session.user.id);
    }

    return NextResponse.json({
      status: chat?.status ?? "OPEN",
      messages: chat ? toSupportMessageViews(after ? chat.messages : chat.messages.slice().reverse(), session.user.id) : [],
    });
  } catch (error) {
    console.error("[api/support/messages] failed to load messages", error);
    return NextResponse.json({ error: "Failed to load messages" }, { status: getDatabaseErrorStatus(error) });
  }
}

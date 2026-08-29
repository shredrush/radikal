import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { countUnreadSupportMessages } from "@/lib/support";

export const dynamic = "force-dynamic";

/**
 * Lightweight endpoint for the floating support widget. Returns the number of
 * unread support-agent replies for the signed-in customer so the launcher can
 * show a notification badge without loading the full thread. Also reports the
 * auth role and whether the customer has an existing thread, so the widget can
 * determine its state entirely client-side (no server DB round-trip per page).
 */
export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Users with support access don't have their own customer thread, so there
  // is nothing to surface as "unread" for them.
  if (hasPermission(session.user.role, "support.manage")) {
    return NextResponse.json({
      unreadCount: 0,
      status: "OPEN",
      isSupportAgent: true,
      hasActiveChat: false,
    });
  }

  try {
    const chat = await prisma.supportChat.findUnique({
      where: { userId: session.user.id, deletedAt: null },
      include: { messages: { select: { senderId: true, createdAt: true } } },
    });

    if (!chat) {
      return NextResponse.json({
        unreadCount: 0,
        status: "OPEN",
        isSupportAgent: false,
        hasActiveChat: false,
      });
    }

    return NextResponse.json({
      unreadCount: countUnreadSupportMessages(chat, session.user.id),
      status: chat.status,
      isSupportAgent: false,
      hasActiveChat: true,
    });
  } catch (error) {
    console.error("[api/support/unread] failed to load notifications", error);
    return NextResponse.json({ error: "Failed to load notifications" }, { status: 500 });
  }
}

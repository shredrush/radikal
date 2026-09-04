import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { getAuthorizedUser } from "@/lib/authz";
import { getDatabaseErrorStatus, prisma } from "@/lib/prisma";

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

  try {
    // Users with support access don't have their own customer thread, so there
    // is nothing to surface as "unread" for them.
    if (await getAuthorizedUser("support.manage")) {
      return NextResponse.json({
        unreadCount: 0,
        status: "OPEN",
        isSupportAgent: true,
        hasActiveChat: false,
      });
    }

    const rows = await prisma.$queryRaw<Array<{ status: "OPEN" | "CLOSED"; unreadCount: number }>>`
      SELECT sc.status, COUNT(sm.id)::int AS "unreadCount"
      FROM support_chats sc
      LEFT JOIN support_messages sm
        ON sm."chatId" = sc.id
       AND sm."senderId" <> ${session.user.id}
       AND sm."createdAt" > COALESCE(sc."customerLastReadAt", sc."createdAt")
      WHERE sc."userId" = ${session.user.id} AND sc."deletedAt" IS NULL
      GROUP BY sc.id, sc.status
    `;
    const chat = rows[0];

    if (!chat) {
      return NextResponse.json({
        unreadCount: 0,
        status: "OPEN",
        isSupportAgent: false,
        hasActiveChat: false,
      });
    }

    return NextResponse.json({
      unreadCount: chat.unreadCount,
      status: chat.status,
      isSupportAgent: false,
      hasActiveChat: true,
    });
  } catch (error) {
    console.error("[api/support/unread] failed to load notifications", error);
    return NextResponse.json({ error: "Failed to load notifications" }, { status: getDatabaseErrorStatus(error) });
  }
}

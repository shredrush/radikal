import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { countUnreadSupportMessages } from "@/lib/support";

export const dynamic = "force-dynamic";

/**
 * Lightweight endpoint for the floating support widget to poll. Returns the
 * number of unread support-agent replies for the signed-in customer so the
 * launcher can show a notification badge without loading the full thread.
 */
export async function GET() {
  const session = await auth();

  if (!session?.user || session.user.role === "SUPPORT") {
    return NextResponse.json({ unreadCount: 0, status: "OPEN" });
  }

  try {
    const chat = await prisma.supportChat.findUnique({
      where: { userId: session.user.id },
      include: { messages: { select: { senderId: true, createdAt: true } } },
    });

    if (!chat) {
      return NextResponse.json({ unreadCount: 0, status: "OPEN" });
    }

    return NextResponse.json({
      unreadCount: countUnreadSupportMessages(chat, session.user.id),
      status: chat.status,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load notifications" },
      { status: 500 },
    );
  }
}

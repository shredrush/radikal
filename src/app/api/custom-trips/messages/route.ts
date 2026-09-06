import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { getAuthorizedUser } from "@/lib/authz";
import { getDatabaseErrorStatus, prisma } from "@/lib/prisma";
import { toCustomTripMessageViews } from "@/lib/custom-trips";

export const dynamic = "force-dynamic";

// Cap every response so long-running threads do not grow the response without
// bound. Polls pass the last message id as a cursor and receive only deltas.
const MAX_MESSAGES = 100;

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const requestId = searchParams.get("requestId");
  const after = searchParams.get("after");

  if (!requestId) {
    return NextResponse.json({ error: "Missing request" }, { status: 400 });
  }

  try {
    const supportUser = await getAuthorizedUser("support.manage");
    const where = supportUser ? { id: requestId } : { id: requestId, userId: session.user.id };

    const customTrip = await prisma.customTripRequest.findFirst({
      where,
      select: {
        status: true,
        chat: { select: { id: true } },
      },
    });

    if (!customTrip?.chat) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    const cursor = after
      ? await prisma.customTripMessage.findFirst({
          where: { id: after, chatId: customTrip.chat.id },
          select: { id: true },
        })
      : null;
    const messages = after
      ? cursor
        ? await prisma.customTripMessage.findMany({
            where: { chatId: customTrip.chat.id },
            cursor: { id: cursor.id },
            skip: 1,
            select: { id: true, body: true, senderId: true, createdAt: true },
            orderBy: [{ createdAt: "asc" }, { id: "asc" }],
            take: MAX_MESSAGES,
          })
        : []
      : (
          await prisma.customTripMessage.findMany({
            where: { chatId: customTrip.chat.id },
            select: { id: true, body: true, senderId: true, createdAt: true },
            orderBy: [{ createdAt: "desc" }, { id: "desc" }],
            take: MAX_MESSAGES,
          })
        ).reverse();

    return NextResponse.json({
      status: customTrip.status,
      messages: toCustomTripMessageViews(
        messages,
        supportUser?.id ?? session.user.id,
      ),
    });
  } catch (error) {
    console.error("[api/custom-trips/messages] failed to load messages", error);
    return NextResponse.json({ error: "Failed to load messages" }, { status: getDatabaseErrorStatus(error) });
  }
}

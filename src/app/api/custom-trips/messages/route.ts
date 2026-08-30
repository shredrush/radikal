import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { getAuthorizedUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { toCustomTripMessageViews } from "@/lib/custom-trips";

export const dynamic = "force-dynamic";

// Cap the number of messages loaded per request so long-running threads don't
// grow the response without bound. Newest messages are fetched and re-sorted
// to chronological order for display.
const MAX_MESSAGES = 100;

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const requestId = searchParams.get("requestId");

  if (!requestId) {
    return NextResponse.json({ error: "Missing request" }, { status: 400 });
  }

  try {
    const supportUser = await getAuthorizedUser("support.manage");
    const where = supportUser ? { id: requestId } : { id: requestId, userId: session.user.id };

    const customTrip = await prisma.customTripRequest.findFirst({
      where,
      include: {
        chat: {
          include: { messages: { orderBy: { createdAt: "desc" }, take: MAX_MESSAGES } },
        },
      },
    });

    if (!customTrip?.chat) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    return NextResponse.json({
      status: customTrip.status,
      messages: toCustomTripMessageViews(
        customTrip.chat.messages.slice().reverse(),
        supportUser?.id ?? session.user.id,
      ),
    });
  } catch (error) {
    console.error("[api/custom-trips/messages] failed to load messages", error);
    return NextResponse.json({ error: "Failed to load messages" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { isSupportAgent } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { toCustomTripMessageViews } from "@/lib/custom-trips";

export const dynamic = "force-dynamic";

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
    const where = isSupportAgent(session.user.role)
      ? { id: requestId }
      : { id: requestId, userId: session.user.id };

    const customTrip = await prisma.customTripRequest.findFirst({
      where,
      include: {
        chat: { include: { messages: { orderBy: { createdAt: "asc" } } } },
      },
    });

    if (!customTrip?.chat) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    return NextResponse.json({
      status: customTrip.status,
      messages: toCustomTripMessageViews(customTrip.chat.messages, session.user.id),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load messages" },
      { status: 500 },
    );
  }
}

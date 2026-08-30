import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ tripId: string }> }) {
  const session = await auth();
  const { tripId } = await params;
  const userId = session?.user?.id;
  const wishlisted = userId
    ? Boolean(await prisma.wishlistItem.findFirst({ where: { userId, tripId, deletedAt: null }, select: { id: true } }))
    : false;

  return NextResponse.json({ wishlisted }, { headers: { "Cache-Control": "private, no-store" } });
}

import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { safeDb } from "@/lib/prisma";
import { getProfileUser } from "@/lib/profile-user";
import { getProfileSummary } from "@/lib/profile-summary";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || !session.user.role) {
    return NextResponse.json(null, { headers: { "Cache-Control": "private, no-store" } });
  }

  // The header is an enhancement. Keep it usable from JWT fields if the
  // profile lookup is temporarily unavailable instead of returning a 500.
  const [profile, summary] = await Promise.all([
    safeDb(
      "header-account.profile",
      () => getProfileUser(session.user.id),
      null,
    ),
    safeDb(
      "header-account.summary",
      () => getProfileSummary(session.user.id),
      { unreadNotifications: 0, bookingTotal: 0, upcomingBookings: 0, supportUnread: 0 },
    ),
  ]);
  const image = profile?.image ?? session.user.image ?? null;

  return NextResponse.json({
    name: profile?.name ?? session.user.name ?? null,
    username: profile?.username ?? session.user.username ?? null,
    email: session.user.email ?? null,
    role: session.user.role,
    image,
    unreadNotifications: summary.unreadNotifications,
  }, { headers: { "Cache-Control": "private, no-store" } });
}

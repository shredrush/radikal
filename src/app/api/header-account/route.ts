import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { getGuideImage } from "@/lib/guide-images";
import { getProfileUser } from "@/lib/profile-user";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || !session.user.role) {
    return NextResponse.json(null, { headers: { "Cache-Control": "private, no-store" } });
  }

  const profile = await getProfileUser(session.user.id);
  const guide = profile?.guide && !profile.guide.deletedAt ? profile.guide : null;
  const image = guide ? getGuideImage({ username: guide.user?.username ?? "", photo: guide.photo, photos: guide.photos }) : profile?.image ?? session.user.image ?? null;

  return NextResponse.json({ name: session.user.name ?? null, email: session.user.email ?? null, role: session.user.role, image }, { headers: { "Cache-Control": "private, no-store" } });
}

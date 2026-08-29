import { NextResponse } from "next/server";

import { sweepOrphanMedia } from "@/lib/media-cleanup";

export const dynamic = "force-dynamic";

/**
 * Daily sweep that deletes unreferenced Supabase Storage objects (uploads that
 * were never committed, or media replaced by an edit) so abandoned files do not
 * accumulate storage and egress cost. Wired up as a Vercel Cron via
 * vercel.json. Fails closed: the endpoint only runs when CRON_SECRET is
 * configured in the environment and the request carries the matching bearer
 * token (which Vercel Cron attaches).
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await sweepOrphanMedia();

  return NextResponse.json(result);
}

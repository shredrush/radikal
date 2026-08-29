import { NextResponse } from "next/server";

import { completePastBookings } from "@/lib/booking-completion";

export const dynamic = "force-dynamic";

/**
 * Daily sweep that flips CONFIRMED bookings whose trip dates have fully passed
 * to COMPLETED. Keeps the platform-wide completion scan out of per-user read
 * paths (the profile page only completes the current user's bookings lazily).
 * Wired up as a Vercel Cron via vercel.json. Fails closed: the endpoint only
 * runs when CRON_SECRET is configured in the environment and the request
 * carries the matching bearer token (which Vercel Cron attaches).
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const completed = await completePastBookings();

  return NextResponse.json({ completed });
}

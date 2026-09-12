import { NextResponse } from "next/server";

import { deliverEmail } from "@/lib/email";
import { processEmailOutbox } from "@/lib/email-outbox";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Processes persisted mail jobs. Vercel Cron authenticates with CRON_SECRET. */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await processEmailOutbox(deliverEmail);
  console.info("[email] outbox worker completed", result);
  return NextResponse.json(result);
}

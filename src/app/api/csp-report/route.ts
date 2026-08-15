import { NextResponse } from "next/server";

// Receives Content-Security-Policy violation reports from the report-only
// policy defined in next.config.ts. The policy is not enforced yet, so this
// endpoint just acknowledges reports. Wire it to your logging/monitoring
// backend when you are ready to analyze violations before enforcing the CSP.
export async function POST(request: Request) {
  try {
    // Consume the body so the request completes cleanly. Parse and forward it
    // to a logging service here when you want to collect reports.
    await request.text();
  } catch {
    // Ignore malformed report bodies.
  }

  return new NextResponse(null, { status: 204 });
}

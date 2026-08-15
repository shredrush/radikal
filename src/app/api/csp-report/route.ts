import { NextResponse } from "next/server";

// Receives Content-Security-Policy violation reports from the report-only
// policy defined in next.config.ts. The policy is not enforced yet, so this
// endpoint just acknowledges reports. Wire it to your logging/monitoring
// backend when you are ready to analyze violations before enforcing the CSP.
export async function POST(request: Request) {
  try {
    // Consume the body so the request completes cleanly. Parse and forward it
    // to a logging service here when you want to collect reports.
    const body = await request.text();

    // Temporary: surface reports in the server terminal while tuning the CSP.
    // Remove (or replace with a real logging sink) before enforcing in prod.
    try {
      const parsed = JSON.parse(body);
      console.log("[csp-report]", JSON.stringify(parsed, null, 2));
    } catch {
      console.log("[csp-report] (non-JSON body)", body);
    }
  } catch {
    // Ignore malformed report bodies.
  }

  return new NextResponse(null, { status: 204 });
}

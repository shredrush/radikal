import { NextResponse } from "next/server";
import { getClientIp, rateLimit } from "@/lib/rate-limit";

const MAX_REPORT_BYTES = 16_384;

// Receives Content-Security-Policy violation reports from the report-only
// policy defined in next.config.ts. The policy is not enforced yet, so this
// endpoint just acknowledges reports. Wire it to your logging/monitoring
// backend when you are ready to analyze violations before enforcing the CSP.
export async function POST(request: Request) {
  const ip = await getClientIp();
  const reportLimit = rateLimit(`csp-report:ip:${ip}`, 60, 60_000);
  if (!reportLimit.success) {
    return new NextResponse(null, { status: 429 });
  }

  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_REPORT_BYTES) {
    return new NextResponse(null, { status: 413 });
  }

  try {
    // Consume the body so the request completes cleanly. Parse and forward it
    // to a logging service here when you want to collect reports.
    const body = (await request.text()).slice(0, MAX_REPORT_BYTES);

    // Temporary: surface reports in the server terminal while tuning the CSP.
    // Remove (or replace with a real logging sink) before enforcing in prod.
    try {
      const parsed = JSON.parse(body);
      console.info("[csp-report]", JSON.stringify(parsed));
    } catch {
      console.info("[csp-report] non-JSON body received");
    }
  } catch {
    // Ignore malformed report bodies.
  }

  return new NextResponse(null, { status: 204 });
}

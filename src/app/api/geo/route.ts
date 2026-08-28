import { NextResponse } from "next/server";

import { getClientCountry } from "@/lib/geo";

// Returns the visitor's ISO-3166-1 alpha-2 country code (or null), derived from
// the trusted Vercel geo headers. Moved out of the root layout so the layout
// stays static — this endpoint is the only place that reads the geo header.
export async function GET() {
  const country = await getClientCountry();
  return NextResponse.json({ country });
}

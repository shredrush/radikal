import { NextResponse, type NextRequest } from "next/server";

import {
  createReferralAttribution,
  parseReferralAttribution,
  REFERRAL_COOKIE_MAX_AGE_SECONDS,
  REFERRAL_COOKIE_NAME,
  normalizeReferralCode,
} from "@/lib/referrals";
import { prisma, safeDb } from "@/lib/prisma";
import { getClientIp, rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

function signupRedirect(request: NextRequest) {
  return NextResponse.redirect(new URL("/signup", request.url));
}

/**
 * Referral codes are deliberately public and only establish signup attribution.
 * This route always redirects to signup, including for invalid or rate-limited
 * codes, so it cannot be used to enumerate active guides.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const ip = await getClientIp();
  if (!rateLimit(`referral:visit:${ip}`, 120, 60_000).success) {
    return signupRedirect(request);
  }

  const { code: rawCode } = await params;
  const code = normalizeReferralCode(rawCode);
  if (!code) {
    rateLimit(`referral:invalid:${ip}`, 20, 60_000);
    return signupRedirect(request);
  }

  // Preserve first-touch attribution only when the existing cookie is valid.
  if (parseReferralAttribution(request.cookies.get(REFERRAL_COOKIE_NAME)?.value)) {
    return signupRedirect(request);
  }

  const guide = await safeDb(
    "referral.redirect",
    () =>
      prisma.guide.findFirst({
        where: {
          referralCode: code,
          deletedAt: null,
          user: { deletedAt: null },
        },
        select: { id: true },
      }),
    null,
  );
  if (!guide) {
    rateLimit(`referral:invalid:${ip}`, 20, 60_000);
    return signupRedirect(request);
  }

  const attribution = createReferralAttribution(guide.id, code);
  const response = signupRedirect(request);
  if (attribution) {
    response.cookies.set(REFERRAL_COOKIE_NAME, attribution, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: REFERRAL_COOKIE_MAX_AGE_SECONDS,
      path: "/",
      priority: "high",
    });
  }
  return response;
}

import { after } from "next/server";
import { headers } from "next/headers";

import { prisma } from "@/lib/prisma";
import { getClientIp } from "@/lib/rate-limit";
import { getGeoInfo, hasGeoInfo } from "@/lib/geo";
import { Prisma } from "@/generated/prisma/client";

/**
 * Audit-trail actions. The `action` value is a short, machine-readable key
 * (also used to pick a badge colour in the admin UI) and `label` is a
 * human-readable sentence describing what happened.
 */
export type ActivityAction =
  | "ACCOUNT_CREATED"
  | "LOGIN_SUCCESS"
  | "LOGIN_FAILED"
  | "LOGOUT"
  | "PASSWORD_CHANGED"
  | "PASSWORD_RESET_REQUESTED"
  | "PASSWORD_RESET_COMPLETED"
  | "USERNAME_CHANGED"
  | "BOOKING_CREATED"
  | "PAYMENT_REFERENCE_SUBMITTED"
  | "BOOKING_CONFIRMED"
  | "BOOKING_CANCELLED"
  | "GUIDE_APPLICATION_SUBMITTED"
  | "GUIDE_APPLICATION_APPROVED"
  | "GUIDE_APPLICATION_REJECTED"
  | "SUPPORT_MESSAGE_SENT"
  | "SUPPORT_REPLY_SENT"
  | "CUSTOM_TRIP_REQUESTED"
  | "CUSTOM_TRIP_MESSAGE_SENT"
  | "CUSTOM_TRIP_REPLY_SENT"
  | "TRIP_CHANGE_SUBMITTED"
  | "TRIP_DELETED"
  | "USER_PROFILE_UPDATED"
  | "USER_ROLE_CHANGED"
  | "REVIEW_SUBMITTED"
  | "REVIEW_UPDATED";

export type ActivityLogInput = {
  userId: string | null | undefined;
  action: ActivityAction | string;
  label: string;
  ip?: string | null;
  userAgent?: string | null;
  metadata?: unknown;
};

function truncate(value: string, maxLength: number): string {
  return value.length > maxLength ? value.slice(0, maxLength) : value;
}

function persistActivity(input: ActivityLogInput): void {
  const { userId, action, label, ip, userAgent, metadata } = input;
  if (!userId || !action) return;

  void prisma.activityLog
    .create({
      data: {
        userId,
        action: truncate(action, 100),
        label: truncate(label, 500),
        ip: ip ? truncate(ip, 64) : null,
        userAgent: userAgent ? truncate(userAgent, 500) : null,
        metadata: (metadata ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    })
    .catch((error) => {
      // Logging must never break the action that triggered it.
      console.error("[activity-log] failed to record", error);
    });
}

/**
 * Records an audit entry after the current response finishes, so logging never
 * blocks the user-facing action. Safe to call outside a request scope (e.g.
 * scripts) — it degrades to a fire-and-forget write.
 */
export function recordActivity(input: ActivityLogInput): void {
  if (!input.userId || !input.action) return;

  try {
    after(() => persistActivity(input));
  } catch {
    // No request context available — persist immediately, best-effort.
    persistActivity(input);
  }
}

/**
 * Captures the client IP + user agent, then records an audit entry. Use this
 * from Server Actions and route handlers where the request context is live.
 */
export async function logActivity(
  input: Omit<ActivityLogInput, "ip" | "userAgent">,
): Promise<void> {
  if (!input.userId) return;

  let ip: string | null = null;
  let userAgent: string | null = null;

  try {
    const rawIp = await getClientIp();
    if (rawIp && rawIp !== "unknown") ip = rawIp;
  } catch {
    // Ignore — IP is best-effort.
  }

  try {
    const headerList = await headers();
    userAgent = headerList.get("user-agent") ?? null;
  } catch {
    // Ignore — user agent is best-effort.
  }

  // Enrich the metadata with the full Vercel geolocation (country, region,
  // city, latitude, longitude, timezone) so the admin activity log shows where
  // each action was performed. All fields are validated upstream in getGeoInfo.
  let metadata = input.metadata;
  try {
    const geo = await getGeoInfo();
    if (hasGeoInfo(geo)) {
      const base =
        metadata && typeof metadata === "object" && !Array.isArray(metadata)
          ? (metadata as Record<string, unknown>)
          : {};
      metadata = { ...base, geo };
    }
  } catch {
    // Ignore — geolocation is best-effort.
  }

  recordActivity({ ...input, metadata, ip, userAgent });
}

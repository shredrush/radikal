import crypto from "node:crypto";

export const REFERRAL_COOKIE_NAME = "radikal_referral";
export const REFERRAL_COOKIE_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

const REFERRAL_CODE_PATTERN = /^[A-Z0-9]{4}$/;
const REFERRAL_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

type ReferralAttribution =
  | {
      referrerId: string;
      code: string;
      expiresAt: number;
    }
  | {
      // Guide-based attribution was issued before referrals were opened to all
      // users. Accept it until the existing 30-day cookies have expired.
      guideId: string;
      code: string;
      expiresAt: number;
    };

export function normalizeReferralCode(value: string) {
  const code = value.trim().toUpperCase();
  return REFERRAL_CODE_PATTERN.test(code) ? code : null;
}

export function generateReferralCode() {
  let code = "";
  for (let index = 0; index < 4; index += 1) {
    code += REFERRAL_ALPHABET[crypto.randomInt(REFERRAL_ALPHABET.length)];
  }
  return code;
}

function getSigningSecret() {
  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  return secret?.trim() || null;
}

function sign(value: string, secret: string) {
  return crypto.createHmac("sha256", secret).update(value).digest("base64url");
}

/** The cookie contains only a signed referrer/code/expiry attribution payload. */
export function createReferralAttribution(referrerId: string, code: string) {
  const secret = getSigningSecret();
  if (!secret) return null;

  const payload: ReferralAttribution = {
    referrerId,
    code,
    expiresAt: Date.now() + REFERRAL_COOKIE_MAX_AGE_SECONDS * 1000,
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encoded}.${sign(encoded, secret)}`;
}

export function parseReferralAttribution(value: string | undefined): ReferralAttribution | null {
  const secret = getSigningSecret();
  if (!secret || !value) return null;

  const [encoded, signature, ...extra] = value.split(".");
  if (!encoded || !signature || extra.length > 0) return null;

  const expected = sign(encoded, secret);
  const receivedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (
    receivedBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(receivedBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as {
      referrerId?: unknown;
      guideId?: unknown;
      code?: unknown;
      expiresAt?: unknown;
    };
    const referrerId = typeof payload.referrerId === "string" ? payload.referrerId : null;
    const guideId = typeof payload.guideId === "string" ? payload.guideId : null;
    const expiresAt = typeof payload.expiresAt === "number" ? payload.expiresAt : null;
    if (
      (referrerId === null && guideId === null) ||
      (referrerId !== null && guideId !== null) ||
      (referrerId !== null && (referrerId.length === 0 || referrerId.length > 100)) ||
      (guideId !== null && (guideId.length === 0 || guideId.length > 100)) ||
      typeof payload.code !== "string" ||
      !normalizeReferralCode(payload.code) ||
      payload.code !== payload.code.toUpperCase() ||
      expiresAt === null ||
      !Number.isSafeInteger(expiresAt) ||
      expiresAt <= Date.now()
    ) {
      return null;
    }
    return referrerId
      ? { referrerId, code: payload.code, expiresAt }
      : { guideId: guideId!, code: payload.code, expiresAt };
  } catch {
    return null;
  }
}

/**
 * Assign a code lazily for users created before referrals existed. The unique
 * index is the final collision guard across concurrent requests and instances.
 */
export async function ensureUserReferralCode(userId: string) {
  const { prisma } = await import("@/lib/prisma");
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { referralCode: true, deletedAt: true },
  });
  if (!user || user.deletedAt) return null;
  if (user.referralCode) return user.referralCode;

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const code = generateReferralCode();
    try {
      const updated = await prisma.user.updateMany({
        where: { id: userId, deletedAt: null, referralCode: null },
        data: { referralCode: code },
      });
      if (updated.count === 1) return code;

      const current = await prisma.user.findUnique({
        where: { id: userId },
        select: { referralCode: true },
      });
      return current?.referralCode ?? null;
    } catch (error) {
      if (!(error instanceof Error) || !error.message.includes("Unique constraint failed")) {
        throw error;
      }
    }
  }

  throw new Error("Could not allocate a referral code. Please retry.");
}

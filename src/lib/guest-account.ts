import bcrypt from "bcryptjs";

import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { generateAvailableUsername } from "@/lib/available-username";
import { getClientIp, rateLimit, rateLimitError } from "@/lib/rate-limit";
import { sanitizeText } from "@/lib/sanitize";
import { passwordSchema } from "@/lib/validations/auth";
import { z } from "zod";

type UserClient = Pick<typeof prisma, "user">;

const guestAccountSchema = z.object({
  name: z
    .string()
    .transform((value) => sanitizeText(value, { maxLength: 100 }))
    .refine((value) => value.length >= 2, "Name must be at least 2 characters"),
  email: z.string().trim().toLowerCase().max(254).email("Enter a valid email address"),
  phone: z
    .string()
    .trim()
    .regex(/^\+\d{7,15}$/, "Enter a valid phone number with country code"),
  password: passwordSchema,
});

export type GuestAccountInput = z.infer<typeof guestAccountSchema>;

export type GuestAccountResult =
  | { success: true; user: { id: string; name: string; email: string } }
  | { success: false; error: string; fieldErrors?: Record<string, string> };

export type GuestAccountValidationResult =
  | { success: true; data: GuestAccountInput }
  | { success: false; error: string; fieldErrors: Record<string, string> };

export function validateGuestAccount(input: unknown): GuestAccountValidationResult {
  const parsed = guestAccountSchema.safeParse(input);
  if (parsed.success) return { success: true, data: parsed.data };

  return {
    success: false,
    error: "Correct the contact details below.",
    fieldErrors: Object.fromEntries(
      parsed.error.issues.flatMap((issue) => {
        const field = issue.path[0];
        return typeof field === "string" ? [[field, issue.message]] : [];
      }),
    ),
  };
}

/** Creates a customer account for a public intake form without signing it in. */
export async function createGuestAccount(
  input: unknown,
  client: UserClient = prisma,
): Promise<GuestAccountResult> {
  const parsed = validateGuestAccount(input);
  if (!parsed.success) {
    return parsed;
  }

  const ip = await getClientIp();
  const limit = rateLimit(`guest-account:ip:${ip}`, 5, 60 * 60_000);
  if (!limit.success) return { success: false, error: rateLimitError(limit) };

  const { name, email, phone, password } = parsed.data;
  const existing = await client.user.findUnique({ where: { email } });
  if (existing) {
    return { success: false, error: "An account with this email already exists. Please log in to continue." };
  }

  try {
    const user = await client.user.create({
      data: {
        name,
        email,
        phone,
        username: await generateAvailableUsername("traveler", client),
        passwordHash: await bcrypt.hash(password, 10),
      },
      select: { id: true, name: true, email: true },
    });
    return { success: true, user };
  } catch (error) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") {
      throw error;
    }

    const targets = Array.isArray(error.meta?.target) ? error.meta.target : [];
    if (targets.some((target) => target.toLowerCase().includes("email"))) {
      return { success: false, error: "An account with this email already exists. Please log in to continue." };
    }

    // The account was not created. In particular, do not mislabel a generated
    // username collision as an email collision.
    return { success: false, error: "Could not create an account. Please try again." };
  }
}

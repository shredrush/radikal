import { z } from "zod";

import {
  isReservedUsername,
  normalizeUsername,
  sanitizeText,
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
  USERNAME_PATTERN,
} from "@/lib/sanitize";

export const usernameSchema = z
  .string()
  .transform((value) => normalizeUsername(value))
  .refine((value) => USERNAME_PATTERN.test(value), "Username can only contain lowercase letters, numbers, hyphens, underscores, and periods")
  .refine((value) => value.length >= USERNAME_MIN_LENGTH, `Username must be at least ${USERNAME_MIN_LENGTH} characters`)
  .refine((value) => value.length <= USERNAME_MAX_LENGTH, `Username must be ${USERNAME_MAX_LENGTH} characters or fewer`)
  .refine((value) => !isReservedUsername(value), "This username is not available");

export type Username = z.infer<typeof usernameSchema>;

export const signupSchema = z.object({
  name: z
    .string()
    .transform((value) => sanitizeText(value, { maxLength: 100 }))
    .refine((value) => value.length >= 2, "Name must be at least 2 characters"),
  email: z.string().trim().toLowerCase().max(254).email("Enter a valid email address"),
  username: usernameSchema,
  password: z.string().min(6, "Password must be at least 6 characters").max(72, "Password must be 72 characters or fewer"),
});

export type SignupInput = z.infer<typeof signupSchema>;

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().max(254).email("Enter a valid email address"),
  password: z.string().min(1, "Password is required").max(200),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password").max(200),
    newPassword: z.string().min(6, "New password must be at least 6 characters").max(72, "New password must be 72 characters or fewer"),
    confirmPassword: z.string().min(1, "Confirm your new password").max(200),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

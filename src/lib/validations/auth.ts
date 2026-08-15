import { z } from "zod";

import { sanitizeText } from "@/lib/sanitize";

export const signupSchema = z.object({
  name: z
    .string()
    .transform((value) => sanitizeText(value, { maxLength: 100 }))
    .refine((value) => value.length >= 2, "Name must be at least 2 characters"),
  email: z.string().trim().toLowerCase().max(254).email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters").max(72, "Password must be 72 characters or fewer"),
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
    newPassword: z.string().min(8, "New password must be at least 8 characters").max(72, "New password must be 72 characters or fewer"),
    confirmPassword: z.string().min(1, "Confirm your new password").max(200),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

import { findUserByIdentifier } from "@/lib/login";
import { loginSchema } from "@/lib/validations/auth";
import { logActivity } from "@/lib/activity-log";
import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: {
    // Credentials-only auth requires JWT sessions — there is no database
    // adapter wired up, so sessions are not persisted server-side.
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      credentials: {
        identifier: { label: "Email or username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (rawCredentials) => {
        const parsed = loginSchema.safeParse(rawCredentials);
        if (!parsed.success) return null;

        const { identifier, password } = parsed.data;

        const user = await findUserByIdentifier(identifier);
        if (!user) return null;

        const passwordMatches = await bcrypt.compare(
          password,
          user.passwordHash
        );
        if (!passwordMatches) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          role: user.role,
          username: user.username,
          sessionVersion: user.sessionVersion,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        const username = (user as { username?: string | null }).username;
        if (username) {
          token.username = username;
        }
        const role = (user as { role?: "USER" | "GUIDE" | "SUPPORT" | "FINANCE" | "CONTENT" | "ADMIN" | "ADMAX" }).role;
        if (role) {
          token.role = role;
        }
        token.sessionVersion = (user as { sessionVersion?: number }).sessionVersion;
      } else if (token.id) {
        // Stateless JWTs otherwise survive a password reset. Verify the
        // version on each use so incrementing it revokes every old token.
        const account = await prisma.user.findFirst({
          where: { id: token.id as string, deletedAt: null },
          select: { sessionVersion: true },
        });
        if (!account || account.sessionVersion !== token.sessionVersion) {
          delete token.id;
          delete token.role;
          delete token.username;
          delete token.sessionVersion;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
        session.user.sessionVersion = token.sessionVersion as number | undefined;
        session.user.username = token.username as string | undefined;
        session.user.role = token.role as "USER" | "GUIDE" | "SUPPORT" | "FINANCE" | "CONTENT" | "ADMIN" | "ADMAX" | undefined;
      }
      return token.id
        ? session
        : ({ ...session, user: undefined } as unknown as typeof session);
    },
  },
  events: {
    async signIn({ user }) {
      const userId = (user as { id?: string }).id;
      if (userId) {
        await logActivity({
          userId,
          action: "LOGIN_SUCCESS",
          label: "Signed in",
        });
      }
    },
  },
});

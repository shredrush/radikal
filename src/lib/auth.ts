import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

import { loginSchema } from "@/lib/validations/auth";

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
        // Keep password hashing and the database driver out of public route
        // initialization; this branch only runs for a credentials sign-in.
        const [{ findUserByIdentifier }, bcryptModule] = await Promise.all([
          import("@/lib/login"),
          import("bcryptjs"),
        ]);
        const bcrypt = bcryptModule.default;

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
          // The profile image is loaded from the database by consumers that
          // render it. Never put it in the JWT: legacy data URLs can exceed
          // cookie and request-header limits, preventing a completed sign-in.
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
        // Stateless JWTs otherwise survive a password reset. The session
        // version lookup is cached and explicitly invalidated on password
        // changes, rather than querying Postgres for every request.
        const { getSessionVersion } = await import("@/lib/session-revocation");
        let account: Awaited<ReturnType<typeof getSessionVersion>>;
        try {
          account = await getSessionVersion(token.id as string);
        } catch (error) {
          const err = error as { code?: string; message?: string };
          // A pool/provider outage must not turn an otherwise valid session
          // into a 500. Privileged operations still re-check permissions in
          // the database and fail closed when it is unavailable.
          console.error("[auth] session refresh failed; retaining existing JWT", {
            code: err.code ?? null,
            error: err.message ?? String(error),
          });
          return token;
        }

        if (!account || account.sessionVersion !== token.sessionVersion) {
          delete token.id;
          delete token.role;
          delete token.username;
          delete token.sessionVersion;
        } else {
          // Re-sync the signed-in role with the database on every request so a
          // role change (e.g. a guide application approved mid-session) is
          // picked up without logging out and back in. The lookup above is the
          // cached row, and the role-change actions invalidate its tag, so the
          // upgrade is visible on the very next request.
          token.role = account.role;
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
        const { logActivity } = await import("@/lib/activity-log");
        await logActivity({
          userId,
          action: "LOGIN_SUCCESS",
          label: "Signed in",
        });
      }
    },
    async signOut(message) {
      const token = "token" in message ? (message.token as { id?: unknown; sub?: unknown }) : null;
      const userId = typeof token?.id === "string" ? token.id : token?.sub;
      if (typeof userId !== "string") return;

      // Auth.js isolates event failures from cookie cleanup. The audit write is
      // scheduled after the response, so it does not delay the sign-out.
      const { recordActivity } = await import("@/lib/activity-log");
      recordActivity({ userId, action: "LOGOUT", label: "Signed out" });
    },
  },
});

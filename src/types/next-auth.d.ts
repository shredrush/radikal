import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      sessionVersion?: number;
      username?: string;
      role?: "USER" | "GUIDE" | "SUPPORT" | "FINANCE" | "CONTENT" | "ADMIN" | "ADMAX";
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    sessionVersion?: number;
    username?: string;
    role?: "USER" | "GUIDE" | "SUPPORT" | "FINANCE" | "CONTENT" | "ADMIN" | "ADMAX";
  }
}

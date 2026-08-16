import type { ReactNode } from "react";

import { AuthBackground } from "@/components/auth/auth-background";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex flex-1 items-center justify-center overflow-hidden px-4 py-10 sm:py-16">
      <AuthBackground />
      <div className="relative z-10 w-full max-w-md -mt-12 sm:-mt-40">{children}</div>
    </div>
  );
}

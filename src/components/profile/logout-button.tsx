"use client";

import { useState } from "react";
import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";

import { cn } from "@/lib/utils";

const VARIANTS = {
  sidebar: {
    base: "rounded-xl border-2 px-4 py-2.5 text-sm font-semibold",
    idle: "border-border/70 text-muted-foreground hover:border-border hover:text-foreground",
  },
  menu: {
    base: "rounded-lg px-3.5 py-2.5 text-base font-medium",
    idle: "text-foreground hover:bg-primary/10 hover:text-primary",
  },
} as const;

export function LogoutButton({
  variant = "sidebar",
}: {
  variant?: keyof typeof VARIANTS;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  const styles = VARIANTS[variant];

  async function handleClick() {
    if (pending) return;

    setPending(true);
    setError(false);
    try {
      // Auth.js performs a CSRF-protected POST, clears the session cookie, and
      // uses a full navigation so React never needs to render the redirect payload.
      await signOut({ redirectTo: "/" });
    } catch {
      setPending(false);
      setError(true);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className={cn(
          "flex w-full cursor-pointer items-center gap-2 transition-colors disabled:cursor-wait disabled:opacity-70",
          styles.base,
          styles.idle
        )}
      >
        <LogOut className="h-4 w-4 shrink-0" />
        {pending ? "Logging out…" : "Logout"}
      </button>
      {error ? (
        <p role="alert" className="mt-2 text-xs text-destructive">
          Logout failed. Please try again.
        </p>
      ) : null}
    </div>
  );
}

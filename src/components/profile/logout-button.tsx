"use client";

import { useState } from "react";
import { LogOut } from "lucide-react";

import { logoutAction } from "@/lib/actions/auth";
import { cn } from "@/lib/utils";

const VARIANTS = {
  sidebar: {
    base: "rounded-xl border-2 px-4 py-2.5 text-sm font-semibold",
    idle: "border-border/70 text-muted-foreground hover:border-border hover:text-foreground",
    confirming: "border-red-500 bg-red-500/10 text-red-600 hover:bg-red-500/20",
  },
  menu: {
    base: "rounded-lg px-3.5 py-2.5 text-base font-medium",
    idle: "text-foreground hover:bg-primary/10 hover:text-primary",
    confirming: "bg-red-500/10 text-red-600 hover:bg-red-500/20",
  },
} as const;

export function LogoutButton({
  variant = "sidebar",
}: {
  variant?: keyof typeof VARIANTS;
}) {
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleClick() {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    setPending(true);
    await logoutAction();
  }

  function handleBlur() {
    setConfirming(false);
  }

  const styles = VARIANTS[variant];

  return (
    <button
      type="button"
      onClick={handleClick}
      onBlur={handleBlur}
      disabled={pending}
      className={cn(
        "flex w-full cursor-pointer items-center gap-2 transition-colors",
        styles.base,
        confirming ? styles.confirming : styles.idle
      )}
    >
      <LogOut className="h-4 w-4 shrink-0" />
      {pending ? (
        "Logging out…"
      ) : confirming ? (
        <span className="text-sm leading-none">Click again to Logout</span>
      ) : (
        "Logout"
      )}
    </button>
  );
}

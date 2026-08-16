"use client";

import { useState } from "react";
import { LogOut } from "lucide-react";

import { logoutAction } from "@/lib/actions/auth";
import { cn } from "@/lib/utils";

export function LogoutButton() {
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

  return (
    <button
      type="button"
      onClick={handleClick}
      onBlur={handleBlur}
      disabled={pending}
      className={cn(
        "flex w-full cursor-pointer items-center gap-2 rounded-xl border-2 px-4 py-2.5 text-sm font-semibold transition-colors",
        confirming
          ? "border-red-500 bg-red-500/10 text-red-600 hover:bg-red-500/20"
          : "border-border/70 text-muted-foreground hover:border-border hover:text-foreground"
      )}
    >
      <LogOut className="h-4 w-4" />
      {pending ? "Logging out…" : confirming ? "Click again to Logout" : "Logout"}
    </button>
  );
}

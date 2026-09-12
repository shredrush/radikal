"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserX } from "lucide-react";
import { toast } from "sonner";

import { deactivateUserAction } from "@/lib/actions/users";

export function AdminDeactivateUserButton({ userId, userName }: { userId: string; userName: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleDeactivate() {
    if (!window.confirm(`Deactivate ${userName}? They will no longer be able to sign in.`)) return;

    startTransition(async () => {
      try {
        await deactivateUserAction(userId);
        toast.success("Account deactivated.");
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not deactivate this account.");
      }
    });
  }

  return (
    <button
      type="button"
      onClick={handleDeactivate}
      disabled={isPending}
      className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-background/80 px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
    >
      <UserX className="h-3 w-3" />
      {isPending ? "Deactivating" : "Deactivate"}
    </button>
  );
}

"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw } from "lucide-react";
import { toast } from "sonner";

import { restoreUserAction } from "@/lib/actions/users";

export function AdminRestoreUserButton({ userId, userName }: { userId: string; userName: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleRestore() {
    startTransition(async () => {
      try {
        await restoreUserAction(userId);
        toast.success(`${userName}'s account has been restored.`);
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not restore this account.");
      }
    });
  }

  return (
    <button
      type="button"
      onClick={handleRestore}
      disabled={isPending}
      aria-label={`Restore ${userName}`}
      title="Restore account"
      className="inline-flex size-8 shrink-0 items-center justify-center rounded-full border border-emerald-500/40 bg-emerald-500/10 text-emerald-600 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <RotateCcw className="h-3.5 w-3.5" />
      <span className="sr-only">{isPending ? "Restoring account" : "Restore account"}</span>
    </button>
  );
}

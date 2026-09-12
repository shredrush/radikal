"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import { hardDeleteUserAction } from "@/lib/actions/users";

export function AdminHardDeleteUserButton({ userId, userName }: { userId: string; userName: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleDelete() {
    if (!window.confirm(`Permanently delete ${userName}? This cannot be undone.`)) return;

    startTransition(async () => {
      try {
        await hardDeleteUserAction(userId);
        toast.success("Account permanently deleted.");
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not permanently delete this account.");
      }
    });
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={isPending}
      aria-label={`Permanently delete ${userName}`}
      title="Permanently delete"
      className="inline-flex size-8 shrink-0 items-center justify-center rounded-full border border-destructive/40 bg-destructive/10 text-destructive transition hover:bg-destructive/20 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <Trash2 className="h-3 w-3" />
      <span className="sr-only">{isPending ? "Deleting account" : "Permanently delete account"}</span>
    </button>
  );
}

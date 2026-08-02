"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { updateActivityAction } from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";

export function AdminTripForm({
  activityId,
  children,
}: {
  activityId: string;
  children: React.ReactNode;
}) {
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      try {
        await updateActivityAction(formData);
        toast.success("Changes saved successfully.");
      } catch {
        toast.error("Failed to save changes. Please try again.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
      <input type="hidden" name="activityId" value={activityId} />
      {children}
      <div className="md:col-span-2">
        <Button type="submit" className="rounded-full" disabled={isPending}>
          {isPending ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}

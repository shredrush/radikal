"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { deactivateUserAction, updateUserAction } from "@/lib/actions/users";
import { FORM_FIELD_BORDER } from "@/lib/boundary-styles";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

const inputClassName =
  `flex h-10 w-full rounded-xl border ${FORM_FIELD_BORDER} bg-background/80 px-3 py-2 text-sm shadow-sm outline-none transition focus:border-ring focus-visible:ring-2 focus-visible:ring-ring/30`;

const USER_ROLE_OPTIONS = [
  { value: "USER", label: "Traveller (USER)" },
  { value: "GUIDE", label: "Guide (GUIDE)" },
  { value: "SUPPORT", label: "Support (SUPPORT)" },
  { value: "FINANCE", label: "Finance (FINANCE)" },
  { value: "CONTENT", label: "Content (CONTENT)" },
  { value: "ADMIN", label: "Operations admin (ADMIN)" },
  { value: "ADMAX", label: "Super admin (ADMAX)" },
] as const;

export type AdminUserFormUser = {
  id: string;
  name: string;
  email: string;
  username: string | null;
  role: string;
  deletedAt?: Date | string | null;
};

export function AdminUserForm({
  user,
  isSelf = false,
}: {
  user: AdminUserFormUser;
  isSelf?: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      try {
        await updateUserAction(formData);
        toast.success("User updated.");
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Could not update user.";
        toast.error(message);
      }
    });
  }

  function handleDeactivate() {
    if (!window.confirm("Deactivate this account? The user will no longer be able to sign in.")) {
      return;
    }

    startTransition(async () => {
      try {
        await deactivateUserAction(user.id);
        toast.success("User deactivated.");
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Could not deactivate user.";
        toast.error(message);
      }
    });
  }

  const isDeleted = Boolean(user.deletedAt);

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <input type="hidden" name="userId" value={user.id} />

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={`name-${user.id}`}>Full name</Label>
          <input
            id={`name-${user.id}`}
            name="name"
            defaultValue={user.name}
            required
            minLength={2}
            maxLength={100}
            disabled={isDeleted}
            className={inputClassName}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor={`email-${user.id}`}>Email</Label>
          <input
            id={`email-${user.id}`}
            name="email"
            type="email"
            defaultValue={user.email}
            required
            maxLength={254}
            disabled={isDeleted}
            className={inputClassName}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor={`username-${user.id}`}>Username</Label>
          <input
            id={`username-${user.id}`}
            name="username"
            defaultValue={user.username ?? ""}
            placeholder="Leave blank to remove"
            disabled={isDeleted}
            className={inputClassName}
          />
          <p className="text-xs text-muted-foreground">
            3–30 lowercase letters or numbers, with single <code>-</code>, <code>_</code>, <code>.</code> separators.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor={`role-${user.id}`}>Role</Label>
          <select
            id={`role-${user.id}`}
            name="role"
            defaultValue={user.role}
            disabled={isSelf || isDeleted}
            className={inputClassName}
          >
            {USER_ROLE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {isSelf ? (
            <p className="text-xs text-muted-foreground">
              You can&apos;t change your own role.
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/70 pt-4">
        <p className="text-sm text-muted-foreground">
          {isDeleted
            ? "This account is deactivated and cannot sign in. Activity history is preserved."
            : "Changes take effect immediately and are recorded in the user's activity log."}
        </p>
        <div className="flex flex-wrap gap-2">
          {!isDeleted && !isSelf ? (
            <Button type="button" variant="outline" className="rounded-full" disabled={isPending} onClick={handleDeactivate}>
              Deactivate account
            </Button>
          ) : null}
          <Button type="submit" className="rounded-full" disabled={isPending || isDeleted}>
            {isPending ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </div>
    </form>
  );
}

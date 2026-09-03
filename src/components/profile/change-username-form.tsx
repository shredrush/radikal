"use client";

import { useActionState } from "react";
import { AlertTriangle, Check, Loader2 } from "lucide-react";

import {
  changeUsernameAction,
  type ChangeUsernameActionState,
} from "@/lib/actions/auth";
import { useUsernameAvailability } from "@/hooks/use-username-availability";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: ChangeUsernameActionState = {};

export function ChangeUsernameForm({
  currentUsername,
  hasChangedUsername,
}: {
  currentUsername: string | null;
  hasChangedUsername: boolean;
}) {
  const [state, formAction, isPending] = useActionState(
    changeUsernameAction,
    initialState
  );

  const { availability, isChecking, check } = useUsernameAvailability({
    // The user's own handle reads as "taken" — treat it as available instead
    // of calling the endpoint for a name that already belongs to the account.
    isCurrentUsername: (value) =>
      !!currentUsername && value === currentUsername.toLowerCase(),
  });
  const isChangeLocked = hasChangedUsername || state.success;

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {currentUsername ? (
        <p className="text-sm text-muted-foreground">
          Current username:{" "}
          <span className="font-semibold text-foreground">@{currentUsername}</span>
        </p>
      ) : null}

      {isChangeLocked ? (
        <p
          role="status"
          className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-sm text-yellow-700 dark:text-yellow-300"
        >
          you can only change username once, for help contact support
        </p>
      ) : null}

      {state.error ? (
        <p
          role="alert"
          className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {state.error}
        </p>
      ) : null}

      {!isChangeLocked ? (
        <>
          <div className="flex flex-col gap-2">
            <Label htmlFor="username">New username</Label>
            <div className="relative">
              <Input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                defaultValue={currentUsername ?? ""}
                placeholder="something_cool"
                minLength={3}
                maxLength={30}
                pattern="[a-z0-9]([a-z0-9._-]*[a-z0-9])?"
                title="3–30 lowercase letters or numbers, with single -, _, or . separators"
                className="pr-8"
                aria-invalid={
                  availability ? availability.status !== "available" : undefined
                }
                onChange={(event) => check(event.target.value)}
                required
              />
              {isChecking ? (
                <Loader2 className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
              ) : availability?.status === "available" ? (
                <Check className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-green-500" />
              ) : availability ? (
                <AlertTriangle className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-destructive" />
              ) : null}
            </div>
            <p className="text-xs text-muted-foreground">
              3–30 lowercase letters or numbers, with single <code>-</code>,{" "}
              <code>_</code>, or <code>.</code> separators.
            </p>
            <p className="text-xs text-yellow-700 dark:text-yellow-300">
              Username can only be changed once
            </p>
            {availability?.message ? (
              <p
                className={`text-xs ${
                  availability.status === "available"
                    ? "text-green-500"
                    : "text-destructive"
                }`}
              >
                {availability.message}
              </p>
            ) : state.fieldErrors?.username ? (
              <p className="text-xs text-destructive">{state.fieldErrors.username}</p>
            ) : null}
          </div>

          <Button type="submit" disabled={isPending} className="mt-1 w-full sm:w-auto">
            {isPending ? "Updating…" : "Update username"}
          </Button>
        </>
      ) : null}
    </form>
  );
}

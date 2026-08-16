"use client";

import { useActionState, useState } from "react";
import { AlertTriangle, AtSign, Check, Loader2 } from "lucide-react";

import {
  changeUsernameAction,
  checkUsernameAvailability,
  type ChangeUsernameActionState,
} from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: ChangeUsernameActionState = {};

type Availability = Awaited<ReturnType<typeof checkUsernameAvailability>>;

export function ChangeUsernameForm({
  currentUsername,
}: {
  currentUsername: string | null;
}) {
  const [state, formAction, isPending] = useActionState(
    changeUsernameAction,
    initialState
  );

  const [availability, setAvailability] = useState<Availability | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  async function handleUsernameBlur(event: React.FocusEvent<HTMLInputElement>) {
    const value = event.target.value.trim().toLowerCase();
    if (!value) {
      setAvailability(null);
      return;
    }
    // The user's own handle is of course "taken" — show a neutral note instead
    // of calling the availability endpoint for a name that already belongs to
    // the same account.
    if (currentUsername && value === currentUsername.toLowerCase()) {
      setAvailability({
        status: "available",
        message: "This is your current username.",
      });
      return;
    }
    setIsChecking(true);
    try {
      setAvailability(await checkUsernameAvailability(value));
    } finally {
      setIsChecking(false);
    }
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {currentUsername ? (
        <p className="text-sm text-muted-foreground">
          Current username:{" "}
          <span className="font-semibold text-foreground">@{currentUsername}</span>
        </p>
      ) : null}

      {state.success ? (
        <p
          role="status"
          className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-600 dark:text-emerald-400"
        >
          <AtSign className="h-4 w-4" />
          Username updated successfully.
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
            onBlur={handleUsernameBlur}
            onChange={() => setAvailability(null)}
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
    </form>
  );
}

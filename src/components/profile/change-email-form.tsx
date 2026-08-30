"use client";

import { useActionState } from "react";
import { Mail } from "lucide-react";

import {
  changeEmailAction,
  type ChangeEmailActionState,
} from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: ChangeEmailActionState = {};

export function ChangeEmailForm({
  currentEmail,
}: {
  currentEmail: string;
}) {
  const [state, formAction, isPending] = useActionState(
    changeEmailAction,
    initialState
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Current email:{" "}
        <span className="font-semibold text-foreground">{currentEmail}</span>
      </p>

      {state.success ? (
        <p
          role="status"
          className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-600 dark:text-emerald-400"
        >
          <Mail className="h-4 w-4" />
          Email updated successfully.
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
        <Label htmlFor="email">New email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          maxLength={254}
          placeholder="you@example.com"
          required
        />
        {state.fieldErrors?.email ? (
          <p className="text-xs text-destructive">{state.fieldErrors.email}</p>
        ) : null}
        <p className="text-xs text-muted-foreground">
          You&apos;ll need to use the new email to sign in next time.
        </p>
      </div>

      <Button type="submit" disabled={isPending} className="mt-1 w-full sm:w-auto">
        {isPending ? "Updating…" : "Update email"}
      </Button>
    </form>
  );
}

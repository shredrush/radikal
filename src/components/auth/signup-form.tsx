"use client";

import { useActionState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, Check, Loader2 } from "lucide-react";

import {
  signupAction,
  type SignupActionState,
} from "@/lib/actions/auth";
import { useUsernameAvailability } from "@/hooks/use-username-availability";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: SignupActionState = {};

export function SignupForm() {
  const [state, formAction, isPending] = useActionState(
    signupAction,
    initialState
  );

  const {
    availability: usernameStatus,
    isChecking: isCheckingUsername,
    check: checkUsername,
  } = useUsernameAvailability();

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-neutral-300">
            Join the crew
          </p>
          <h1 className="font-heading text-3xl font-semibold tracking-wide text-white">
            Create your account
          </h1>
        </div>
      </div>

      <form
        action={formAction}
        className="flex flex-col gap-5 rounded-[1.25rem] border border-border/70 bg-background/95 p-6 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.7)] backdrop-blur-xl sm:p-7"
      >
        {state.error ? (
          <p
            role="alert"
            className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {state.error}
          </p>
        ) : null}

        <div className="flex flex-col gap-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            name="name"
            type="text"
            autoComplete="name"
            placeholder="Full Name"
            defaultValue={state.values?.name}
            required
          />
          {state.fieldErrors?.name ? (
            <p className="text-xs text-destructive">{state.fieldErrors.name}</p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="username">Username</Label>
          <div className="relative">
            <Input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              placeholder="something_cool"
              minLength={3}
              maxLength={30}
              pattern="[a-z0-9]([a-z0-9._-]*[a-z0-9])?"
              title="3–30 lowercase letters or numbers, with single -, _, or . separators"
              defaultValue={state.values?.username}
              className="pr-8"
              aria-invalid={usernameStatus ? usernameStatus.status !== "available" : undefined}
              onChange={(event) => checkUsername(event.target.value)}
              required
            />
            {isCheckingUsername ? (
              <Loader2 className="pointer-events-none absolute right-0 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
            ) : usernameStatus?.status === "available" ? (
              <Check className="pointer-events-none absolute right-0 top-1/2 h-4 w-4 -translate-y-1/2 text-green-500" />
            ) : usernameStatus ? (
              <AlertTriangle className="pointer-events-none absolute right-0 top-1/2 h-4 w-4 -translate-y-1/2 text-destructive" />
            ) : null}
          </div>
          <p className="text-xs text-muted-foreground">
            [a-z] [0-9] <code>-</code> <code>_</code> <code>.</code>
          </p>
          {usernameStatus?.message ? (
            <p
              className={`text-xs ${
                usernameStatus.status === "available"
                  ? "text-green-500"
                  : "text-destructive"
              }`}
            >
              {usernameStatus.message}
            </p>
          ) : state.fieldErrors?.username ? (
            <p className="text-xs text-destructive">{state.fieldErrors.username}</p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            defaultValue={state.values?.email}
            placeholder="you@example.com"
            required
          />
          {state.fieldErrors?.email ? (
            <p className="text-xs text-destructive">{state.fieldErrors.email}</p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            placeholder="At least 6 characters"
            required
          />
          {state.fieldErrors?.password ? (
            <p className="text-xs text-destructive">{state.fieldErrors.password}</p>
          ) : null}
        </div>

        <Button type="submit" className="mt-1 w-full" disabled={isPending}>
          {isPending ? "Creating account…" : "Create account"}
          <ArrowRight />
        </Button>
      </form>

      <p className="text-center text-sm text-neutral-300">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-semibold text-white underline underline-offset-4"
        >
          Log in
        </Link>
      </p>
    </div>
  );
}

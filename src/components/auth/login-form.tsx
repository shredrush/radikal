"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { loginAction, type LoginActionState } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: LoginActionState = {};

export function LoginForm({ callbackUrl }: { callbackUrl?: string }) {
  const [state, formAction, isPending] = useActionState(
    loginAction,
    initialState
  );
  const [email, setEmail] = useState(state.email ?? "");

  useEffect(() => {
    if (state.email) {
      setEmail(state.email);
    }
  }, [state.email]);

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-neutral-300">
            Welcome back
          </p>
          <h1 className="font-heading text-3xl font-semibold tracking-wide text-white">
            Log in to Radikal
          </h1>
          <p className="max-w-xs text-sm leading-relaxed text-neutral-200">
            Pick up where you left off and book your next small-group Himalayan
            adventure.
          </p>
        </div>
      </div>

      <form
        action={formAction}
        className="flex flex-col gap-5 rounded-[1.25rem] border border-border/70 bg-background/95 p-6 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.7)] backdrop-blur-xl sm:p-7"
      >
        <input type="hidden" name="callbackUrl" value={callbackUrl ?? "/"} />

        {state.error ? (
          <p
            role="alert"
            className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {state.error}
          </p>
        ) : null}

        <div className="flex flex-col gap-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            required
          />
        </div>

        <Button type="submit" className="mt-1 w-full" disabled={isPending}>
          {isPending ? "Logging in…" : "Log in"}
          <ArrowRight />
        </Button>
      </form>

      <p className="text-center text-sm text-neutral-300">
        New to Radikal?{" "}
        <Link
          href="/signup"
          className="font-semibold text-white underline underline-offset-4"
        >
          Create an account
        </Link>
      </p>
    </div>
  );
}

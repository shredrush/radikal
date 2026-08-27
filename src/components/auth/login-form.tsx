"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";

import {
  loginAction,
  requestPasswordResetAction,
  resetPasswordAction,
  type LoginActionState,
  type RequestPasswordResetState,
  type ResetPasswordState,
} from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";

const loginInitialState: LoginActionState = {};
const requestResetInitialState: RequestPasswordResetState = {};
const resetInitialState: ResetPasswordState = {};

// Mirrors OTP_RESEND_COOLDOWN_MS on the server. The server enforces the
// cooldown silently (so it can't leak account existence), so the client owns
// the visible countdown.
const RESEND_COOLDOWN_SECONDS = 60;

type Mode = "login" | "forgot";

export function LoginForm({ callbackUrl }: { callbackUrl?: string }) {
  const [mode, setMode] = useState<Mode>("login");

  const [loginState, loginFormAction, loginPending] = useActionState(
    loginAction,
    loginInitialState
  );

  const [identifier, setIdentifier] = useState(loginState.identifier ?? "");

  if (mode === "forgot") {
    return (
      <ForgotPasswordFlow
        onBack={() => setMode("login")}
        onSuccess={(value) => {
          setIdentifier(value);
          setMode("login");
        }}
      />
    );
  }

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
        </div>
      </div>

      <form
        action={loginFormAction}
        className="flex flex-col gap-5 rounded-[1.25rem] border border-border/70 bg-background/95 p-6 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.7)] backdrop-blur-xl sm:p-7"
      >
        <input type="hidden" name="callbackUrl" value={callbackUrl ?? "/"} />

        {loginState.error ? (
          <p
            role="alert"
            className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {loginState.error}
          </p>
        ) : null}

        <div className="flex flex-col gap-2">
          <Label htmlFor="identifier">Username or Email</Label>
          <Input
            id="identifier"
            name="identifier"
            type="text"
            autoComplete="username email"
            placeholder="something_cool"
            value={identifier}
            onChange={(event) => setIdentifier(event.target.value)}
            required
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="password">Password</Label>
          <PasswordInput
            id="password"
            name="password"
            autoComplete="current-password"
            placeholder="••••••••"
            className="placeholder:text-neutral-400"
            required
          />
          <button
            type="button"
            onClick={() => setMode("forgot")}
            className="self-end text-xs font-semibold text-foreground underline underline-offset-4"
          >
            Forgot password?
          </button>
        </div>

        <Button type="submit" className="mt-1 w-full" disabled={loginPending}>
          {loginPending ? "Logging in…" : "Log in"}
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

function ForgotPasswordFlow({
  onBack,
  onSuccess,
}: {
  onBack: () => void;
  onSuccess: (identifier: string) => void;
}) {
  const [requestState, requestFormAction, requestPending] = useActionState(
    requestPasswordResetAction,
    requestResetInitialState
  );
  const [resetState, resetFormAction, resetPending] = useActionState(
    resetPasswordAction,
    resetInitialState
  );

  const [resetIdentifier, setResetIdentifier] = useState(
    requestState.identifier ?? ""
  );
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  useEffect(() => {
    if (cooldownSeconds <= 0) {
      return;
    }
    const id = setTimeout(() => {
      setCooldownSeconds((seconds) => seconds - 1);
    }, 1000);
    return () => clearTimeout(id);
  }, [cooldownSeconds]);

  useEffect(() => {
    if (!resetState.success) {
      return;
    }
    const id = setTimeout(() => {
      onSuccess(resetIdentifier);
    }, 1500);
    return () => clearTimeout(id);
  }, [resetState.success, resetIdentifier, onSuccess]);

  const effectiveResetIdentifier = requestState.identifier ?? resetIdentifier;
  const currentStep = resetState.success
    ? "success"
    : requestState.sent
      ? "reset"
      : "request";

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-neutral-300">
            Account recovery
          </p>
          <h1 className="font-heading text-3xl font-semibold tracking-wide text-white">
            Reset your password
          </h1>
          <p className="max-w-xs text-sm leading-relaxed text-neutral-200">
            Enter your email or username and we&apos;ll send a one-time code to
            your inbox.
          </p>
        </div>
      </div>

      {currentStep === "success" ? (
        <div className="flex flex-col gap-4 rounded-[1.25rem] border border-green-500/30 bg-green-500/10 p-6 text-sm text-green-500">
          <p className="font-semibold">Password updated</p>
          <p>
            Your password has been reset. You can now log in with your new
            password.
          </p>
          <Button type="button" onClick={() => onSuccess(resetIdentifier)}>
            Back to log in
            <ArrowLeft />
          </Button>
        </div>
      ) : currentStep === "reset" ? (
        <div className="flex flex-col gap-5 rounded-[1.25rem] border border-border/70 bg-background/95 p-6 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.7)] backdrop-blur-xl sm:p-7">
          <form action={requestFormAction} className="flex flex-col gap-5">
            <input type="hidden" name="identifier" value={effectiveResetIdentifier} />

            {requestState.error ? (
              <p
                role="alert"
                className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
              >
                {requestState.error}
              </p>
            ) : null}

            <div className="flex flex-col gap-2">
              <p className="rounded-xl border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm text-green-500">
                If an account exists for{" "}
                <span className="font-semibold">{effectiveResetIdentifier}</span>,
                we&apos;ve sent a one-time code to your inbox.
              </p>

              <button
                type="submit"
                disabled={requestPending || cooldownSeconds > 0}
                onClick={() => setCooldownSeconds(RESEND_COOLDOWN_SECONDS)}
                className="self-end text-sm font-semibold text-foreground underline underline-offset-4 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {cooldownSeconds > 0
                  ? `Resend code in ${cooldownSeconds}s`
                  : requestPending
                    ? "Sending…"
                    : "Resend code"}
              </button>
            </div>
          </form>

          <form action={resetFormAction} className="flex flex-col gap-5">
            <input type="hidden" name="identifier" value={effectiveResetIdentifier} />

            {resetState.error ? (
              <p
                role="alert"
                className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
              >
                {resetState.error}
              </p>
            ) : null}

            <div className="flex flex-col gap-2">
              <Label htmlFor="otp">One-time code</Label>
              <Input
                id="otp"
                name="otp"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="123456"
                maxLength={6}
                pattern="[0-9]{6}"
                className="tracking-[0.4em]"
                required
              />
              {resetState.fieldErrors?.otp ? (
                <p className="text-xs text-destructive">
                  {resetState.fieldErrors.otp}
                </p>
              ) : null}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="new-password">New password</Label>
              <PasswordInput
                id="new-password"
                name="newPassword"
                autoComplete="new-password"
                placeholder="At least 6 characters"
                required
              />
              {resetState.fieldErrors?.newPassword ? (
                <p className="text-xs text-destructive">
                  {resetState.fieldErrors.newPassword}
                </p>
              ) : null}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="confirm-password">Confirm new password</Label>
              <PasswordInput
                id="confirm-password"
                name="confirmPassword"
                autoComplete="new-password"
                placeholder="Re-enter your password"
                required
              />
              {resetState.fieldErrors?.confirmPassword ? (
                <p className="text-xs text-destructive">
                  {resetState.fieldErrors.confirmPassword}
                </p>
              ) : null}
            </div>

            <Button type="submit" className="mt-1 w-full" disabled={resetPending}>
              {resetPending ? "Resetting…" : "Reset password"}
              <ArrowRight />
            </Button>
          </form>
        </div>
      ) : (
        <form
          action={requestFormAction}
          className="flex flex-col gap-5 rounded-[1.25rem] border border-border/70 bg-background/95 p-6 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.7)] backdrop-blur-xl sm:p-7"
        >
          {requestState.error ? (
            <p
              role="alert"
              className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {requestState.error}
            </p>
          ) : null}

          <div className="flex flex-col gap-2">
            <Label htmlFor="reset-identifier">Username or Email</Label>
            <Input
              id="reset-identifier"
              name="identifier"
              type="text"
              autoComplete="username email"
              placeholder="something_cool"
              value={resetIdentifier}
              onChange={(event) => setResetIdentifier(event.target.value)}
              required
            />
          </div>

          <Button type="submit" className="mt-1 w-full" disabled={requestPending}>
            {requestPending ? "Sending code…" : "Send code"}
            <ArrowRight />
          </Button>
        </form>
      )}

      <button
        type="button"
        onClick={onBack}
        className="text-center text-sm text-neutral-300"
      >
        <span className="font-semibold text-white underline underline-offset-4">
          Back to log in
        </span>
      </button>
    </div>
  );
}

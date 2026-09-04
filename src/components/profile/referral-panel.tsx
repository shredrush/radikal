"use client";

import { useState } from "react";
import { Check, Copy, Share2, UsersRound } from "lucide-react";

import { Button } from "@/components/ui/button";

type ReferralPanelProps = {
  code: string;
  signups: number;
  qualified: number;
  referrals: Array<{
    id: string;
    name: string;
    signedUpAtLabel: string;
    qualified: boolean;
  }>;
};

function referralUrl(code: string) {
  return `${window.location.origin}/r/${code}`;
}

export function ReferralPanel({ code, signups, qualified, referrals }: ReferralPanelProps) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(referralUrl(code));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2_000);
    } catch {
      setCopied(false);
    }
  }

  async function shareLink() {
    const url = referralUrl(code);
    if (navigator.share) {
      try {
        await navigator.share({ title: "Join me on Radikal", text: "Explore your next adventure with Radikal.", url });
        return;
      } catch {
        // A dismissed share sheet is not an error that needs to interrupt use.
      }
    }
    await copyLink();
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-[1.2rem] border border-border/80 bg-muted/20 p-4 sm:p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Your referral link
        </p>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <code className="min-w-0 truncate rounded-lg bg-background px-3 py-2 text-sm font-semibold text-foreground ring-1 ring-border/80">
            /r/{code}
          </code>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" className="rounded-full" onClick={copyLink}>
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied" : "Copy"}
            </Button>
            <Button type="button" size="sm" className="rounded-full" onClick={shareLink}>
              <Share2 className="h-3.5 w-3.5" />
              Share
            </Button>
          </div>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          New travellers who sign up through this link are attributed to you for 30 days.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-[1.2rem] border border-border/80 p-4">
          <p className="text-2xl font-semibold tracking-tight">{signups}</p>
          <p className="mt-1 text-sm text-muted-foreground">Sign-ups</p>
        </div>
        <div className="rounded-[1.2rem] border border-border/80 p-4">
          <p className="text-2xl font-semibold tracking-tight">{qualified}</p>
          <p className="mt-1 text-sm text-muted-foreground">Qualified referrals</p>
        </div>
      </div>

      <div>
        <h3 className="font-heading text-base font-semibold tracking-wide">Recent referrals</h3>
        {referrals.length === 0 ? (
          <div className="mt-3 flex flex-col items-center gap-3 rounded-[1.2rem] border border-dashed border-border/80 bg-muted/20 px-6 py-9 text-center">
            <UsersRound className="h-7 w-7 text-muted-foreground/50" />
            <div>
              <p className="font-medium text-foreground">No referrals yet</p>
              <p className="mt-1 text-sm text-muted-foreground">Share your link to invite your first traveller.</p>
            </div>
          </div>
        ) : (
          <ul className="mt-3 divide-y divide-border/70 rounded-[1.2rem] border border-border/80 px-4">
            {referrals.map((referral) => (
              <li key={referral.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{referral.name}</p>
                  <p className="text-xs text-muted-foreground">Joined {referral.signedUpAtLabel}</p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
                    referral.qualified
                      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {referral.qualified ? "Qualified" : "Signed up"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

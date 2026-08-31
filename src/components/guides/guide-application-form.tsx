"use client";

import { useActionState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";

import { submitGuideApplicationAction, type GuideApplicationState } from "@/lib/actions/guide-applications";
import { FORM_FIELD_BORDER } from "@/lib/boundary-styles";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { MediaUploader } from "@/components/media/media-uploader";

const initialState: GuideApplicationState = {};

const inputClassName =
  `flex h-10 w-full rounded-xl border ${FORM_FIELD_BORDER} bg-background/80 px-3 py-2 text-sm shadow-sm outline-none transition focus:border-ring focus-visible:ring-2 focus-visible:ring-ring/30`;

const textareaClassName =
  `min-h-24 w-full rounded-xl border ${FORM_FIELD_BORDER} bg-background/80 px-3 py-2 text-sm shadow-sm outline-none transition focus:border-ring focus-visible:ring-2 focus-visible:ring-ring/30`;

export function GuideApplicationForm({
  fullName,
  username,
  phone,
  userId,
}: {
  fullName?: string | null;
  username?: string | null;
  phone?: string | null;
  userId?: string | null;
}) {
  const [state, formAction, isPending] = useActionState(submitGuideApplicationAction, initialState);

  if (state.success) {
    return (
      <div className="flex flex-col items-center gap-8 py-4 text-center">
        <div className="flex flex-col items-center gap-4">
          <CheckCircle2 className="size-12 text-primary" />
          <h2 className="font-heading text-2xl font-semibold tracking-wide">Application submitted</h2>
          <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
            Thanks! Your guide application is now under review. Our team will verify your details and
            get back to you soon.
          </p>
        </div>

        <div className="w-full rounded-2xl border border-border/70 bg-muted/20 p-6 text-left">
          <h3 className="font-heading text-base font-semibold tracking-wide">What happens next?</h3>
          <ul className="mt-4 space-y-3 text-sm leading-relaxed text-muted-foreground">
            <li className="flex gap-3">
              <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
              Our team reviews your certifications, experience, and media.
            </li>
            <li className="flex gap-3">
              <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
              We may reach out if anything needs clarification.
            </li>
            <li className="flex gap-3">
              <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
              You&apos;ll be notified by email once a decision is made.
            </li>
          </ul>
        </div>

        <Button className="rounded-full" nativeButton={false} render={<Link href="/profile" />}>
          Go to profile
        </Button>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-5">
      {state.error ? (
        <p
          role="alert"
          className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {state.error}
        </p>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="application-name">Full name</Label>
          <input
            id="application-name"
            name="name"
            defaultValue={fullName ?? ""}
            required
            maxLength={120}
            className={inputClassName}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="application-username">Username</Label>
          <input
            id="application-username"
            name="username"
            defaultValue={username ?? ""}
            required
            minLength={3}
            maxLength={30}
            pattern="[a-z0-9]([a-z0-9._-]*[a-z0-9])?"
            title="3–30 lowercase letters or numbers, with single -, _, or . separators"
            className={inputClassName}
          />
          <p className="text-xs text-muted-foreground">
            Lowercase letters, numbers, or single <code>-</code>, <code>_</code>, <code>.</code> separators. This becomes your public guide URL.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="application-phone">Phone</Label>
          <input
            id="application-phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            placeholder="+91 …"
            defaultValue={phone ?? ""}
            maxLength={40}
            className={inputClassName}
          />
          <p className="text-xs text-muted-foreground">Optional, but helps us reach you faster.</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="application-location">Location</Label>
          <input
            id="application-location"
            name="location"
            placeholder="e.g. Manali, Himachal Pradesh"
            required
            maxLength={200}
            className={inputClassName}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="application-experience">Experience (years)</Label>
          <input
            id="application-experience"
            name="experienceYears"
            type="number"
            min="0"
            max="100"
            defaultValue={0}
            className={inputClassName}
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="application-bio">About you</Label>
          <textarea
            id="application-bio"
            name="bio"
            rows={4}
            placeholder="Tell us about your guiding background, regions you know well, and why you want to guide for Radikal."
            required
            maxLength={3000}
            className={textareaClassName}
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="application-languages">Languages (comma or line separated)</Label>
          <textarea
            id="application-languages"
            name="languages"
            rows={2}
            placeholder={"English\nHindi"}
            className={textareaClassName}
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <p className="text-sm font-medium">Profile media (optional)</p>
          <p className="text-xs text-muted-foreground">
            Up to 10 photos and 5 videos. Reorder media here to set your public profile gallery layout.
          </p>
        </div>
        <div className="space-y-2 md:col-span-2">
          <MediaUploader
            entity="guide"
            folderKey={userId ?? "pending"}
            imagesFieldName="photos"
            videosFieldName="videos"
            mediaOrderFieldName="mediaOrder"
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <p className="text-sm font-medium">Social links (optional)</p>
          <p className="text-xs text-muted-foreground">
            Share your Instagram, Facebook, YouTube, or website so travellers can find you.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="application-instagram">Instagram</Label>
          <input
            id="application-instagram"
            name="instagramUrl"
            type="url"
            placeholder="https://instagram.com/…"
            className={inputClassName}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="application-facebook">Facebook</Label>
          <input
            id="application-facebook"
            name="facebookUrl"
            type="url"
            placeholder="https://facebook.com/…"
            className={inputClassName}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="application-youtube">YouTube</Label>
          <input
            id="application-youtube"
            name="youtubeUrl"
            type="url"
            placeholder="https://youtube.com/…"
            className={inputClassName}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="application-website">Website</Label>
          <input
            id="application-website"
            name="websiteUrl"
            type="url"
            placeholder="https://…"
            className={inputClassName}
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="application-certifications">Certifications (optional)</Label>
          <textarea
            id="application-certifications"
            name="certifications"
            rows={4}
            placeholder="Advanced Mountaineering, Wilderness First Aid"
            className={textareaClassName}
          />
          <p className="text-xs text-muted-foreground">
            Separate certifications with commas or new lines.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t border-border/70 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {username ? `Signed in as @${username}.` : ""} Your details are reviewed by our team before you appear publicly.
        </p>
        <Button type="submit" className="rounded-full" disabled={isPending}>
          {isPending ? "Submitting…" : "Submit application"}
          <ArrowRight />
        </Button>
      </div>
    </form>
  );
}

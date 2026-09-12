"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, Check, CheckCircle2, Loader2 } from "lucide-react";

import { submitGuideApplicationAction, type GuideApplicationState } from "@/lib/actions/guide-applications";
import { FORM_FIELD_BORDER } from "@/lib/boundary-styles";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { MediaUploader } from "@/components/media/media-uploader";
import { PhoneNumberField } from "@/components/forms/phone-number-field";
import { useUsernameAvailability } from "@/hooks/use-username-availability";

const initialState: GuideApplicationState = {};

const inputClassName =
  `flex h-10 w-full rounded-xl border ${FORM_FIELD_BORDER} bg-background/80 px-3 py-2 text-sm shadow-sm outline-none transition focus:border-ring focus-visible:ring-2 focus-visible:ring-ring/30`;

const textareaClassName =
  `min-h-24 w-full rounded-xl border ${FORM_FIELD_BORDER} bg-background/80 px-3 py-2 text-sm shadow-sm outline-none transition focus:border-ring focus-visible:ring-2 focus-visible:ring-ring/30`;

const requiredFieldNames = ["name", "location", "experienceYears", "bio", "languages"] as const;

function requiredLabel(label: string) {
  return <>{label} <span aria-hidden="true" className="text-destructive">*</span><span className="sr-only"> (required)</span></>;
}

export function GuideApplicationForm({
  fullName,
  username,
  phone,
  userId,
  isGuest = false,
}: {
  fullName?: string | null;
  username?: string | null;
  phone?: string | null;
  userId?: string | null;
  isGuest?: boolean;
}) {
  const [state, formAction, isPending] = useActionState(submitGuideApplicationAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const submittedValues = useRef(new Map<string, FormDataEntryValue>());
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});
  const {
    availability: usernameStatus,
    isChecking: isCheckingUsername,
    check: checkUsername,
  } = useUsernameAvailability({
    isCurrentUsername: (value) => value === username?.toLowerCase(),
  });

  const hasClientErrors = Object.keys(clientErrors).length > 0;
  const fieldErrors = hasClientErrors ? clientErrors : state.fieldErrors ?? clientErrors;
  const errorMessage = state.error ?? (hasClientErrors ? "Complete the required fields below." : undefined);
  const submitErrorMessage = errorMessage === "Complete the required fields below."
    ? "Complete the required fields above."
    : errorMessage;

  useEffect(() => {
    if (!state.error || submittedValues.current.size === 0) return;

    // Server Action updates can re-render uncontrolled fields. Restore the last
    // submission so a validation error never discards the applicant's work.
    for (const [name, value] of submittedValues.current) {
      const field = formRef.current?.elements.namedItem(name);
      if (field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement) {
        if (field.type !== "hidden") field.value = value.toString();
      }
    }
  }, [state.error]);

  useEffect(() => {
    const firstFieldName = Object.keys(fieldErrors)[0];
    if (!firstFieldName) return;
    const field = formRef.current?.elements.namedItem(firstFieldName);
    const focusTarget = field instanceof HTMLInputElement && field.type === "hidden"
      ? document.getElementById(`application-${firstFieldName}`)
      : field;
    if (focusTarget instanceof HTMLElement) {
      focusTarget.focus();
      focusTarget.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [fieldErrors]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    const formData = new FormData(event.currentTarget);
    const requiredFields = isGuest ? [...requiredFieldNames, "phone", "email"] : [...requiredFieldNames, "phone"];
    const missing = Object.fromEntries(
      requiredFields
        .filter((name) => !formData.get(name)?.toString().trim())
        .map((name) => [name, name === "languages" ? "Add at least one language you speak." : "This field is required."]),
    );

    if (Object.keys(missing).length > 0) {
      event.preventDefault();
      setClientErrors(missing);
      return;
    }

    submittedValues.current = new Map(
      Array.from(formData.entries()).filter(([name, value]) =>
        typeof value === "string" && !["images", "videos", "mediaOrder"].includes(name),
      ),
    );
    setClientErrors({});
  }

  if (state.success) {
    return (
      <div className="flex flex-col items-center gap-8 py-4 text-center">
        <div className="flex flex-col items-center gap-4">
          <CheckCircle2 className="size-12 text-primary" />
          <h2 className="font-heading text-2xl font-semibold tracking-wide">Application submitted</h2>
          <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
            Thanks! Your guide application is now under review. {isGuest ? "We created your account and emailed a temporary password so you can sign in and follow updates." : "Our team will verify your details and get back to you soon."}
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

        <Button className="rounded-full" nativeButton={false} render={<Link href={isGuest ? "/login" : "/profile"} />}>
          {isGuest ? "Sign in" : "Go to profile"}
        </Button>
      </div>
    );
  }

  return (
    <form ref={formRef} action={formAction} onSubmit={handleSubmit} noValidate className="space-y-5">
      {errorMessage ? (
        <p
          role="alert"
          className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {errorMessage}
        </p>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="application-name">{requiredLabel("Full name")}</Label>
          <input
            id="application-name"
            name="name"
            defaultValue={fullName ?? ""}
            required
            maxLength={120}
            className={`${inputClassName} ${fieldErrors.name ? "border-destructive" : ""}`}
            aria-invalid={Boolean(fieldErrors.name)}
            aria-describedby={fieldErrors.name ? "application-name-error" : undefined}
          />
          {fieldErrors.name ? <p id="application-name-error" role="alert" className="text-xs text-destructive">{fieldErrors.name}</p> : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="application-username">Username</Label>
          <div className="relative">
            <input
              id="application-username"
              name="username"
              defaultValue={username ?? ""}
              minLength={3}
              maxLength={30}
              pattern="[a-z0-9]([a-z0-9._-]*[a-z0-9])?"
              title="3–30 lowercase letters or numbers, with single -, _, or . separators"
              className={`${inputClassName} pr-9 ${fieldErrors.username ? "border-destructive" : ""}`}
              aria-invalid={Boolean(fieldErrors.username) || (usernameStatus ? usernameStatus.status !== "available" : undefined)}
              aria-describedby={fieldErrors.username ? "application-username-error" : undefined}
              onChange={(event) => checkUsername(event.target.value)}
            />
            {isCheckingUsername ? (
              <Loader2 className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
            ) : usernameStatus?.status === "available" ? (
              <Check className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-green-500" />
            ) : usernameStatus ? (
              <AlertTriangle className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-destructive" />
            ) : null}
          </div>
          <p className="text-xs text-muted-foreground">
            Lowercase letters, numbers, or single <code>-</code>, <code>_</code>, <code>.</code> separators. This becomes your public guide URL and can be changed later in Settings.
          </p>
          {usernameStatus?.message ? (
            <p className={`text-xs ${usernameStatus.status === "available" ? "text-green-500" : "text-destructive"}`}>
              {usernameStatus.message}
            </p>
          ) : null}
          {fieldErrors.username ? <p id="application-username-error" role="alert" className="text-xs text-destructive">{fieldErrors.username}</p> : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="application-phone">{requiredLabel("Phone")}</Label>
          <PhoneNumberField
            id="application-phone"
            name="phone"
            defaultValue={phone ?? ""}
            required
            className={`${inputClassName} ${fieldErrors.phone ? "border-destructive" : ""}`}
          />
          {fieldErrors.phone ? <p role="alert" className="text-xs text-destructive">{fieldErrors.phone}</p> : null}
        </div>
        {isGuest ? (
          <div className="space-y-2">
            <Label htmlFor="application-email">{requiredLabel("Email")}</Label>
            <input
              id="application-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              maxLength={254}
              className={`${inputClassName} ${fieldErrors.email ? "border-destructive" : ""}`}
              aria-invalid={Boolean(fieldErrors.email)}
              aria-describedby={fieldErrors.email ? "application-email-error" : undefined}
            />
            {fieldErrors.email ? <p id="application-email-error" role="alert" className="text-xs text-destructive">{fieldErrors.email}</p> : null}
            <p className="text-xs text-muted-foreground">We&apos;ll create your account and email a temporary password.</p>
          </div>
        ) : null}
        <div className="space-y-2">
          <Label htmlFor="application-location">{requiredLabel("Location")}</Label>
          <input
            id="application-location"
            name="location"
            placeholder="e.g. Manali, Himachal Pradesh"
            required
            maxLength={200}
            className={`${inputClassName} ${fieldErrors.location ? "border-destructive" : ""}`}
            aria-invalid={Boolean(fieldErrors.location)}
            aria-describedby={fieldErrors.location ? "application-location-error" : undefined}
          />
          {fieldErrors.location ? <p id="application-location-error" role="alert" className="text-xs text-destructive">{fieldErrors.location}</p> : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="application-experience">{requiredLabel("Experience (years)")}</Label>
          <input
            id="application-experience"
            name="experienceYears"
            type="number"
            min="1"
            max="100"
            step="1"
            required
            onKeyDown={(event) => {
              if (["e", "E", "+", "-", "."].includes(event.key)) event.preventDefault();
            }}
            className={`${inputClassName} ${fieldErrors.experienceYears ? "border-destructive" : ""}`}
            aria-invalid={Boolean(fieldErrors.experienceYears)}
            aria-describedby={fieldErrors.experienceYears ? "application-experience-error" : undefined}
          />
          {fieldErrors.experienceYears ? <p id="application-experience-error" role="alert" className="text-xs text-destructive">{fieldErrors.experienceYears}</p> : null}
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="application-bio">{requiredLabel("About you")}</Label>
          <textarea
            id="application-bio"
            name="bio"
            rows={4}
            placeholder="Tell us about your guiding background, regions you know well, and why you want to guide for Radikal."
            required
            maxLength={3000}
            className={`${textareaClassName} ${fieldErrors.bio ? "border-destructive" : ""}`}
            aria-invalid={Boolean(fieldErrors.bio)}
            aria-describedby={fieldErrors.bio ? "application-bio-error" : undefined}
          />
          {fieldErrors.bio ? <p id="application-bio-error" role="alert" className="text-xs text-destructive">{fieldErrors.bio}</p> : null}
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="application-languages">{requiredLabel("Languages (comma or line separated)")}</Label>
          <textarea
            id="application-languages"
            name="languages"
            rows={2}
            placeholder={"English\nHindi"}
            maxLength={1700}
            className={`${textareaClassName} ${fieldErrors.languages ? "border-destructive" : ""}`}
            aria-invalid={Boolean(fieldErrors.languages)}
            aria-describedby={fieldErrors.languages ? "application-languages-error" : undefined}
          />
          {fieldErrors.languages ? <p id="application-languages-error" role="alert" className="text-xs text-destructive">{fieldErrors.languages}</p> : null}
        </div>

        {!isGuest ? (
          <>
            <div className="space-y-2 md:col-span-2">
              <p className="text-sm font-medium">Profile media</p>
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
          </>
        ) : null}

        <div className="space-y-2 md:col-span-2">
          <p className="text-sm font-medium">Social links</p>
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
            maxLength={2048}
            className={`${inputClassName} ${fieldErrors.instagramUrl ? "border-destructive" : ""}`}
            aria-invalid={Boolean(fieldErrors.instagramUrl)}
            aria-describedby={fieldErrors.instagramUrl ? "application-instagram-error" : undefined}
          />
          {fieldErrors.instagramUrl ? <p id="application-instagram-error" role="alert" className="text-xs text-destructive">{fieldErrors.instagramUrl}</p> : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="application-facebook">Facebook</Label>
          <input
            id="application-facebook"
            name="facebookUrl"
            type="url"
            placeholder="https://facebook.com/…"
            maxLength={2048}
            className={`${inputClassName} ${fieldErrors.facebookUrl ? "border-destructive" : ""}`}
            aria-invalid={Boolean(fieldErrors.facebookUrl)}
            aria-describedby={fieldErrors.facebookUrl ? "application-facebook-error" : undefined}
          />
          {fieldErrors.facebookUrl ? <p id="application-facebook-error" role="alert" className="text-xs text-destructive">{fieldErrors.facebookUrl}</p> : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="application-youtube">YouTube</Label>
          <input
            id="application-youtube"
            name="youtubeUrl"
            type="url"
            placeholder="https://youtube.com/…"
            maxLength={2048}
            className={`${inputClassName} ${fieldErrors.youtubeUrl ? "border-destructive" : ""}`}
            aria-invalid={Boolean(fieldErrors.youtubeUrl)}
            aria-describedby={fieldErrors.youtubeUrl ? "application-youtube-error" : undefined}
          />
          {fieldErrors.youtubeUrl ? <p id="application-youtube-error" role="alert" className="text-xs text-destructive">{fieldErrors.youtubeUrl}</p> : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="application-website">Website</Label>
          <input
            id="application-website"
            name="websiteUrl"
            type="url"
            placeholder="https://…"
            maxLength={2048}
            className={`${inputClassName} ${fieldErrors.websiteUrl ? "border-destructive" : ""}`}
            aria-invalid={Boolean(fieldErrors.websiteUrl)}
            aria-describedby={fieldErrors.websiteUrl ? "application-website-error" : undefined}
          />
          {fieldErrors.websiteUrl ? <p id="application-website-error" role="alert" className="text-xs text-destructive">{fieldErrors.websiteUrl}</p> : null}
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="application-certifications">Certifications</Label>
          <textarea
            id="application-certifications"
            name="certifications"
            rows={4}
            placeholder="Advanced Mountaineering, Wilderness First Aid"
            maxLength={5100}
            className={`${textareaClassName} ${fieldErrors.certifications ? "border-destructive" : ""}`}
            aria-invalid={Boolean(fieldErrors.certifications)}
            aria-describedby={fieldErrors.certifications ? "application-certifications-error" : undefined}
          />
          {fieldErrors.certifications ? <p id="application-certifications-error" role="alert" className="text-xs text-destructive">{fieldErrors.certifications}</p> : null}
          <p className="text-xs text-muted-foreground">
            Separate certifications with commas or new lines.
          </p>
        </div>
      </div>

      {submitErrorMessage ? (
        <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {submitErrorMessage}
        </p>
      ) : null}
      <div className="flex flex-col gap-3 border-t border-border/70 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {username ? `Signed in as @${username}.` : ""} Your details are reviewed by our team before you appear publicly.
        </p>
        <Button type="submit" className="rounded-full" disabled={isPending || (usernameStatus != null && usernameStatus.status !== "available")}>
          {isPending ? "Submitting…" : "Submit application"}
          <ArrowRight />
        </Button>
      </div>
    </form>
  );
}

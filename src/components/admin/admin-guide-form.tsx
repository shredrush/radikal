"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { createGuideAction, updateGuideAction } from "@/lib/actions/guides";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { DeleteGuideButton } from "@/components/admin/delete-guide-button";

const inputClassName =
  "flex h-10 w-full rounded-xl border border-border/70 bg-background/80 px-3 py-2 text-sm shadow-sm outline-none transition focus:border-black focus-visible:ring-2 focus-visible:ring-black/10";

const textareaClassName =
  "min-h-24 w-full rounded-xl border border-border/70 bg-background/80 px-3 py-2 text-sm shadow-sm outline-none transition focus:border-black focus-visible:ring-2 focus-visible:ring-black/10";

export type GuideCertification = {
  title: string;
  issuingBody: string;
  yearIssued: number | null;
  credentialUrl: string | null;
};

export type GuideFormData = {
  id: string;
  name: string;
  slug: string;
  bio: string;
  photo: string | null;
  photos: string[];
  location: string;
  experienceYears: number;
  languages: string[];
  certifications: GuideCertification[];
};

function serializeCertifications(certifications: GuideCertification[]) {
  return certifications
    .map((cert) =>
      [cert.title, cert.issuingBody, cert.yearIssued ?? "", cert.credentialUrl ?? ""].join(" | "),
    )
    .join("\n");
}

export function AdminGuideForm({ guide }: { guide?: GuideFormData }) {
  const [isPending, startTransition] = useTransition();
  const isEditing = Boolean(guide);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      try {
        if (isEditing) {
          await updateGuideAction(formData);
          toast.success(`${guide?.name} updated.`);
        } else {
          await createGuideAction(formData);
          toast.success("Guide created.");
          form.reset();
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Could not save guide.";
        toast.error(message);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {isEditing ? <input type="hidden" name="guideId" value={guide?.id} /> : null}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={isEditing ? `name-${guide?.id}` : "new-guide-name"}>Full name</Label>
          <input
            id={isEditing ? `name-${guide?.id}` : "new-guide-name"}
            name="name"
            defaultValue={guide?.name}
            required
            className={inputClassName}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={isEditing ? `slug-${guide?.id}` : "new-guide-slug"}>Slug</Label>
          <input
            id={isEditing ? `slug-${guide?.id}` : "new-guide-slug"}
            name="slug"
            defaultValue={guide?.slug}
            required
            minLength={3}
            maxLength={30}
            pattern="[a-z0-9]([a-z0-9._-]*[a-z0-9])?"
            title="3–30 lowercase letters or numbers, with single -, _, or . separators"
            className={inputClassName}
          />
          <p className="text-xs text-muted-foreground">
            Lowercase letters, numbers, or single <code>-</code>, <code>_</code>, <code>.</code> separators. This is the guide&apos;s public URL slug.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor={isEditing ? `location-${guide?.id}` : "new-guide-location"}>Location</Label>
          <input
            id={isEditing ? `location-${guide?.id}` : "new-guide-location"}
            name="location"
            defaultValue={guide?.location}
            required
            className={inputClassName}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={isEditing ? `experience-${guide?.id}` : "new-guide-experience"}>Experience (years)</Label>
          <input
            id={isEditing ? `experience-${guide?.id}` : "new-guide-experience"}
            name="experienceYears"
            type="number"
            min="0"
            defaultValue={guide?.experienceYears ?? 0}
            className={inputClassName}
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor={isEditing ? `photo1-${guide?.id}` : "new-guide-photo1"}>Photo 1 URL</Label>
          <input
            id={isEditing ? `photo1-${guide?.id}` : "new-guide-photo1"}
            name="photo1"
            defaultValue={guide?.photos[0] ?? guide?.photo ?? ""}
            placeholder="https://… or /path/to/image.jpg"
            className={inputClassName}
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor={isEditing ? `photo2-${guide?.id}` : "new-guide-photo2"}>Photo 2 URL</Label>
          <input
            id={isEditing ? `photo2-${guide?.id}` : "new-guide-photo2"}
            name="photo2"
            defaultValue={guide?.photos[1] ?? ""}
            placeholder="https://… or /path/to/image.jpg (optional)"
            className={inputClassName}
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor={isEditing ? `photo3-${guide?.id}` : "new-guide-photo3"}>Photo 3 URL</Label>
          <input
            id={isEditing ? `photo3-${guide?.id}` : "new-guide-photo3"}
            name="photo3"
            defaultValue={guide?.photos[2] ?? ""}
            placeholder="https://… or /path/to/image.jpg (optional)"
            className={inputClassName}
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor={isEditing ? `bio-${guide?.id}` : "new-guide-bio"}>Bio</Label>
          <textarea
            id={isEditing ? `bio-${guide?.id}` : "new-guide-bio"}
            name="bio"
            defaultValue={guide?.bio}
            rows={4}
            required
            className={textareaClassName}
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor={isEditing ? `languages-${guide?.id}` : "new-guide-languages"}>
            Languages (comma or line separated)
          </Label>
          <textarea
            id={isEditing ? `languages-${guide?.id}` : "new-guide-languages"}
            name="languages"
            defaultValue={guide?.languages.join("\n")}
            rows={3}
            className={textareaClassName}
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor={isEditing ? `certifications-${guide?.id}` : "new-guide-certifications"}>
            Certifications
          </Label>
          <textarea
            id={isEditing ? `certifications-${guide?.id}` : "new-guide-certifications"}
            name="certifications"
            defaultValue={guide ? serializeCertifications(guide.certifications) : ""}
            rows={4}
            placeholder={"Advanced Mountaineering | Indian Mountaineering Foundation (IMF) | 2012 | https://…"}
            className={textareaClassName}
          />
          <p className="text-xs text-muted-foreground">
            One per line: <span className="font-medium">Title | Issuing body | Year | URL</span>. Year and URL are optional.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/70 pt-4">
        <p className="text-sm text-muted-foreground">
          {isEditing ? "Changes publish instantly on the public site after saving." : "Add a new guide to the community roster."}
        </p>
        <div className="flex items-center gap-3">
          {isEditing ? <DeleteGuideButton guideId={guide!.id} guideName={guide!.name} /> : null}
          <Button type="submit" className="rounded-full" disabled={isPending}>
            {isPending ? "Saving…" : isEditing ? "Save changes" : "Create guide"}
          </Button>
        </div>
      </div>
    </form>
  );
}

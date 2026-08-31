"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { updateOwnGuideProfileAction } from "@/lib/actions/guides";
import { FORM_FIELD_BORDER } from "@/lib/boundary-styles";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { MediaUploader } from "@/components/media/media-uploader";
import { GuideSportsField } from "@/components/guides/guide-sports";

const inputClassName =
  `flex h-10 w-full rounded-xl border ${FORM_FIELD_BORDER} bg-background/80 px-3 py-2 text-sm shadow-sm outline-none transition focus:border-ring focus-visible:ring-2 focus-visible:ring-ring/30`;

const textareaClassName =
  `min-h-24 w-full rounded-xl border ${FORM_FIELD_BORDER} bg-background/80 px-3 py-2 text-sm shadow-sm outline-none transition focus:border-ring focus-visible:ring-2 focus-visible:ring-ring/30`;

type Certification = {
  title: string;
};

export type GuideProfileEditorData = {
  id: string;
  userId: string;
  name: string;
  bio: string;
  photo: string | null;
  photos: string[];
  videos: string[];
  mediaOrder: string[];
  location: string;
  experienceYears: number;
  languages: string[];
  sports: string[];
  certifications: Certification[];
};

function serializeCertifications(certifications: Certification[]) {
  return certifications.map((cert) => cert.title).join("\n");
}

export function GuideProfileEditor({ guide }: { guide: GuideProfileEditorData }) {
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      try {
        await updateOwnGuideProfileAction(formData);
        toast.success("Your public profile has been updated.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not update your public profile.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-5">
        <div className="grid gap-2 md:grid-cols-[11rem_1fr] md:items-center">
          <Label htmlFor="guide-profile-name">Full name</Label>
          <input id="guide-profile-name" name="name" defaultValue={guide.name} required className={inputClassName} />
        </div>
        <div className="grid gap-2 md:grid-cols-[11rem_1fr] md:items-center">
          <Label htmlFor="guide-profile-location">Location</Label>
          <input id="guide-profile-location" name="location" defaultValue={guide.location} required className={inputClassName} />
        </div>
        <div className="grid gap-2 md:grid-cols-[11rem_1fr] md:items-center">
          <Label htmlFor="guide-profile-experience">Experience (years)</Label>
          <input id="guide-profile-experience" name="experienceYears" type="number" min="0" defaultValue={guide.experienceYears} className={inputClassName} />
        </div>
        <div className="grid gap-2 md:grid-cols-[11rem_1fr]">
          <div className="space-y-1">
            <p className="text-sm font-medium">Profile media</p>
            <p className="text-xs text-muted-foreground">Photos and videos shown on your public profile.</p>
          </div>
          <MediaUploader
            entity="guide"
            folderKey={guide.userId}
            initialImages={guide.photos.length ? guide.photos : guide.photo ? [guide.photo] : []}
            initialVideos={guide.videos}
            initialMediaOrder={guide.mediaOrder}
            imagesFieldName="photos"
            videosFieldName="videos"
            mediaOrderFieldName="mediaOrder"
          />
        </div>
        <div className="grid gap-2 md:grid-cols-[11rem_1fr]">
          <Label htmlFor="guide-profile-bio" className="md:pt-2">Bio</Label>
          <textarea id="guide-profile-bio" name="bio" defaultValue={guide.bio} rows={5} required className={textareaClassName} />
        </div>
        <div className="grid gap-2 md:grid-cols-[11rem_1fr]">
          <Label htmlFor="guide-profile-languages" className="md:pt-2">Languages</Label>
          <div className="space-y-2">
            <textarea id="guide-profile-languages" name="languages" defaultValue={guide.languages.join("\n")} rows={3} className={textareaClassName} />
            <p className="text-xs text-muted-foreground">Separate languages with commas or new lines.</p>
          </div>
        </div>
        <div className="grid gap-2 md:grid-cols-[11rem_1fr]">
          <Label htmlFor="guide-profile-certifications" className="md:pt-2">Certifications</Label>
          <div className="space-y-2">
            <textarea id="guide-profile-certifications" name="certifications" defaultValue={serializeCertifications(guide.certifications)} rows={4} placeholder="Advanced Mountaineering, Wilderness First Aid" className={textareaClassName} />
            <p className="text-xs text-muted-foreground">Separate certifications with commas or new lines.</p>
          </div>
        </div>
        <div className="grid gap-2 md:grid-cols-[11rem_1fr]">
          <p className="text-sm font-medium">Sports</p>
          <GuideSportsField sports={guide.sports} />
        </div>
      </div>

      <div className="flex items-center justify-end border-t border-border/70 pt-5">
        <Button type="submit" className="rounded-full" disabled={isPending}>
          {isPending ? "Saving..." : "Save public profile"}
        </Button>
      </div>
    </form>
  );
}

"use client";

import { useState, useTransition } from "react";
import { Pencil, Save, X } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import { TripGallery } from "@/components/trips/trip-gallery";
import { MediaUploader } from "@/components/media/media-uploader";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { updateOwnGuideProfileAction } from "@/lib/actions/guides";
import { ACCENT_PILL } from "@/lib/card-styles";
import { GuideSports, GuideSportsField } from "@/components/guides/guide-sports";

type GuideHeroData = {
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
  certifications: { title: string }[];
};

const inputClassName = "w-full rounded-lg border border-border/80 bg-background px-2 py-1 text-inherit outline-none focus:border-ring focus:ring-2 focus:ring-ring/20";

function sameMediaValues(left: string[], right: string[]) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

export function GuideProfileHeroEditor({ guide, fallbackImage }: { guide: GuideHeroData; fallbackImage: string }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [mediaDialogOpen, setMediaDialogOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [mediaValues, setMediaValues] = useState(() => {
    const images = guide.photos.length ? guide.photos : guide.photo ? [guide.photo] : [];
    return { images, videos: guide.videos, mediaOrder: guide.mediaOrder };
  });
  const formId = "guide-profile-hero-form";
  const images = mediaValues.images.length > 0 ? mediaValues.images : [fallbackImage];

  function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      try {
        await updateOwnGuideProfileAction(formData);
        toast.success("Your public profile has been updated.");
        setEditing(false);
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not update your public profile.");
      }
    });
  }

  return (
    <div>
      <div className="mb-3 flex justify-end">
        {!editing ? (
          <Button type="button" variant="outline" size="sm" onClick={() => setEditing(true)} className="rounded-full">
            <Pencil className="h-3.5 w-3.5" /> Edit
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" className="rounded-full border-2 border-black text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => setEditing(false)} disabled={isPending}><X className="h-4 w-4" /> Cancel</Button>
            <Button type="submit" form={formId} size="sm" className="rounded-full" disabled={isPending}><Save className="h-3.5 w-3.5" /> {isPending ? "Saving..." : "Save"}</Button>
          </div>
        )}
      </div>
    <article className="overflow-hidden rounded-[2rem] border border-border/70 shadow-[0_30px_60px_-30px_rgba(15,23,42,0.35)]">
      <div className="grid gap-0 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="relative h-[320px] self-stretch sm:h-[400px] lg:h-auto lg:min-h-[420px]">
          <TripGallery
            images={images}
            videos={mediaValues.videos}
            mediaOrder={mediaValues.mediaOrder}
            fallbackImage={fallbackImage}
            alt={guide.name}
            compact
            onMediaClick={editing ? () => setMediaDialogOpen(true) : undefined}
          />
          {editing ? <p className="pointer-events-none absolute left-4 top-4 z-20 rounded-full bg-black/65 px-3 py-1.5 text-xs font-semibold text-white">Click any image to edit media</p> : null}
        </div>

        <div className="relative flex flex-col justify-start p-6 sm:p-8 lg:p-8">
          {!editing ? (
            <>
              <div className="space-y-3">
                <div>
                  <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">{guide.name}</h1>
                  <p className="mt-2 text-sm font-semibold uppercase tracking-[0.25em] text-muted-foreground">{guide.location}</p>
                </div>
                <p className="text-base leading-7 text-muted-foreground"><span className="font-heading text-lg font-semibold text-emerald-700 dark:text-emerald-400">{guide.experienceYears}+</span> years experience</p>
                <p className="text-sm leading-6 text-muted-foreground">{guide.bio}</p>
              </div>
              <div className="mt-6 space-y-5">
                <div><p className="text-[0.7rem] font-semibold uppercase tracking-[0.25em] text-muted-foreground">Certifications</p><div className="mt-3 flex flex-wrap gap-2">{guide.certifications.map((certification) => <span key={certification.title} className={`rounded-full border ${ACCENT_PILL} px-3 py-1.5 text-sm font-medium`}>{certification.title}</span>)}</div></div>
                <GuideSports sports={guide.sports} />
                <div><p className="text-[0.7rem] font-semibold uppercase tracking-[0.25em] text-muted-foreground">Languages</p><div className="mt-3 flex flex-wrap gap-2">{guide.languages.map((language) => <span key={language} className="rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">{language}</span>)}</div></div>
              </div>
            </>
          ) : (
            <form id={formId} onSubmit={saveProfile} className="space-y-4">
              <div><input name="name" defaultValue={guide.name} aria-label="Guide name" required maxLength={120} className={`${inputClassName} font-heading text-3xl font-semibold tracking-tight sm:text-4xl`} /><input name="location" defaultValue={guide.location} aria-label="Location" required maxLength={200} className={`${inputClassName} mt-2 text-sm font-semibold uppercase tracking-[0.25em] text-muted-foreground`} /></div>
              <p className="flex items-center gap-2 text-base leading-7 text-muted-foreground"><input name="experienceYears" type="number" min="0" max="100" defaultValue={guide.experienceYears} aria-label="Years of experience" className="w-16 rounded-lg border border-border/80 bg-background px-2 py-1 font-heading text-lg font-semibold text-emerald-700 outline-none focus:ring-2 focus:ring-ring/20 dark:text-emerald-400" /> years experience</p>
              <textarea name="bio" defaultValue={guide.bio} aria-label="Bio" required rows={4} maxLength={3000} className={`${inputClassName} resize-none text-sm leading-6 text-muted-foreground`} />
              <div><p className="mb-2 text-[0.7rem] font-semibold uppercase tracking-[0.25em] text-muted-foreground">Certifications</p><textarea name="certifications" defaultValue={guide.certifications.map((certification) => certification.title).join("\n")} rows={3} maxLength={5100} className={`${inputClassName} resize-none text-sm`} /></div>
              <GuideSportsField sports={guide.sports} />
              <div><p className="mb-2 text-[0.7rem] font-semibold uppercase tracking-[0.25em] text-muted-foreground">Languages</p><textarea name="languages" defaultValue={guide.languages.join("\n")} rows={2} maxLength={1700} className={`${inputClassName} resize-none text-sm`} /></div>
              {mediaValues.mediaOrder.map((url) => <input key={`order-${url}`} type="hidden" name="mediaOrder" value={url} />)}
              {mediaValues.images.map((url) => <input key={`photo-${url}`} type="hidden" name="photos" value={url} />)}
              {mediaValues.videos.map((url) => <input key={`video-${url}`} type="hidden" name="videos" value={url} />)}
            </form>
          )}
        </div>
      </div>

      <Dialog open={mediaDialogOpen} onOpenChange={setMediaDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
          <DialogHeader><DialogTitle>Edit profile media</DialogTitle><DialogDescription>Upload, remove, and reorder the photos and videos in your public profile.</DialogDescription></DialogHeader>
          <div className="mt-5"><MediaUploader entity="guide" folderKey={guide.userId} initialImages={mediaValues.images} initialVideos={mediaValues.videos} initialMediaOrder={mediaValues.mediaOrder} emitHiddenInputs={false} onMediaChange={(nextMedia) => setMediaValues((current) => sameMediaValues(current.images, nextMedia.images) && sameMediaValues(current.videos, nextMedia.videos) && sameMediaValues(current.mediaOrder, nextMedia.mediaOrder) ? current : nextMedia)} /></div>
        </DialogContent>
      </Dialog>
    </article>
    </div>
  );
}

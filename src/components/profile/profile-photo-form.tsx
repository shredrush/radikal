"use client";

import Image from "next/image";
import { useActionState, useRef, useState } from "react";
import type { ReactElement } from "react";
import { Camera, Check, ImagePlus, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PROFILE_AVATARS } from "@/lib/profile-avatars";
import { updateProfilePhotoAction, type ProfilePhotoActionState } from "@/lib/actions/profile";

const initialState: ProfilePhotoActionState = {};

export function ProfilePhotoForm({
  currentImage,
  trigger,
}: {
  currentImage: string | null;
  trigger?: ReactElement;
}) {
  const [state, formAction, isPending] = useActionState(updateProfilePhotoAction, initialState);
  const [selectedAvatar, setSelectedAvatar] = useState(
    PROFILE_AVATARS.find((avatar) => avatar.src === currentImage)?.key ?? "",
  );
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <Dialog>
      {trigger ? (
        <DialogTrigger render={trigger} />
      ) : (
        <DialogTrigger className="inline-flex items-center gap-1 text-[0.6rem] font-semibold uppercase tracking-[0.12em] text-primary underline-offset-4 hover:underline">
          <Camera className="size-3" />
          Edit profile photo
        </DialogTrigger>
      )}
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Change profile photo</DialogTitle>
          <DialogDescription>Choose an animal avatar or upload a photo from your device.</DialogDescription>
        </DialogHeader>
        <form action={formAction} className="mt-5 flex flex-col gap-5">
          {state.success ? <p role="status" className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-600 dark:text-emerald-400">Profile photo updated successfully.</p> : null}
          {state.error ? <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.error}</p> : null}

          <fieldset className="flex flex-col gap-3">
            <legend className="text-sm font-medium">Choose an avatar</legend>
            <div className="grid grid-cols-4 gap-3 sm:grid-cols-8">
              {PROFILE_AVATARS.map((avatar) => (
                <label key={avatar.key} className="group flex cursor-pointer flex-col items-center gap-1.5 text-center text-[0.65rem] text-muted-foreground">
                  <input type="radio" name="avatarKey" value={avatar.key} checked={selectedAvatar === avatar.key} onChange={() => { setSelectedAvatar(avatar.key); setPreview(null); if (fileInputRef.current) fileInputRef.current.value = ""; }} className="sr-only" />
                  <span className={`relative rounded-full p-0.5 ring-2 transition ${selectedAvatar === avatar.key ? "ring-primary" : "ring-transparent group-hover:ring-border"}`}>
                    <Image src={avatar.src} alt={avatar.label} width={52} height={52} className="size-12 rounded-full object-contain" />
                    {selectedAvatar === avatar.key ? <Check className="absolute -right-1 -top-1 rounded-full bg-primary p-0.5 text-primary-foreground" size={18} /> : null}
                  </span>
                  {avatar.label}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="flex flex-col gap-2 border-t border-border/60 pt-4">
            <Label htmlFor="profile-photo">Or upload from your device</Label>
            <Input ref={fileInputRef} id="profile-photo" name="photo" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { const file = event.target.files?.[0]; if (file) { setPreview(URL.createObjectURL(file)); setSelectedAvatar(""); } }} className="h-11 rounded-lg border border-border/80 bg-muted/10 px-3 py-2 file:mr-3 file:rounded-md file:border file:border-border/80 file:bg-background file:px-3 file:py-1 file:text-xs file:font-semibold file:text-foreground hover:border-foreground/40" />
            <p className="text-xs text-muted-foreground">JPG, PNG, or WebP. Maximum file size: 4 MB.</p>
          </div>

          {preview ? <div className="flex items-center gap-3 text-sm text-muted-foreground"><ImagePlus className="h-4 w-4" /> Selected photo preview <Image src={preview} alt="Selected profile photo" width={40} height={40} unoptimized className="size-10 rounded-full object-cover" /></div> : null}
          <Button type="submit" disabled={isPending} className="w-full sm:w-auto"><Camera />{isPending ? <><Loader2 className="animate-spin" /> Updating...</> : "Update profile photo"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
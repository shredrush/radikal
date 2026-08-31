"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
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
import { convertHeicToJpeg, isHeicFile } from "@/lib/heic";
import { createMediaUploadAction } from "@/lib/actions/media";
import { CACHE_CONTROL, MAX_PROFILE_IMAGE_BYTES } from "@/lib/media-constants";
import { PROFILE_AVATARS } from "@/lib/profile-avatars";
import { updateProfilePhotoAction } from "@/lib/actions/profile";

export function ProfilePhotoForm({
  currentImage,
  userId,
  trigger,
  initialOpen = false,
}: {
  currentImage: string | null;
  userId: string;
  trigger?: ReactElement;
  initialOpen?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(initialOpen);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [selectedAvatar, setSelectedAvatar] = useState(
    PROFILE_AVATARS.find((avatar) => avatar.src === currentImage)?.key ?? "",
  );
  const [preview, setPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [converting, setConverting] = useState(false);
  const conversionToken = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function resetForm() {
    setError(null);
    setPreview(null);
    setPhotoFile(null);
    setConverting(false);
    conversionToken.current += 1;
    setSelectedAvatar(
      PROFILE_AVATARS.find((avatar) => avatar.src === currentImage)?.key ?? "",
    );
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (nextOpen) resetForm();
  }

  async function handleFileChange(file: File) {
    setError(null);
    setSelectedAvatar("");
    if (!isHeicFile(file)) {
      setPhotoFile(file);
      setPreview(URL.createObjectURL(file));
      return;
    }

    // iPhones shoot HEIC by default. Convert to JPEG client-side so the photo
    // previews and stores as a format that renders everywhere.
    const token = ++conversionToken.current;
    setConverting(true);
    try {
      const jpeg = await convertHeicToJpeg(file);
      if (token !== conversionToken.current) return; // a newer file was picked
      setPhotoFile(jpeg);
      setPreview(URL.createObjectURL(jpeg));
    } catch {
      if (token !== conversionToken.current) return;
      setPhotoFile(null);
      setPreview(null);
      setError(
        "Could not convert this iPhone photo (HEIC). Please upload a JPG, PNG, or WebP instead.",
      );
    } finally {
      if (token === conversionToken.current) setConverting(false);
    }
  }

  function uploadToSignedUrl(url: string, form: FormData): Promise<void> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", url);
      xhr.setRequestHeader("authorization", `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""}`);
      xhr.setRequestHeader("x-upsert", "false");
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) resolve();
        else reject(new Error("Upload failed. Please try again."));
      };
      xhr.onerror = () => reject(new Error("Upload failed. Please try again."));
      xhr.send(form);
    });
  }

  async function uploadProfilePhoto(file: File): Promise<string> {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      throw new Error("Upload a JPG, PNG, or WebP photo.");
    }
    if (file.size <= 0 || file.size > MAX_PROFILE_IMAGE_BYTES) {
      throw new Error(`Photo must be ${Math.round(MAX_PROFILE_IMAGE_BYTES / 1024 / 1024)} MB or smaller.`);
    }

    const { token, publicUrl, path } = await createMediaUploadAction({
      entity: "profile",
      folderKey: userId,
      kind: "images",
      contentType: file.type,
      size: file.size,
    });
    const marker = "/storage/v1/object/public/";
    const markerIndex = publicUrl.indexOf(marker);
    const baseUrl = markerIndex >= 0 ? publicUrl.slice(0, markerIndex) : "";
    const encodedPath = path.split("/").map(encodeURIComponent).join("/");
    const signedUrl = `${baseUrl}/storage/v1/object/upload/sign/profile-media/${encodedPath}?token=${encodeURIComponent(token)}`;
    const form = new FormData();
    form.append("cacheControl", CACHE_CONTROL);
    form.append("", file);
    await uploadToSignedUrl(signedUrl, form);
    return publicUrl;
  }

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        if (photoFile) formData.set("imageUrl", await uploadProfilePhoto(photoFile));
        const result = await updateProfilePhotoAction({}, formData);
        if (result.error) {
          setError(result.error);
          return;
        }
        setOpen(false);
        setPreview(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        router.refresh();
      } catch {
        setError("Could not update your profile photo. Please try again.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
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
        <form action={handleSubmit} className="mt-5 flex flex-col gap-5">
          {error ? <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p> : null}

          <fieldset className="flex flex-col gap-3">
            <legend className="text-sm font-medium">Choose an avatar</legend>
            <div className="grid grid-cols-4 gap-3 sm:grid-cols-8">
              {PROFILE_AVATARS.map((avatar) => (
                <label key={avatar.key} className="group flex cursor-pointer flex-col items-center gap-1.5 text-center text-[0.65rem] text-muted-foreground">
                  <input type="radio" name="avatarKey" value={avatar.key} checked={selectedAvatar === avatar.key} onChange={() => { setSelectedAvatar(avatar.key); setPreview(null); setPhotoFile(null); conversionToken.current += 1; if (fileInputRef.current) fileInputRef.current.value = ""; }} className="sr-only" />
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
            <Input ref={fileInputRef} id="profile-photo" type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif" onChange={(event) => { const file = event.target.files?.[0]; if (file) handleFileChange(file); }} className="h-11 rounded-lg border border-border/80 bg-muted/10 px-3 py-2 file:mr-3 file:rounded-md file:border file:border-border/80 file:bg-background file:px-3 file:py-1 file:text-xs file:font-semibold file:text-foreground hover:border-foreground/40" />
            <p className="text-xs text-muted-foreground">JPG, PNG, WebP, or HEIC (iPhone) photos. Maximum file size: 4 MB.</p>
          </div>

          {preview ? <div className="flex items-center gap-3 text-sm text-muted-foreground"><ImagePlus className="h-4 w-4" /> Selected photo preview <Image src={preview} alt="Selected profile photo" width={40} height={40} unoptimized className="size-10 rounded-full object-cover" /></div> : null}
          <Button type="submit" disabled={isPending || converting} className="w-full sm:w-auto"><Camera />{converting ? <><Loader2 className="animate-spin" /> Converting...</> : isPending ? <><Loader2 className="animate-spin" /> Updating...</> : "Update profile photo"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

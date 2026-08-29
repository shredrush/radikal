"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { Loader2, Play, Plus, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { createMediaUploadAction, deleteMediaAction } from "@/lib/actions/media";
import {
  CACHE_CONTROL,
  IMAGE_MIME,
  MAX_IMAGE_BYTES,
  MAX_VIDEO_BYTES,
  MAX_VIDEO_SECONDS,
  MEDIA_LIMITS,
  VIDEO_MIME,
  type MediaEntity,
  type MediaKind,
} from "@/lib/media-constants";

type UploadedItem = {
  url: string;
  /** Storage path of an object uploaded in this session (for direct cleanup). */
  path?: string;
};

function readVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(video.duration || 0);
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read the video file."));
    };
    video.src = url;
  });
}

/**
 * File picker + direct-to-Supabase uploader for a form. It uploads each file
 * straight to Storage via a server-issued signed URL (bypassing Vercel's
 * server-action body limit) and emits the resulting public URLs as hidden
 * inputs, so the surrounding form's `new FormData(form)` picks them up.
 */
export function MediaUploader({
  entity,
  folderKey,
  initialImages = [],
  initialVideos = [],
  imagesFieldName = "images",
  videosFieldName = "videos",
}: {
  entity: MediaEntity;
  folderKey: string;
  initialImages?: string[];
  initialVideos?: string[];
  imagesFieldName?: string;
  videosFieldName?: string;
}) {
  const limits = MEDIA_LIMITS[entity];
  const [images, setImages] = useState<UploadedItem[]>(initialImages.map((url) => ({ url })));
  const [videos, setVideos] = useState<UploadedItem[]>(initialVideos.map((url) => ({ url })));
  const [uploading, setUploading] = useState(0);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  function listFor(kind: MediaKind): UploadedItem[] {
    return kind === "images" ? images : videos;
  }

  async function uploadFile(file: File, kind: MediaKind): Promise<void> {
    const mimeSet = kind === "images" ? IMAGE_MIME : VIDEO_MIME;
    if (!mimeSet.has(file.type)) {
      throw new Error(
        kind === "images"
          ? "Only JPG, PNG, WebP, or AVIF images are supported."
          : "Only MP4 or WebM videos are supported.",
      );
    }

    const maxBytes = kind === "images" ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;
    if (file.size > maxBytes) {
      throw new Error(`File is too large (max ${Math.round(maxBytes / 1024 / 1024)} MB).`);
    }

    if (kind === "videos") {
      const seconds = await readVideoDuration(file);
      if (seconds > MAX_VIDEO_SECONDS) {
        throw new Error(
          `Videos must be ${MAX_VIDEO_SECONDS} seconds or shorter (this one is ${Math.round(seconds)}s).`,
        );
      }
    }

    const { signedUrl, publicUrl, path } = await createMediaUploadAction({
      entity,
      folderKey,
      kind,
      contentType: file.type,
      size: file.size,
    });

    const res = await fetch(signedUrl, {
      method: "POST",
      headers: {
        "content-type": file.type,
        "cache-control": CACHE_CONTROL,
        "x-upsert": "false",
      },
      body: file,
    });
    if (!res.ok) {
      throw new Error("Upload failed. Please try again.");
    }

    const item: UploadedItem = { url: publicUrl, path };
    if (kind === "images") {
      setImages((prev) => [...prev, item]);
    } else {
      setVideos((prev) => [...prev, item]);
    }
  }

  async function handleFiles(fileList: FileList | null, kind: MediaKind) {
    if (!fileList) return;
    const files = Array.from(fileList);
    const max = kind === "images" ? limits.images : limits.videos;
    const current = listFor(kind);
    const remaining = max - current.length;

    if (remaining <= 0) {
      toast.error(`You can add up to ${max} ${kind === "images" ? "photos" : "videos"}.`);
      return;
    }
    if (files.length > remaining) {
      toast.error(`You can add up to ${remaining} more ${kind === "images" ? "photo" : "video"}(s).`);
    }
    const accepted = files.slice(0, remaining);
    setUploading((n) => n + accepted.length);

    // Bounded concurrency: several files upload at once, but never so many
    // that the client slams the server with simultaneous signed-URL requests.
    const CONCURRENCY = 3;
    for (let i = 0; i < accepted.length; i += CONCURRENCY) {
      const batch = accepted.slice(i, i + CONCURRENCY);
      await Promise.allSettled(
        batch.map((file) =>
          uploadFile(file, kind).catch((error) => {
            toast.error(error instanceof Error ? error.message : "Upload failed.");
          }),
        ),
      );
      setUploading((n) => Math.max(0, n - batch.length));
    }

    const inputRef = kind === "images" ? imageInputRef : videoInputRef;
    if (inputRef.current) inputRef.current.value = "";
  }

  function handleRemove(kind: MediaKind, item: UploadedItem) {
    const setter = kind === "images" ? setImages : setVideos;
    setter((prev) => prev.filter((entry) => entry.url !== item.url));
    if (item.path) {
      deleteMediaAction({ entity, folderKey, paths: [item.path] }).catch(() => {});
    }
  }

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <Label>
            Photos ({images.length}/{limits.images})
          </Label>
          <input
            ref={imageInputRef}
            type="file"
            accept={[...IMAGE_MIME].join(",")}
            multiple
            className="hidden"
            onChange={(event) => handleFiles(event.target.files, "images")}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-full"
            disabled={uploading > 0 || images.length >= limits.images}
            onClick={() => imageInputRef.current?.click()}
          >
            <Plus className="h-3.5 w-3.5" />
            Add photos
          </Button>
        </div>

        {images.length > 0 ? (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {images.map((item) => (
              <div
                key={item.url}
                className="group relative aspect-square overflow-hidden rounded-xl border border-border/70 bg-muted"
              >
                <Image
                  src={item.url}
                  alt="Uploaded photo"
                  fill
                  className="object-cover"
                  sizes="120px"
                />
                <button
                  type="button"
                  onClick={() => handleRemove("images", item)}
                  aria-label="Remove photo"
                  className="absolute right-1.5 top-1.5 rounded-full bg-black/60 p-1 text-white opacity-0 transition group-hover:opacity-100"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">No photos yet.</p>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <Label>
            Videos ({videos.length}/{limits.videos}) · max {MAX_VIDEO_SECONDS}s each
          </Label>
          <input
            ref={videoInputRef}
            type="file"
            accept={[...VIDEO_MIME].join(",")}
            multiple
            className="hidden"
            onChange={(event) => handleFiles(event.target.files, "videos")}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-full"
            disabled={uploading > 0 || videos.length >= limits.videos}
            onClick={() => videoInputRef.current?.click()}
          >
            <Plus className="h-3.5 w-3.5" />
            Add videos
          </Button>
        </div>

        {videos.length > 0 ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {videos.map((item) => (
              <div
                key={item.url}
                className="group relative aspect-video overflow-hidden rounded-xl border border-border/70 bg-black"
              >
                <video
                  src={item.url}
                  preload="metadata"
                  muted
                  playsInline
                  className="h-full w-full object-cover"
                />
                <Play className="pointer-events-none absolute left-1/2 top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 text-white/80" />
                <button
                  type="button"
                  onClick={() => handleRemove("videos", item)}
                  aria-label="Remove video"
                  className="absolute right-1.5 top-1.5 rounded-full bg-black/60 p-1 text-white opacity-0 transition group-hover:opacity-100"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">No videos yet.</p>
        )}
      </div>

      {uploading > 0 ? (
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Uploading {uploading} file{uploading === 1 ? "" : "s"}…
        </p>
      ) : null}

      {images.map((item) => (
        <input key={`img-${item.url}`} type="hidden" name={imagesFieldName} value={item.url} />
      ))}
      {videos.map((item) => (
        <input key={`vid-${item.url}`} type="hidden" name={videosFieldName} value={item.url} />
      ))}
    </div>
  );
}

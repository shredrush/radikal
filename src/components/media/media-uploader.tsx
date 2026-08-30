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
  // Upload progress as a percentage (0..100). Represents bytes uploaded across
  // all in-flight files in the current batch, weighted by file size.
  const [progress, setProgress] = useState(0);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  function listFor(kind: MediaKind): UploadedItem[] {
    return kind === "images" ? images : videos;
  }

  /**
   * Upload a file to the Signed URL with XMLHttpRequest so `upload.onprogress`
   * reports real byte-level progress. Mirrors the wire format the supabase-js
   * SDK uses (HTTP PUT + FormData), which is the one that persists; passing the
   * raw File as a plain body is accepted by the endpoint but does not store.
   */
  function uploadToSignedUrl(url: string, form: FormData, onProgress: (pct: number) => void): Promise<void> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", url);
      xhr.setRequestHeader("authorization", `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""}`);
      xhr.setRequestHeader("x-upsert", "false");
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && event.total > 0) {
          onProgress(Math.round((event.loaded / event.total) * 100));
        }
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) resolve();
        else reject(new Error(`Upload failed. Please try again.`));
      };
      xhr.onerror = () => reject(new Error(`Upload failed. Please try again.`));
      xhr.send(form);
    });
  }

  async function uploadFile(file: File, kind: MediaKind): Promise<void> {
    const mimeSet = kind === "images" ? IMAGE_MIME : VIDEO_MIME;
    if (!mimeSet.has(file.type)) {
      throw new Error(
        kind === "images"
          ? "Only JPG, PNG, WebP, or AVIF images are supported."
          : "Only MP4, WebM, or MOV videos are supported.",
      );
    }

    const maxBytes = kind === "images" ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;
    if (file.size > maxBytes) {
      throw new Error(`File is too large (max ${Math.round(maxBytes / 1024 / 1024)} MB).`);
    }

    const { token, publicUrl, path } = await createMediaUploadAction({
      entity,
      folderKey,
      kind,
      contentType: file.type,
      size: file.size,
    });

    // Reconstruct the signed upload URL exactly like the server did ("PUT")
    // and mirror the SDK's FormData payload — the format that actually stores.
    const marker = "/storage/v1/object/public/";
    const markerIndex = publicUrl.indexOf(marker);
    const baseUrl = markerIndex >= 0 ? publicUrl.slice(0, markerIndex) : "";
    const bucket = entity === "guide" ? "guide-media" : "trip-media";
    const encodedPath = path.split("/").map(encodeURIComponent).join("/");
    const signedUrl = `${baseUrl}/storage/v1/object/upload/sign/${bucket}/${encodedPath}?token=${encodeURIComponent(token)}`;

    const form = new FormData();
    form.append("cacheControl", CACHE_CONTROL);
    form.append("", file); // unnamed part carries the file

    await uploadToSignedUrl(signedUrl, form, (pct) => setProgress(pct));

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
    setProgress(0);

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
            Videos ({videos.length}/{limits.videos})
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
        <div className="space-y-1.5">
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Uploading {uploading} file{uploading === 1 ? "" : "s"}… {progress}%
          </p>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-200"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
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

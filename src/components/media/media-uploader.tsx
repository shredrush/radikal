"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Loader2, Play, Plus, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { convertHeicToJpeg, isHeicFile } from "@/lib/heic";
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
import { normalizeMediaOrder } from "@/lib/media-order";

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
  initialMediaOrder = [],
  imagesFieldName = "images",
  videosFieldName = "videos",
  mediaOrderFieldName = "mediaOrder",
  formId,
  emitHiddenInputs = true,
  onMediaChange,
}: {
  entity: MediaEntity;
  folderKey: string;
  initialImages?: string[];
  initialVideos?: string[];
  initialMediaOrder?: string[];
  imagesFieldName?: string;
  videosFieldName?: string;
  mediaOrderFieldName?: string;
  formId?: string;
  emitHiddenInputs?: boolean;
  onMediaChange?: (media: { images: string[]; videos: string[]; mediaOrder: string[] }) => void;
}) {
  const limits = MEDIA_LIMITS[entity];
  const [images, setImages] = useState<UploadedItem[]>(initialImages.map((url) => ({ url })));
  const [videos, setVideos] = useState<UploadedItem[]>(initialVideos.map((url) => ({ url })));
  const [orderedUrls, setOrderedUrls] = useState(() =>
    normalizeMediaOrder(initialImages, initialVideos, initialMediaOrder),
  );
  const [uploading, setUploading] = useState(0);
  // Upload progress as a percentage (0..100). Represents bytes uploaded across
  // all in-flight files in the current batch, weighted by file size.
  const [progress, setProgress] = useState(0);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const imageMap = new Map(images.map((item) => [item.url, item]));
  const videoMap = new Map(videos.map((item) => [item.url, item]));
  const orderedItems = normalizeMediaOrder(
    images.map((item) => item.url),
    videos.map((item) => item.url),
    orderedUrls,
  )
    .map((url) => {
      const image = imageMap.get(url);
      if (image) return { ...image, kind: "images" as const };
      const video = videoMap.get(url);
      if (video) return { ...video, kind: "videos" as const };
      return null;
    })
    .filter((item): item is UploadedItem & { kind: MediaKind } => item !== null);
  const orderedImages = orderedItems.filter((item) => item.kind === "images");
  const orderedVideos = orderedItems.filter((item) => item.kind === "videos");

  useEffect(() => {
    onMediaChange?.({
      images: orderedImages.map((item) => item.url),
      videos: orderedVideos.map((item) => item.url),
      mediaOrder: orderedItems.map((item) => item.url),
    });
  }, [onMediaChange, orderedImages, orderedItems, orderedVideos]);

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

    // iPhones shoot HEIC by default. Convert to JPEG client-side so the file
    // that lands in Storage renders everywhere (HEIC only displays in Safari,
    // and the Next.js image optimizer cannot decode it at all).
    let fileToUpload = file;
    if (kind === "images" && isHeicFile(file)) {
      try {
        fileToUpload = await convertHeicToJpeg(file);
      } catch {
        throw new Error(
          "Could not convert this iPhone photo (HEIC). Please upload a JPG, PNG, or WebP instead.",
        );
      }
    }

    if (!mimeSet.has(fileToUpload.type)) {
      throw new Error(
        kind === "images"
          ? "Only JPG, PNG, WebP, or AVIF images are supported."
          : "Only MP4, WebM, or MOV videos are supported.",
      );
    }

    // Size is checked against the converted file, since HEIC can be larger
    // than its JPEG equivalent while still compressing under the limit.
    const maxBytes = kind === "images" ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;
    if (fileToUpload.size > maxBytes) {
      throw new Error(`File is too large (max ${Math.round(maxBytes / 1024 / 1024)} MB).`);
    }

    const { token, publicUrl, path } = await createMediaUploadAction({
      entity,
      folderKey,
      kind,
      contentType: fileToUpload.type,
      size: fileToUpload.size,
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
    form.append("", fileToUpload); // unnamed part carries the file

    await uploadToSignedUrl(signedUrl, form, (pct) => setProgress(pct));

    const item: UploadedItem = { url: publicUrl, path };
    if (kind === "images") {
      setImages((prev) => [...prev, item]);
    } else {
      setVideos((prev) => [...prev, item]);
    }
    setOrderedUrls((prev) => [...prev.filter((url) => url !== publicUrl), publicUrl]);
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
    if (kind === "images") {
      setImages((prev) => prev.filter((entry) => entry.url !== item.url));
    } else {
      setVideos((prev) => prev.filter((entry) => entry.url !== item.url));
    }
    setOrderedUrls((prev) => prev.filter((url) => url !== item.url));
    if (item.path) {
      deleteMediaAction({ entity, folderKey, paths: [item.path] }).catch(() => {});
    }
  }

  function moveMedia(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= orderedItems.length) return;

    const next = orderedItems.map((item) => item.url);
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    setOrderedUrls(next);
  }

  return (
    <div className="space-y-5">
      <div className="space-y-3 rounded-xl border border-border/70 bg-muted/20 p-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Label>Gallery order</Label>
            <p className="mt-1 text-xs text-muted-foreground">
              The first four cards are shown on the page as 1 large, 2 top, 3 bottom, and 4 tall right. Move cards to choose the hero layout.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <input
              ref={imageInputRef}
              type="file"
              accept={`${[...IMAGE_MIME, "image/heic", "image/heif"].join(",")},.heic,.heif`}
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
              Add photos ({images.length}/{limits.images})
            </Button>

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
              Add videos ({videos.length}/{limits.videos})
            </Button>
          </div>
        </div>

        {orderedItems.length > 0 ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {orderedItems.map((item, index) => (
              <div
                key={item.url}
                className="group relative aspect-[4/3] overflow-hidden rounded-xl border border-border/70 bg-black"
              >
                {item.kind === "images" ? (
                  <Image
                    src={item.url}
                    alt="Uploaded photo"
                    fill
                    className="object-cover"
                    sizes="160px"
                  />
                ) : (
                  <>
                    <video
                      src={item.url}
                      preload="metadata"
                      muted
                      playsInline
                      className="h-full w-full object-cover"
                    />
                    <Play className="pointer-events-none absolute left-1/2 top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 text-white/80" />
                  </>
                )}

                {index < 4 ? (
                  <span className="absolute left-2 top-2 flex h-7 min-w-7 items-center justify-center rounded-full bg-emerald-500 px-2 text-xs font-bold text-white shadow">
                    {index + 1}
                  </span>
                ) : (
                  <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-1 text-[10px] font-semibold uppercase tracking-widest text-white/80">
                    All #{index + 1}
                  </span>
                )}

                <span className="absolute bottom-2 left-2 rounded-full bg-black/60 px-2 py-1 text-[10px] font-semibold uppercase tracking-widest text-white/80">
                  {item.kind === "images" ? "Photo" : "Video"}
                </span>

                <div className="absolute right-1.5 top-1.5 flex gap-1 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
                  <button
                    type="button"
                    onClick={() => moveMedia(index, -1)}
                    disabled={index === 0}
                    aria-label="Move media earlier"
                    className="rounded-full bg-black/60 p-1 text-white transition hover:bg-black/80 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveMedia(index, 1)}
                    disabled={index === orderedItems.length - 1}
                    aria-label="Move media later"
                    className="rounded-full bg-black/60 p-1 text-white transition hover:bg-black/80 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemove(item.kind, item)}
                    aria-label={`Remove ${item.kind === "images" ? "photo" : "video"}`}
                    className="rounded-full bg-black/60 p-1 text-white transition hover:bg-black/80"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">No photos or videos yet.</p>
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

      {emitHiddenInputs && orderedItems.map((item) => (
        <input key={`ord-${item.url}`} type="hidden" name={mediaOrderFieldName} value={item.url} form={formId} />
      ))}
      {emitHiddenInputs && orderedImages.map((item) => (
        <input key={`img-${item.url}`} type="hidden" name={imagesFieldName} value={item.url} form={formId} />
      ))}
      {emitHiddenInputs && orderedVideos.map((item) => (
        <input key={`vid-${item.url}`} type="hidden" name={videosFieldName} value={item.url} form={formId} />
      ))}
    </div>
  );
}

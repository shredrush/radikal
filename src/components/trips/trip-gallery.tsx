"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Images, X } from "lucide-react";
import { pluralize } from "@/lib/format";

interface TripGalleryProps {
  images: string[];
  videos?: string[];
  fallbackImage: string;
  alt: string;
  compact?: boolean;
}

export function TripGallery({ images, videos = [], fallbackImage, alt, compact = false }: TripGalleryProps) {
  const uniqueImages = Array.from(new Set(images.filter(Boolean)));
  const galleryImages = uniqueImages.length > 0 ? uniqueImages : [fallbackImage];
  // The hero grid always shows 4 tiles, cycling through available images.
  const slots = Array.from({ length: 4 }, (_, i) => galleryImages[i % galleryImages.length]);

  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isGridOpen, setIsGridOpen] = useState(false);

  const close = useCallback(() => setSelectedIndex(null), []);
  const openGrid = useCallback(() => setIsGridOpen(true), []);
  const closeGrid = useCallback(() => setIsGridOpen(false), []);
  const openFromGrid = useCallback((index: number) => {
    setIsGridOpen(false);
    setSelectedIndex(index);
  }, []);
  const showPrevious = useCallback(() => {
    setSelectedIndex((current) =>
      current === null ? current : (current - 1 + galleryImages.length) % galleryImages.length,
    );
  }, [galleryImages.length]);
  const showNext = useCallback(() => {
    setSelectedIndex((current) => (current === null ? current : (current + 1) % galleryImages.length));
  }, [galleryImages.length]);

  useEffect(() => {
    if (selectedIndex === null && !isGridOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (selectedIndex !== null) {
          close();
        } else {
          closeGrid();
        }
      }
      if (event.key === "ArrowLeft") showPrevious();
      if (event.key === "ArrowRight") showNext();
    };

    window.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [selectedIndex, isGridOpen, close, closeGrid, showPrevious, showNext]);

  return (
    <>
      <div className="relative">
        <div className={`grid grid-cols-4 grid-rows-2 gap-0.5 ${compact ? "h-full min-h-[320px] sm:min-h-[400px] lg:min-h-[480px]" : "h-[340px] sm:h-[420px]"}`}>
        {[
          { slot: 0, layout: "col-span-2 row-span-2" },
          { slot: 1, layout: "col-span-1 row-span-1" },
          { slot: 3, layout: "col-span-1 row-span-2" },
          { slot: 2, layout: "col-span-1 row-span-1" },
        ].map(({ slot, layout }) => {
          const src = slots[slot];
          const imageIndex = slot % galleryImages.length;

          return (
            <button
              key={slot}
              type="button"
              onClick={() => setSelectedIndex(imageIndex)}
              aria-label={`View photo ${slot + 1}`}
              className={`${layout} group relative overflow-hidden bg-muted/60`}
            >
              <Image
                src={src}
                alt={`${alt} photo ${slot + 1}`}
                fill
                className="object-cover transition-transform duration-300 group-hover:scale-105"
                sizes={slot === 0 ? "50vw" : "25vw"}
              />
              <span className="absolute inset-0 bg-black/0 transition-colors duration-200 group-hover:bg-black/10" />
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={openGrid}
        className="absolute bottom-3 right-3 z-10 flex items-center gap-1.5 rounded-full border border-border/80 bg-background/90 px-3 py-1.5 text-xs font-semibold text-foreground shadow backdrop-blur-sm transition hover:bg-background"
      >
        <Images className="h-3.5 w-3.5" />
        View all photos
      </button>
      </div>

      {isGridOpen && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-black/95 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={`All photos of ${alt}`}
          onClick={closeGrid}
        >
          <div
            className="mx-auto max-w-6xl px-4 py-8 sm:px-8"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <h2 className="font-heading text-xl font-semibold text-white sm:text-2xl">{alt}</h2>
                <p className="mt-1 text-sm text-white/60">{pluralize(galleryImages.length, "photo")}</p>
              </div>
              <button
                type="button"
                onClick={closeGrid}
                aria-label="Close photo grid"
                className="rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4">
              {galleryImages.map((src, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => openFromGrid(index)}
                  aria-label={`View photo ${index + 1}`}
                  className="group relative aspect-[4/3] overflow-hidden rounded-xl bg-white/5"
                >
                  <Image
                    src={src}
                    alt={`${alt} photo ${index + 1}`}
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  />
                  <span className="absolute inset-0 bg-black/0 transition-colors duration-200 group-hover:bg-black/10" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {selectedIndex !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={`${alt} photo viewer`}
          onClick={close}
        >
          <div className="absolute right-4 top-4 flex items-center gap-3">
            <span className="text-sm font-medium text-white/80">
              {selectedIndex + 1} / {galleryImages.length}
            </span>
            <button
              type="button"
              onClick={close}
              aria-label="Close photo viewer"
              className="rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              showPrevious();
            }}
            aria-label="Previous photo"
            className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2.5 text-white transition hover:bg-white/20 sm:left-6"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>

          <div
            className="relative max-h-[85vh] max-w-[90vw]"
            onClick={(event) => event.stopPropagation()}
          >
            <Image
              src={galleryImages[selectedIndex]}
              alt={`${alt} photo ${selectedIndex + 1}`}
              width={1400}
              height={1000}
              className="max-h-[85vh] w-auto max-w-[90vw] rounded-xl object-contain"
            />
          </div>

          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              showNext();
            }}
            aria-label="Next photo"
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2.5 text-white transition hover:bg-white/20 sm:right-6"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </div>
      )}

    {/* Videos never preload data — `preload="none"` means a page with videos
        transfers zero video bytes until the visitor presses play. */}
    {videos.length > 0 ? (
      <div className="mt-4">
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Videos ({videos.length})
        </h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {videos.map((src, index) => (
            <video
              key={src}
              src={src}
              preload="none"
              controls
              playsInline
              muted
              aria-label={`${alt} video ${index + 1}`}
              className="aspect-video w-full rounded-xl bg-black object-cover"
            />
          ))}
        </div>
      </div>
    ) : null}
  </>
  );
}

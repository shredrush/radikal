"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Images, X } from "lucide-react";
import { pluralize } from "@/lib/format";
import { getOrderedMediaItems, type OrderedMediaItem } from "@/lib/media-order";

interface TripGalleryProps {
  images: string[];
  videos?: string[];
  mediaOrder?: string[];
  fallbackImage: string;
  alt: string;
  compact?: boolean;
}

function mediaCountLabel(items: OrderedMediaItem[]) {
  const photos = items.filter((item) => item.type === "image").length;
  const videos = items.length - photos;
  if (photos > 0 && videos > 0) {
    return `${photos} ${pluralize(photos, "photo")} · ${videos} ${pluralize(videos, "video")}`;
  }
  if (videos > 0) {
    return `${videos} ${pluralize(videos, "video")}`;
  }
  return `${photos} ${pluralize(photos, "photo")}`;
}

export function TripGallery({ images, videos = [], mediaOrder = [], fallbackImage, alt, compact = false }: TripGalleryProps) {
  const media = getOrderedMediaItems(images.filter(Boolean), videos.filter(Boolean), mediaOrder);

  const galleryItems = media.length > 0 ? media : [{ src: fallbackImage, type: "image" as const }];
  // The hero grid always shows 4 tiles, cycling through available media.
  const slots = Array.from({ length: 4 }, (_, i) => galleryItems[i % galleryItems.length]);

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
      current === null ? current : (current - 1 + galleryItems.length) % galleryItems.length,
    );
  }, [galleryItems.length]);
  const showNext = useCallback(() => {
    setSelectedIndex((current) => (current === null ? current : (current + 1) % galleryItems.length));
  }, [galleryItems.length]);

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
          const item = slots[slot];
          const imageIndex = slot % galleryItems.length;

          return (
            <button
              key={slot}
              type="button"
              onClick={() => setSelectedIndex(imageIndex)}
              aria-label={`View ${item.type === "video" ? "video" : "photo"} ${slot + 1}`}
              className={`${layout} group relative overflow-hidden bg-muted/60`}
            >
              {item.type === "video" ? (
                <video
                  src={item.src}
                  autoPlay
                  muted
                  loop
                  playsInline
                  preload="auto"
                  aria-label={`${alt} video ${slot + 1}`}
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              ) : (
                <Image
                  src={item.src}
                  alt={`${alt} photo ${slot + 1}`}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                  sizes={slot === 0 ? "50vw" : "25vw"}
                />
              )}
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
        View all
      </button>
      </div>

      {isGridOpen && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-black/95 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={`All photos and videos of ${alt}`}
          onClick={closeGrid}
        >
          <div
            className="mx-auto max-w-6xl px-4 py-8 sm:px-8"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <h2 className="font-heading text-xl font-semibold text-white sm:text-2xl">{alt}</h2>
                <p className="mt-1 text-sm text-white/60">{mediaCountLabel(galleryItems)}</p>
              </div>
              <button
                type="button"
                onClick={closeGrid}
                aria-label="Close media grid"
                className="rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4">
              {galleryItems.map((item, index) => (
                <button
                  key={`${item.type}-${index}`}
                  type="button"
                  onClick={() => openFromGrid(index)}
                  aria-label={`View ${item.type === "video" ? "video" : "photo"} ${index + 1}`}
                  className="group relative aspect-[4/3] overflow-hidden rounded-xl bg-white/5"
                >
                  {item.type === "video" ? (
                    <video
                      src={item.src}
                      autoPlay
                      muted
                      loop
                      playsInline
                      preload="auto"
                      className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <Image
                      src={item.src}
                      alt={`${alt} photo ${index + 1}`}
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    />
                  )}
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
          aria-label={`${alt} media viewer`}
          onClick={close}
        >
          <div className="absolute right-4 top-4 flex items-center gap-3">
            <span className="text-sm font-medium text-white/80">
              {selectedIndex + 1} / {galleryItems.length}
            </span>
            <button
              type="button"
              onClick={close}
              aria-label="Close media viewer"
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
            aria-label="Previous"
            className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2.5 text-white transition hover:bg-white/20 sm:left-6"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>

          <div
            className="relative max-h-[85vh] max-w-[90vw]"
            onClick={(event) => event.stopPropagation()}
          >
            {galleryItems[selectedIndex].type === "video" ? (
              <video
                src={galleryItems[selectedIndex].src}
                autoPlay
                muted
                loop
                playsInline
                controls
                preload="auto"
                className="max-h-[85vh] w-auto max-w-[90vw] rounded-xl object-contain"
              />
            ) : (
              <Image
                src={galleryItems[selectedIndex].src}
                alt={`${alt} photo ${selectedIndex + 1}`}
                width={1400}
                height={1000}
                className="max-h-[85vh] w-auto max-w-[90vw] rounded-xl object-contain"
              />
            )}
          </div>

          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              showNext();
            }}
            aria-label="Next"
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2.5 text-white transition hover:bg-white/20 sm:right-6"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </div>
      )}
    </>
  );
}

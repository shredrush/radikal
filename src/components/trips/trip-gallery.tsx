"use client";

import Image from "next/image";
import { useEffect, useEffectEvent, useRef, useState } from "react";
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
  onMediaClick?: () => void;
}

type GalleryRotation = {
  activeSlot: number;
  visibleMediaIndices: number[];
  previousMediaIndices: number[] | null;
  hiddenMediaIndices: number[];
  flippedSlots: number[];
  cycle: number;
  waitingForVideoSlot: number | null;
  slideDirection: "left" | "top" | "right" | "bottom";
};

const slideDirections = ["left", "top", "right", "bottom"] as const;
const slideDirectionClasses = {
  left: "gallery-media-slide-from-left",
  top: "gallery-media-slide-from-top",
  right: "gallery-media-slide-from-right",
  bottom: "gallery-media-slide-from-bottom",
};

function slideDirectionFromSequence(sequence: number) {
  return slideDirections[sequence % slideDirections.length];
}

function resolveSlot(current: GalleryRotation, requestedSlot: number) {
  return requestedSlot === current.activeSlot
    ? (requestedSlot + 1) % current.visibleMediaIndices.length
    : requestedSlot;
}

function advanceGalleryRotation(current: GalleryRotation, requestedSlot: number, keepRequestedSlot = false): GalleryRotation {
  if (current.hiddenMediaIndices.length === 0) return current;

  const slot = keepRequestedSlot ? requestedSlot : resolveSlot(current, requestedSlot);
  const previousMediaIndices = [...current.visibleMediaIndices];
  const visibleMediaIndices = [...current.visibleMediaIndices];
  const [incomingMediaIndex, ...remainingHiddenMediaIndices] = current.hiddenMediaIndices;
  const outgoingMediaIndex = visibleMediaIndices[slot];

  visibleMediaIndices[slot] = incomingMediaIndex;

  return {
    activeSlot: slot,
    visibleMediaIndices,
    previousMediaIndices,
    hiddenMediaIndices: [...remainingHiddenMediaIndices, outgoingMediaIndex],
    flippedSlots: [slot],
    cycle: current.cycle + 1,
    waitingForVideoSlot: null,
    slideDirection: slideDirectionFromSequence(requestedSlot),
  };
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

export function TripGallery({ images, videos = [], mediaOrder = [], fallbackImage, alt, compact = false, onMediaClick }: TripGalleryProps) {
  const media = getOrderedMediaItems(images.filter(Boolean), videos.filter(Boolean), mediaOrder);

  const galleryItems = media.length > 0 ? media : [{ src: fallbackImage, type: "image" as const }];

  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isGridOpen, setIsGridOpen] = useState(false);
  const [completedTransitionCycle, setCompletedTransitionCycle] = useState(0);
  const videoRefs = useRef<Array<HTMLVideoElement | null>>([]);
  const [rotation, setRotation] = useState<GalleryRotation>(() => ({
    activeSlot: 0,
    visibleMediaIndices: [0, 1, 2, 3],
    previousMediaIndices: null,
    hiddenMediaIndices: Array.from({ length: Math.max(galleryItems.length - 4, 0) }, (_, index) => index + 4),
    flippedSlots: [],
    cycle: 0,
    waitingForVideoSlot: null,
    slideDirection: "left",
  }));
  const shouldRotateMedia = galleryItems.length > 4;
  // Keep the grid stable while cycling hidden media into random tile positions.
  const slots = rotation.visibleMediaIndices.map((index) => galleryItems[index % galleryItems.length]);
  const visibleMediaTypeSignature = slots.map((item) => item.type).join("|");
  const incomingSlot = rotation.flippedSlots[0];
  const incomingMediaType = incomingSlot === undefined ? null : visibleMediaTypeSignature.split("|")[incomingSlot];

  const close = () => setSelectedIndex(null);
  const openGrid = () => setIsGridOpen(true);
  const closeGrid = () => setIsGridOpen(false);
  const openFromGrid = (index: number) => {
    setIsGridOpen(false);
    setSelectedIndex(index);
  };
  const showPrevious = () => {
    setSelectedIndex((current) =>
      current === null ? current : (current - 1 + galleryItems.length) % galleryItems.length,
    );
  };
  const showNext = () => {
    setSelectedIndex((current) => (current === null ? current : (current + 1) % galleryItems.length));
  };

  const handleGalleryKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (event.key === "Escape") {
      if (selectedIndex !== null) {
        close();
      } else {
        closeGrid();
      }
    }
    if (event.key === "ArrowLeft") showPrevious();
    if (event.key === "ArrowRight") showNext();
  });

  useEffect(() => {
    if (selectedIndex === null && !isGridOpen) return;

    window.addEventListener("keydown", handleGalleryKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", handleGalleryKeyDown);
      document.body.style.overflow = "";
    };
  }, [selectedIndex, isGridOpen]);

  useEffect(() => {
    if (
      !shouldRotateMedia ||
      rotation.waitingForVideoSlot !== null ||
      rotation.cycle > completedTransitionCycle
    ) {
      return;
    }

    const timer = window.setTimeout(() => {
      const requestedSlot = Math.floor(Math.random() * 4);
      const slot = resolveSlot(rotation, requestedSlot);

      if (visibleMediaTypeSignature.split("|")[slot] === "video") {
        setRotation((current) => ({
          ...current,
          activeSlot: slot,
          waitingForVideoSlot: slot,
          slideDirection: slideDirectionFromSequence(requestedSlot),
        }));
        return;
      }

      setRotation((current) => advanceGalleryRotation(current, requestedSlot));
    }, 3_000);

    return () => window.clearTimeout(timer);
  }, [completedTransitionCycle, rotation, shouldRotateMedia, visibleMediaTypeSignature]);

  useEffect(() => {
    if (rotation.cycle <= completedTransitionCycle) return;

    // This fallback also completes the transition when reduced motion disables CSS animations.
    const timer = window.setTimeout(() => {
      setCompletedTransitionCycle(rotation.cycle);
      if (incomingMediaType === "video" && incomingSlot !== undefined) {
        setRotation((current) =>
          current.cycle === rotation.cycle
            ? { ...current, activeSlot: incomingSlot, waitingForVideoSlot: incomingSlot }
            : current,
        );
      }
    }, 2_400);
    return () => window.clearTimeout(timer);
  }, [completedTransitionCycle, incomingMediaType, incomingSlot, rotation.cycle]);

  useEffect(() => {
    const slot = rotation.waitingForVideoSlot;
    if (slot === null) return;

    // Some browsers do not resume an existing muted video when autoPlay changes.
    // Explicitly playing it ensures the ended event controls the next rotation.
    void videoRefs.current[slot]?.play().catch(() => undefined);
  }, [rotation.waitingForVideoSlot]);

  return (
    <>
      <div className={`relative ${compact ? "h-full" : ""}`}>
        <div className={`grid grid-cols-4 grid-rows-2 gap-0.5 ${compact ? "h-full min-h-[320px] sm:min-h-[400px] lg:min-h-[480px]" : "h-[340px] sm:h-[420px]"}`}>
        {[
          { slot: 0, layout: "col-span-2 row-span-2" },
          { slot: 1, layout: "col-span-1 row-span-1" },
          { slot: 3, layout: "col-span-1 row-span-2" },
          { slot: 2, layout: "col-span-1 row-span-1" },
        ].map(({ slot, layout }) => {
          const item = slots[slot];
          const imageIndex = rotation.visibleMediaIndices[slot] % galleryItems.length;
          const isActiveTile = slot === rotation.activeSlot;
          const isSliding = rotation.cycle > completedTransitionCycle && rotation.flippedSlots.includes(slot);
          const previousItem = isSliding && rotation.previousMediaIndices
            ? galleryItems[rotation.previousMediaIndices[slot] % galleryItems.length]
            : null;
          const slideClass = `${slideDirectionClasses[rotation.slideDirection]} motion-reduce:animate-none`;

          return (
            <button
              key={`${slot}-${isSliding ? rotation.cycle : 0}`}
              type="button"
              onClick={() => onMediaClick ? onMediaClick() : setSelectedIndex(imageIndex)}
              aria-label={`View ${item.type === "video" ? "video" : "photo"} ${slot + 1}`}
              className={`${layout} group relative overflow-hidden bg-muted/60`}
            >
              {previousItem && (
                <div className={`absolute inset-0 animate-gallery-media-slide-out ${slideClass}`}>
                  {previousItem.type === "video" ? (
                    <video
                      src={previousItem.src}
                      muted
                      playsInline
                      preload="metadata"
                      aria-label={`${alt} previous video ${slot + 1}`}
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  ) : (
                    <Image
                      src={previousItem.src}
                      alt={`${alt} previous photo ${slot + 1}`}
                      fill
                      className="object-cover"
                      sizes={slot === 0 ? "50vw" : "25vw"}
                    />
                  )}
                </div>
              )}
              <div
                className={`absolute inset-0 ${isSliding ? `z-10 animate-gallery-media-slide ${slideClass}` : ""}`}
                onAnimationEnd={(event) => {
                  if (event.target === event.currentTarget && isSliding) {
                    setCompletedTransitionCycle(rotation.cycle);
                    if (item.type === "video") {
                      setRotation((current) =>
                        current.cycle === rotation.cycle
                          ? { ...current, activeSlot: slot, waitingForVideoSlot: slot }
                          : current,
                      );
                    }
                  }
                }}
              >
                {item.type === "video" ? (
                  <video
                    key={`${item.src}-${isActiveTile ? "active" : "inactive"}`}
                    ref={(element) => {
                      videoRefs.current[slot] = element;
                    }}
                    src={item.src}
                    autoPlay={isActiveTile && !isSliding}
                    muted
                    loop={rotation.waitingForVideoSlot !== slot}
                    playsInline
                    preload={isActiveTile || isSliding ? "auto" : "metadata"}
                    onEnded={
                      rotation.waitingForVideoSlot === slot
                        ? () => setRotation((current) => advanceGalleryRotation(current, slot, true))
                        : undefined
                    }
                    onCanPlay={(event) => {
                      if (rotation.waitingForVideoSlot === slot) {
                        void event.currentTarget.play().catch(() => undefined);
                      }
                    }}
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
              </div>
              <span className="absolute inset-0 bg-black/0 transition-colors duration-200 group-hover:bg-black/10" />
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={onMediaClick ?? openGrid}
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
                      muted
                      loop
                      playsInline
                      preload="metadata"
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

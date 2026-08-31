"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

export type CommunityGuideMediaItem = {
  src: string;
  alt: string;
  username: string;
};

const slotLayouts = [
  "col-span-2 row-span-2",
  "col-start-3 row-start-1",
  "col-start-3 row-start-2",
  "col-start-4 row-span-2",
  "col-start-5 row-start-1",
  "col-start-5 row-start-2",
  "col-start-6 col-span-2 row-span-2",
];

const slideDirections = [
  "gallery-media-slide-from-left",
  "gallery-media-slide-from-top",
  "gallery-media-slide-from-right",
  "gallery-media-slide-from-bottom",
] as const;

export function CommunityGuideMedia({ items }: { items: CommunityGuideMediaItem[] }) {
  const visibleCount = Math.min(items.length, slotLayouts.length);
  const [visibleIndices, setVisibleIndices] = useState(() => Array.from({ length: visibleCount }, (_, index) => index));
  const [previousIndices, setPreviousIndices] = useState<number[] | null>(null);
  const [activeSlot, setActiveSlot] = useState<number | null>(null);
  const [cycle, setCycle] = useState(0);

  useEffect(() => {
    if (items.length <= visibleCount || activeSlot !== null) return;

    const timer = window.setTimeout(() => {
      setVisibleIndices((current) => {
        const requestedSlot = Math.floor(Math.random() * current.length);
        const slot = requestedSlot === activeSlot ? (requestedSlot + 1) % current.length : requestedSlot;
        const hiddenIndices = items.map((_, index) => index).filter((index) => !current.includes(index));
        const incomingIndex = hiddenIndices[Math.floor(Math.random() * hiddenIndices.length)];
        const next = [...current];

        setPreviousIndices(current);
        setActiveSlot(slot);
        setCycle((value) => value + 1);
        next[slot] = incomingIndex;
        return next;
      });
    }, 3_000);

    return () => window.clearTimeout(timer);
  }, [activeSlot, items, visibleCount]);

  useEffect(() => {
    if (activeSlot === null) return;

    // Completes the rotation when reduced motion disables the CSS animation.
    const timer = window.setTimeout(() => {
      setActiveSlot(null);
      setPreviousIndices(null);
    }, 2_400);

    return () => window.clearTimeout(timer);
  }, [activeSlot, cycle]);

  if (visibleCount === 0) return null;

  return (
    <section aria-label="Guide moments" className="overflow-hidden rounded-[1.75rem] border border-border/70 bg-muted/30 p-1 shadow-[0_20px_40px_-28px_rgba(15,23,42,0.45)]">
      <div className="grid h-[28rem] grid-cols-7 grid-rows-2 gap-1 sm:h-[36rem] lg:h-[40rem]">
        {visibleIndices.map((itemIndex, slot) => {
          const item = items[itemIndex];
          const isSliding = activeSlot === slot;
          const previousItem = isSliding && previousIndices ? items[previousIndices[slot]] : null;
          const slideClass = slideDirections[slot % slideDirections.length];

          return (
            <Link
              key={`${slot}-${isSliding ? cycle : 0}`}
              href={`/${item.username}`}
              aria-label={`View ${item.alt}'s public profile`}
              className={`${slotLayouts[slot]} group relative overflow-hidden bg-muted/60`}
            >
              {previousItem && (
                <div className={`absolute inset-0 animate-gallery-media-slide-out ${slideClass} motion-reduce:animate-none`}>
                  <Image src={previousItem.src} alt="" fill className="object-cover" sizes="(max-width: 640px) 35vw, 18vw" />
                </div>
              )}
              <div
                className={`absolute inset-0 ${isSliding ? `z-10 animate-gallery-media-slide ${slideClass} motion-reduce:animate-none` : ""}`}
                onAnimationEnd={(event) => {
                  if (event.target === event.currentTarget && isSliding) {
                    setActiveSlot(null);
                    setPreviousIndices(null);
                  }
                }}
              >
                <Image
                  src={item.src}
                  alt={item.alt}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                  sizes="(max-width: 640px) 35vw, 18vw"
                />
              </div>
              <span className="absolute inset-0 z-20 bg-black/0 transition-colors duration-200 group-hover:bg-black/10" />
            </Link>
          );
        })}
      </div>
    </section>
  );
}

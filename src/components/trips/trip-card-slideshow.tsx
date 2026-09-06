"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

import { useAnimationActivity } from "@/hooks/use-animation-activity";

const SLIDE_INTERVAL_MS = 3_000;
const SLIDE_DURATION_MS = 2_400;

const slideDirectionClasses = [
  "gallery-media-slide-from-left",
  "gallery-media-slide-from-top",
  "gallery-media-slide-from-right",
  "gallery-media-slide-from-bottom",
] as const;

type AdvanceFn = () => void;

const slideshowRegistry = new Set<AdvanceFn>();
let slideshowCursor = 0;
let slideshowTimer: ReturnType<typeof setInterval> | null = null;

function stopSlideshowTimer() {
  if (slideshowTimer !== null) {
    clearInterval(slideshowTimer);
    slideshowTimer = null;
  }
}

function ensureSlideshowTimer() {
  if (slideshowTimer !== null) return;

  slideshowTimer = setInterval(() => {
    if (slideshowRegistry.size === 0) {
      stopSlideshowTimer();
      return;
    }

    const advances = Array.from(slideshowRegistry);
    const advance = advances[slideshowCursor % advances.length];
    slideshowCursor = (slideshowCursor + 1) % advances.length;
    advance();
  }, SLIDE_INTERVAL_MS);
}

function registerSlideshow(advance: AdvanceFn) {
  slideshowRegistry.add(advance);
  slideshowCursor = 0;
  ensureSlideshowTimer();

  return () => {
    slideshowRegistry.delete(advance);
    if (slideshowRegistry.size === 0) stopSlideshowTimer();
  };
}

export function TripCardSlideshow({
  slides,
  alt,
  sizes,
}: {
  slides: string[];
  alt: string;
  sizes: string;
}) {
  const [index, setIndex] = useState(0);
  const [outgoing, setOutgoing] = useState<number | null>(null);
  const [cycling, setCycling] = useState(false);
  const [cycle, setCycle] = useState(0);
  const [direction, setDirection] = useState(0);
  const [hovering, setHovering] = useState(false);
  const [rootRef, animationActive] = useAnimationActivity<HTMLDivElement>();

  const slideCount = slides.length;
  const directionClass = slideDirectionClasses[direction % slideDirectionClasses.length];

  const indexRef = useRef(0);
  const hoveringRef = useRef(false);
  const cyclingRef = useRef(false);

  useEffect(() => {
    hoveringRef.current = hovering;
  }, [hovering]);

  useEffect(() => {
    cyclingRef.current = cycling;
  }, [cycling]);

  const advance = useCallback(() => {
    if (slideCount < 2 || hoveringRef.current || cyclingRef.current) return;

    const current = indexRef.current;
    const next = (current + 1) % slideCount;
    setDirection(current + 1);
    setOutgoing(current);
    setIndex(next);
    indexRef.current = next;
    setCycle((value) => value + 1);
    setCycling(true);
  }, [slideCount]);

  useEffect(() => {
    if (!animationActive || slideCount < 2) return;
    return registerSlideshow(advance);
  }, [animationActive, slideCount, advance]);

  useEffect(() => {
    if (!cycling) return;

    const timer = window.setTimeout(() => {
      setCycling(false);
      setOutgoing(null);
    }, SLIDE_DURATION_MS);

    return () => window.clearTimeout(timer);
  }, [cycle, cycling]);

  if (slideCount === 0) return null;

  return (
    <div
      ref={rootRef}
      onPointerEnter={() => setHovering(true)}
      onPointerLeave={() => setHovering(false)}
      className="absolute inset-0 isolate overflow-hidden"
    >
      {cycling && outgoing !== null ? (
        <div
          key={`outgoing-${cycle}`}
          className={`absolute inset-0 ${directionClass} animate-gallery-media-slide-out motion-reduce:animate-none`}
        >
          <Image src={slides[outgoing]} alt="" fill className="object-cover" sizes={sizes} />
        </div>
      ) : null}
      <div
        key={`incoming-${cycle}-${cycling ? "transitioning" : "static"}`}
        onAnimationEnd={(event) => {
          if (event.target === event.currentTarget && cycling) {
            setCycling(false);
            setOutgoing(null);
          }
        }}
        className={`absolute inset-0 ${
          cycling ? `${directionClass} animate-gallery-media-slide motion-reduce:animate-none` : ""
        }`}
      >
        <Image src={slides[index]} alt={alt} fill className="object-cover" sizes={sizes} />
      </div>
    </div>
  );
}

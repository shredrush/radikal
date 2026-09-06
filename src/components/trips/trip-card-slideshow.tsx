"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

import { useAnimationActivity } from "@/hooks/use-animation-activity";

const SLIDE_INTERVAL_MS = 3_000;
const SLIDE_DURATION_MS = 2_400;

const slideDirectionClasses = [
  "gallery-media-slide-from-left",
  "gallery-media-slide-from-top",
  "gallery-media-slide-from-right",
  "gallery-media-slide-from-bottom",
] as const;

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

  useEffect(() => {
    if (!animationActive || cycling || hovering || slideCount < 2) return;

    const timer = window.setTimeout(() => {
      setDirection(index + 1);
      setOutgoing(index);
      setIndex((index + 1) % slideCount);
      setCycle((current) => current + 1);
      setCycling(true);
    }, SLIDE_INTERVAL_MS);

    return () => window.clearTimeout(timer);
  }, [animationActive, cycling, hovering, index, slideCount]);

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

"use client";

import Image from "next/image";

// Pairs of sport cover photos. Each tile flips between its front and back face.
const TILES = [
  { front: "/activities/sethan-snowboarding-course/cover.jpg", back: "/activities/gulmarg-snowboard-weekend/cover.jpg" },
  { front: "/activities/lahaul-spiti-cycle/cover.jpg", back: "/activities/mountain-bike-trails/cover.jpg" },
  { front: "/activities/ghepan-lake-trek/cover.jpg", back: "/activities/pin-parvati-pass-trek/cover.jpg" },
  { front: "/activities/yunam-peak/cover.jpg", back: "/activities/nun-kun/cover.jpg" },
  { front: "/activities/bouldering-introduction-course/cover.jpg", back: "/activities/chhatru-bouldering/cover.jpg" },
  { front: "/activities/ladakh-yoga-course/cover.jpg", back: "/activities/spiti-meditation-escape/cover.jpg" },
  { front: "/activities/deo-tibba/cover.jpg", back: "/activities/kanamo-peak/cover.jpg" },
  { front: "/activities/miyar-valley-trek/cover.jpg", back: "/activities/lahaul-multi-day-hike/cover.jpg" },
  { front: "/activities/mountain-bike-introduction-course/cover.jpg", back: "/activities/pangong-bike-expedition/cover.jpg" },
  { front: "/activities/backcountry-snowboarding-expedition/cover.jpg", back: "/activities/sethan-snowboarding-course/cover.jpg" },
  { front: "/activities/lahaul-multi-day-hike/cover.jpg", back: "/activities/ghepan-lake-trek/cover.jpg" },
  { front: "/activities/nun-kun/cover.jpg", back: "/activities/deo-tibba/cover.jpg" },
];

function Face({ src, flipped = false }: { src: string; flipped?: boolean }) {
  return (
    <div
      className={`absolute inset-0 [backface-visibility:hidden] ${
        flipped ? "[transform:rotateY(180deg)]" : ""
      }`}
    >
      <Image src={src} alt="" fill className="object-cover" sizes="33vw" />
    </div>
  );
}

export function AuthBackground() {
  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden bg-black">
      <div className="grid h-full w-full grid-cols-3 grid-rows-4 sm:grid-cols-4 sm:grid-rows-3">
        {TILES.map((tile, index) => (
          <div key={index} className="relative h-full w-full [perspective:1200px]">
            <div
              className="relative h-full w-full [transform-style:preserve-3d]"
              style={{
                animation: "auth-tile-flip 45s ease-in-out infinite",
                animationDelay: `${index * -3.75}s`,
              }}
            >
              <Face src={tile.front} />
              <Face src={tile.back} flipped />
            </div>
          </div>
        ))}
      </div>
      <div className="absolute inset-0 bg-black/60" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_0%,_rgba(0,0,0,0.6)_100%)]" />
    </div>
  );
}

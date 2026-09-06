import Image from "next/image";

// Decorative tiles intentionally use one image each. Rendering their hidden
// back faces doubled image decoding and continuous compositor work on auth.
const TILES = [
  "/activities/sethan-snowboarding-course/cover.jpg",
  "/activities/lahaul-spiti-cycle/cover.jpg",
  "/activities/ghepan-lake-trek/cover.jpg",
  "/activities/yunam-peak/cover.jpg",
  "/activities/bouldering-introduction-course/cover.jpg",
  "/activities/ladakh-yoga-course/cover.jpg",
  "/activities/deo-tibba/cover.jpg",
  "/activities/miyar-valley-trek/cover.jpg",
  "/activities/mountain-bike-introduction-course/cover.jpg",
  "/activities/backcountry-snowboarding-expedition/cover.jpg",
  "/activities/lahaul-multi-day-hike/cover.jpg",
  "/activities/nun-kun/cover.jpg",
];

export function AuthBackground() {
  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden bg-black">
      <div className="grid h-full w-full grid-cols-3 grid-rows-4 sm:grid-cols-4 sm:grid-rows-3">
        {TILES.map((src) => (
          <div key={src} className="relative h-full w-full">
            <Image src={src} alt="" fill className="object-cover" sizes="(max-width: 640px) 34vw, 25vw" />
          </div>
        ))}
      </div>
      <div className="absolute inset-0 bg-black/60" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_0%,_rgba(0,0,0,0.6)_100%)]" />
    </div>
  );
}

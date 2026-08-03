import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="w-full border-t border-border/60 bg-[#1d4ed8] px-4 py-6 text-white sm:px-6 sm:py-8 lg:px-8 lg:py-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl flex-1">
          <p className="text-[clamp(0.68rem,0.8vw,0.8rem)] font-semibold uppercase tracking-[0.3em] text-white/80">
            Radikal
          </p>
          <h4 className="mt-1 max-w-[560px] whitespace-normal font-heading text-[clamp(0.95rem,3.8vw,2.1rem)] font-semibold leading-tight tracking-wide text-white">
            Crafted in the Himalayas for unforgettable experiences
          </h4>
          <p className="mt-2 text-[clamp(0.8rem,1vw,1rem)] leading-6 text-white/80">
            Discover curated, small-group adventures with certified local guides, flexible custom itineraries, and meaningful sustainable travel designed around the Indian Himalayas.
          </p>
        </div>

        <div className="flex w-full max-w-[320px] flex-shrink-0 justify-start lg:ml-10 lg:justify-end">
          <div className="w-full max-w-full space-y-2 text-left lg:max-w-[180px] lg:text-right">
            <p className="text-[clamp(0.7rem,0.8vw,0.8rem)] font-semibold uppercase tracking-[0.2em] text-white/80">Explore</p>
            <div className="flex flex-col gap-1.5 text-[clamp(0.8rem,0.95vw,0.95rem)] text-white/80">
              <Link href="/" className="transition hover:text-white">
                Home
              </Link>
              <Link href="/trips?sport=trek" className="transition hover:text-white">
                Adventure Sports
              </Link>
              <Link href="/trips?sport=yoga" className="transition hover:text-white">
                Wellness Retreats
              </Link>
              <Link href="/community" className="transition hover:text-white">
                Community
              </Link>
              <Link href="/signup" className="transition hover:text-white">
                Create account
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 flex justify-center border-t border-white/20 pt-4 text-[clamp(0.7rem,0.85vw,0.85rem)] text-white/80">
        <p>© 2026 Radikal</p>
      </div>
    </footer>
  );
}

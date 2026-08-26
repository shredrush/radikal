import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="w-full border-t border-border/60 bg-background px-4 py-8 text-foreground sm:px-6 sm:py-10 lg:px-10 lg:py-14">
      <div className="mx-auto flex max-w-8xl flex-col gap-8 lg:flex-row lg:items-start lg:justify-between lg:gap-12">
        <div className="max-w-2xl flex-1">
          <p className="text-[clamp(0.72rem,0.85vw,0.86rem)] font-semibold uppercase tracking-[0.32em] text-orange-600/80">
            Radikal
          </p>
          <h4 className="mt-2 max-w-[560px] whitespace-normal font-heading text-[clamp(1.1rem,4.4vw,2.3rem)] font-semibold leading-[1.1] tracking-wide text-foreground">
            Crafted in the Himalayas for unforgettable experiences
          </h4>
          <p className="mt-3 max-w-[640px] text-[clamp(0.9rem,1.08vw,1.08rem)] leading-7 text-muted-foreground">
            Discover curated, small-group adventures with certified trsuted guides, flexible custom itineraries, and meaningful sustainable travel design.
          </p>
        </div>

        <div className="flex w-full max-w-[360px] flex-shrink-0 justify-start lg:ml-10 lg:justify-end">
          <div className="w-full max-w-full space-y-3 text-left lg:max-w-[200px] lg:text-right">
            <p className="text-[clamp(0.75rem,0.85vw,0.88rem)] font-semibold uppercase tracking-[0.25em] text-emerald-600/80">Explore</p>
            <div className="flex flex-col gap-2 text-[clamp(0.9rem,1vw,1.05rem)] text-muted-foreground">
              <Link href="/" className="transition hover:text-orange-600">
                Home
              </Link>
              <Link href="/trips?sport=trek" className="transition hover:text-orange-600">
                Adventure Sports
              </Link>
              <Link href="/trips?sport=yoga" className="transition hover:text-orange-600">
                Wellness Retreats
              </Link>
              <Link href="/community" className="transition hover:text-orange-600">
                Community
              </Link>
              <Link href="/become-a-guide" className="transition hover:text-orange-600">
                Become a Guide
              </Link>
              <Link href="/signup" className="transition hover:text-orange-600">
                Create account
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 flex justify-center border-t border-border/60 pt-5 text-[clamp(0.75rem,0.9vw,0.9rem)] text-muted-foreground">
        <p>© 2026 Radikal</p>
      </div>
    </footer>
  );
}

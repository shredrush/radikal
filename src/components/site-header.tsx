import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { SiteLogoLink } from "@/components/site-logo-link";
import { SportIcon } from "@/components/trips/sport-icon";
import { HeaderAccount } from "@/components/header-account";

type RetreatItem = {
  label: string;
  href?: string;
  sport: string;
  comingSoon?: boolean;
};

export function SiteHeader() {

  const sportGroups = [
    {
      heading: "Climbing",
      items: [
        { label: "Hiking and Trekking", href: "/trips?sport=trek", sport: "trek" },
        { label: "Rock Climbing", href: "/trips?sport=rockclimb", sport: "rockclimb" },
        { label: "Summit Expedition", href: "/trips?sport=expedition", sport: "expedition" },
      ],
    },
    {
      heading: "Cycling",
      items: [
        { label: "Cross Country Cycling", href: "/trips?sport=bike", sport: "bike" },
        { label: "Downhill MTB", href: "/trips?sport=bike", sport: "bike" },
      ],
    },
    {
      heading: "Winter Sports",
      items: [
        { label: "Snowboarding", href: "/trips?sport=winter", sport: "snowboard" },
        { label: "Skiing", href: "/trips?sport=winter", sport: "ski" },
      ],
    },
  ];

  const wellnessGroups: { heading: string; items: RetreatItem[] }[] = [
    {
      heading: "Wellness",
      items: [{ label: "Yoga and Meditation", sport: "yoga", comingSoon: true }],
    },
    {
      heading: "Astro",
      items: [{ label: "Stargazing", sport: "stargazing", comingSoon: true }],
    },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/80 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/90 shadow-[0_8px_25px_-20px_rgba(0,0,0,0.35)]">
      <div className="mx-auto w-full max-w-8xl px-4 py-2 sm:px-6 sm:py-2.5 md:px-6 md:py-4 lg:px-10">
        <div className="flex items-center justify-between md:hidden">
          <SiteLogoLink className="flex items-center gap-2 rounded-full py-0.5 sm:gap-3 sm:py-1">
            <Image
              src="/logo.svg"
              alt="Radikal logo"
              width={112}
              height={112}
              className="-my-3 h-20 w-20 flex-none rounded-xl object-contain dark:invert sm:-my-4 sm:h-24 sm:w-24"
            />
            <p className="font-heading text-xl font-semibold uppercase tracking-[0.24em] text-foreground sm:text-2xl sm:tracking-[0.3em]">
              Radikal
            </p>
          </SiteLogoLink>

          <div className="flex min-w-0 flex-wrap items-center justify-end gap-1.5 sm:gap-2 md:hidden">
            <HeaderAccount variant="mobile" />
          </div>
        </div>

        <div className="mt-1.5 md:hidden">
          <nav className="flex flex-col gap-1.5 sm:gap-2">
            <div className="grid grid-cols-2 gap-1 sm:gap-1.5">
              <div className="group relative">
                <Button
                  variant="ghost"
                  size="xs"
                  className="h-8 w-full rounded-full px-2 text-[10px] text-foreground/80 hover:bg-primary/10 hover:text-primary"
                  nativeButton={false}
                  render={<Link href="/trips" />}
                >
                  Adventure Sports
                </Button>
                <div className="invisible absolute left-0 top-full z-50 mt-2 w-[min(92vw,640px)] rounded-[1.25rem] border border-border/70 bg-background/95 p-4 opacity-0 shadow-[0_20px_50px_-25px_rgba(0,0,0,0.35)] transition-all duration-200 group-hover:visible group-hover:opacity-100">
                  <div className="grid gap-4">
                    {sportGroups.map((group) => (
                      <div key={group.heading} className="space-y-2">
                        <p className="text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-muted-foreground">{group.heading}</p>
                        <div className="flex flex-col gap-1.5">
                          {group.items.map((item) => (
                            <Link key={item.label} href={item.href} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-foreground transition hover:bg-primary/10 hover:text-primary">
                              <SportIcon sport={item.sport} className="size-8" />
                              {item.label}
                            </Link>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="group relative">
                <Button
                  variant="ghost"
                  size="xs"
                  className="h-8 w-full rounded-full px-2 text-[10px] text-foreground/80 hover:bg-primary/10 hover:text-primary"
                  nativeButton={false}
                  render={<Link href="/trips?sport=yoga" />}
                >
                  Retreats
                </Button>
                <div className="invisible absolute left-1/2 top-full z-50 mt-2 w-[min(92vw,440px)] -translate-x-1/2 rounded-[1.25rem] border border-border/70 bg-background/95 p-4 opacity-0 shadow-[0_20px_50px_-25px_rgba(0,0,0,0.35)] transition-all duration-200 group-hover:visible group-hover:opacity-100">
                  <div className="grid grid-cols-2 gap-4">
                    {wellnessGroups.map((group) => (
                      <div key={group.heading} className="space-y-2">
                        <p className="text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-muted-foreground">{group.heading}</p>
                        <div className="flex flex-col gap-1.5">
                          {group.items.map((item) =>
                            item.comingSoon ? (
                              <div key={item.label} aria-disabled="true" className="flex cursor-not-allowed items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-muted-foreground/60">
                                <SportIcon sport={item.sport} className="size-8 opacity-60" />
                                <span className="flex flex-col">
                                  <span>{item.label}</span>
                                  <span className="text-xs text-amber-600 dark:text-amber-400">Coming soon</span>
                                </span>
                              </div>
                            ) : (
                              <Link key={item.label} href={item.href!} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-foreground transition hover:bg-primary/10 hover:text-primary">
                                <SportIcon sport={item.sport} className="size-8" />
                                {item.label}
                              </Link>
                            ),
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-1 sm:gap-1.5">
              <Button
                variant="ghost"
                size="xs"
                className="h-8 w-full rounded-full px-2 text-[10px] text-foreground/80 hover:bg-primary/10 hover:text-primary"
                nativeButton={false}
                render={<Link href="/custom-trip" />}
              >
                Custom Trips
              </Button>
              <Button
                variant="ghost"
                size="xs"
                className="h-8 w-full rounded-full px-2 text-[10px] text-foreground/80 hover:bg-primary/10 hover:text-primary"
                nativeButton={false}
                render={<Link href="/community" />}
              >
                Community
              </Button>
            </div>
          </nav>
        </div>

        <div className="hidden md:flex md:flex-col md:gap-2 xl:hidden">
          <div className="flex items-center justify-between gap-3">
            <SiteLogoLink className="flex items-center gap-2 rounded-full py-0.5 lg:gap-3 lg:py-1">
              <Image
                src="/logo.svg"
                alt="Radikal logo"
                width={112}
                height={112}
                className="-my-3 h-24 w-24 flex-none rounded-xl object-contain dark:invert lg:-my-4 lg:h-28 lg:w-28"
              />
              <p className="font-heading text-2xl font-semibold uppercase tracking-[0.24em] text-foreground lg:text-3xl lg:tracking-[0.3em]">
                Radikal
              </p>
            </SiteLogoLink>

            <div className="flex min-w-0 flex-wrap items-center justify-end gap-1.5 lg:gap-2">
              <HeaderAccount variant="desktop" />
            </div>
          </div>

          <nav className="flex items-center justify-center gap-2 lg:gap-3">
            <div className="group relative">
              <Button
                variant="ghost"
                size="sm"
                className="rounded-full text-foreground/80 hover:bg-primary/10 hover:text-primary"
                nativeButton={false}
                render={<Link href="/trips" />}
              >
                Adventure Sports
              </Button>
              <div className="invisible absolute left-0 top-full z-50 mt-3 w-[min(92vw,640px)] rounded-[1.25rem] border border-border/70 bg-background/95 p-4 opacity-0 shadow-[0_20px_50px_-25px_rgba(0,0,0,0.35)] transition-all duration-200 group-hover:visible group-hover:opacity-100">
                <div className="grid gap-4 md:grid-cols-3">
                  {sportGroups.map((group) => (
                    <div key={group.heading} className="space-y-2">
                      <p className="text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-muted-foreground">{group.heading}</p>
                      <div className="flex flex-col gap-1.5">
                        {group.items.map((item) => (
                          <Link key={item.label} href={item.href} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-foreground transition hover:bg-primary/10 hover:text-primary">
                            <SportIcon sport={item.sport} className="size-8" />
                            {item.label}
                          </Link>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="group relative">
              <Button
                variant="ghost"
                size="sm"
                className="rounded-full text-foreground/80 hover:bg-primary/10 hover:text-primary"
                nativeButton={false}
                render={<Link href="/trips?sport=yoga" />}
              >
                Retreats
              </Button>
              <div className="invisible absolute left-1/2 top-full z-50 mt-3 w-[min(92vw,440px)] -translate-x-1/2 rounded-[1.25rem] border border-border/70 bg-background/95 p-4 opacity-0 shadow-[0_20px_50px_-25px_rgba(0,0,0,0.35)] transition-all duration-200 group-hover:visible group-hover:opacity-100">
                <div className="grid grid-cols-2 gap-4">
                  {wellnessGroups.map((group) => (
                    <div key={group.heading} className="space-y-2">
                      <p className="text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-muted-foreground">{group.heading}</p>
                      <div className="flex flex-col gap-1.5">
                        {group.items.map((item) =>
                          item.comingSoon ? (
                            <div key={item.label} aria-disabled="true" className="flex cursor-not-allowed items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-muted-foreground/60">
                              <SportIcon sport={item.sport} className="size-8 opacity-60" />
                              <span className="flex flex-col">
                                <span>{item.label}</span>
                                <span className="text-xs text-amber-600 dark:text-amber-400">Coming soon</span>
                              </span>
                            </div>
                          ) : (
                            <Link key={item.label} href={item.href!} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-foreground transition hover:bg-primary/10 hover:text-primary">
                              <SportIcon sport={item.sport} className="size-8" />
                              {item.label}
                            </Link>
                          ),
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="rounded-full text-foreground/80 hover:bg-primary/10 hover:text-primary"
              nativeButton={false}
              render={<Link href="/custom-trip" />}
            >
              Custom Trips
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="rounded-full text-foreground/80 hover:bg-primary/10 hover:text-primary"
              nativeButton={false}
              render={<Link href="/community" />}
            >
              Community
            </Button>
          </nav>
        </div>

        <div className="hidden grid-cols-[auto_1fr_auto] items-center gap-3 xl:grid">
          <SiteLogoLink className="flex items-center gap-2 rounded-full py-0.5 lg:gap-3 lg:py-1">
            <Image
              src="/logo.svg"
              alt="Radikal logo"
              width={112}
              height={112}
              className="-my-3 h-24 w-24 flex-none rounded-xl object-contain dark:invert lg:-my-4 lg:h-28 lg:w-28"
            />
            <p className="font-heading text-2xl font-semibold uppercase tracking-[0.24em] text-foreground lg:text-3xl lg:tracking-[0.3em]">
              Radikal
            </p>
          </SiteLogoLink>

          <nav className="mx-auto flex flex-nowrap items-center justify-center gap-1.5 lg:gap-2">
            <div className="group relative">
              <Button
                variant="ghost"
                size="sm"
                className="rounded-full text-foreground/80 hover:bg-primary/10 hover:text-primary"
                nativeButton={false}
                render={<Link href="/trips" />}
              >
                Adventure Sports
              </Button>
              <div className="invisible absolute left-0 top-full z-50 mt-3 w-[min(92vw,640px)] rounded-[1.25rem] border border-border/70 bg-background/95 p-4 opacity-0 shadow-[0_20px_50px_-25px_rgba(0,0,0,0.35)] transition-all duration-200 group-hover:visible group-hover:opacity-100">
                <div className="grid gap-4 md:grid-cols-3">
                  {sportGroups.map((group) => (
                    <div key={group.heading} className="space-y-2">
                      <p className="text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-muted-foreground">{group.heading}</p>
                      <div className="flex flex-col gap-1.5">
                        {group.items.map((item) => (
                          <Link key={item.label} href={item.href} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-foreground transition hover:bg-primary/10 hover:text-primary">
                            <SportIcon sport={item.sport} className="size-8" />
                            {item.label}
                          </Link>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="group relative">
              <Button
                variant="ghost"
                size="sm"
                className="rounded-full text-foreground/80 hover:bg-primary/10 hover:text-primary"
                nativeButton={false}
                render={<Link href="/trips?sport=yoga" />}
              >
                Retreats
              </Button>
              <div className="invisible absolute left-1/2 top-full z-50 mt-3 w-[min(92vw,440px)] -translate-x-1/2 rounded-[1.25rem] border border-border/70 bg-background/95 p-4 opacity-0 shadow-[0_20px_50px_-25px_rgba(0,0,0,0.35)] transition-all duration-200 group-hover:visible group-hover:opacity-100">
                <div className="grid grid-cols-2 gap-4">
                  {wellnessGroups.map((group) => (
                    <div key={group.heading} className="space-y-2">
                      <p className="text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-muted-foreground">{group.heading}</p>
                      <div className="flex flex-col gap-1.5">
                        {group.items.map((item) =>
                          item.comingSoon ? (
                            <div key={item.label} aria-disabled="true" className="flex cursor-not-allowed items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-muted-foreground/60">
                              <SportIcon sport={item.sport} className="size-8 opacity-60" />
                              <span className="flex flex-col">
                                <span>{item.label}</span>
                                <span className="text-xs text-amber-600 dark:text-amber-400">Coming soon</span>
                              </span>
                            </div>
                          ) : (
                            <Link key={item.label} href={item.href!} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-foreground transition hover:bg-primary/10 hover:text-primary">
                              <SportIcon sport={item.sport} className="size-8" />
                              {item.label}
                            </Link>
                          ),
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="rounded-full text-foreground/80 hover:bg-primary/10 hover:text-primary"
              nativeButton={false}
              render={<Link href="/custom-trip" />}
            >
              Custom Trips
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="rounded-full text-foreground/80 hover:bg-primary/10 hover:text-primary"
              nativeButton={false}
              render={<Link href="/community" />}
            >
              Community
            </Button>
          </nav>

          <div className="flex min-w-0 flex-wrap items-center justify-end gap-1.5 lg:gap-2">
            <HeaderAccount variant="desktop" />
          </div>
        </div>
      </div>
    </header>
  );
}

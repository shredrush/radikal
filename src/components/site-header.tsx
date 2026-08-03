import Link from "next/link";

import { auth } from "@/lib/auth";
import { logoutAction } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";

export async function SiteHeader() {
  const session = await auth();
  const displayName = session?.user?.name ?? session?.user?.email ?? "User";
  const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=1d4ed8&color=fff&size=128&rounded=true`;

  const sportGroups = [
    {
      heading: "Climbing",
      items: [
        { label: "Hiking and Trekking", href: "/trips?sport=trek" },
        { label: "Rock Climbing", href: "/trips?sport=rock-climbing" },
        { label: "Expedition", href: "/trips?sport=expedition" },
      ],
    },
    {
      heading: "Cycling",
      items: [
        { label: "Cross Country Cycling", href: "/trips?sport=bike" },
        { label: "Downhill MTB", href: "/trips?sport=bike" },
      ],
    },
    {
      heading: "Winter Sports",
      items: [
        { label: "Snowboarding", href: "/trips?sport=snowboard" },
        { label: "Skiing", href: "/trips?sport=ski" },
      ],
    },
  ];

  const wellnessGroups = [
    {
      heading: "Wellness",
      items: [{ label: "Yoga and Meditation", href: "/trips?sport=yoga" }],
    },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/80 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/90 shadow-[0_8px_25px_-20px_rgba(0,0,0,0.35)]">
      <div className="mx-auto w-full max-w-7xl px-3 py-2 sm:px-4 sm:py-2.5 md:px-6 md:py-4 lg:px-8">
        <div className="flex items-center justify-between md:hidden">
          <Link href="/" className="flex items-center gap-2 rounded-full px-1 py-0.5 sm:gap-3 sm:px-2 sm:py-1">
            <img
              src="/radikal-logo.svg"
              alt="Radikal logo"
              className="h-8 w-8 rounded-full object-cover shadow-sm sm:h-10 sm:w-10 md:h-12 md:w-12"
            />
            <p className="font-heading text-base font-semibold uppercase tracking-[0.24em] text-foreground sm:text-lg md:text-xl md:tracking-[0.3em]">
              Radikal
            </p>
          </Link>

          <div className="md:hidden">
            {session?.user ? (
              <Link href="/dashboard" className="flex items-center rounded-full ring-1 ring-border/70 transition hover:ring-[#1d4ed8]">
                <img src={avatarUrl} alt="Profile" className="h-8 w-8 rounded-full object-cover" />
              </Link>
            ) : (
              <Button
                size="sm"
                className="min-w-[84px] rounded-full px-3 py-1.5 text-xs font-semibold"
                nativeButton={false}
                render={<Link href="/login" />}
              >
                Login
              </Button>
            )}
          </div>
        </div>

        <div className="mt-1.5 flex flex-col gap-1.5 md:hidden">
          <div className="grid grid-cols-2 gap-1.5">
            <Button
              variant="ghost"
              size="xs"
              className="h-8 rounded-full px-2 text-[10px] text-foreground/80 hover:bg-[#1d4ed8]/5 hover:text-[#1d4ed8]"
              nativeButton={false}
              render={<Link href="/trips" />}
            >
              Adventure Sports
            </Button>
            <Button
              variant="ghost"
              size="xs"
              className="h-8 rounded-full px-2 text-[10px] text-foreground/80 hover:bg-[#1d4ed8]/5 hover:text-[#1d4ed8]"
              nativeButton={false}
              render={<Link href="/trips?sport=yoga" />}
            >
              Wellness Retreats
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <Button
              variant="ghost"
              size="xs"
              className="h-8 rounded-full px-2 text-[10px] text-foreground/80 hover:bg-[#1d4ed8]/5 hover:text-[#1d4ed8]"
              nativeButton={false}
              render={<Link href="/community" />}
            >
              Community
            </Button>
            <Button
              variant="ghost"
              size="xs"
              className="h-8 rounded-full px-2 text-[10px] font-medium text-foreground/80 hover:bg-[#1d4ed8]/5 hover:text-[#1d4ed8]"
              nativeButton={false}
              render={<Link href="/login" />}
            >
              Become a Guide
            </Button>
          </div>
        </div>

        <div className="hidden items-center justify-between gap-3 md:flex">
          <Link href="/" className="flex items-center gap-2 rounded-full px-1 py-0.5 lg:gap-3 lg:px-2 lg:py-1">
            <img
              src="/radikal-logo.svg"
              alt="Radikal logo"
              className="h-9 w-9 rounded-full object-cover shadow-sm lg:h-10 lg:w-10"
            />
            <p className="font-heading text-lg font-semibold uppercase tracking-[0.24em] text-foreground lg:tracking-[0.3em]">
              Radikal
            </p>
          </Link>

          <nav className="flex flex-nowrap items-center justify-center gap-1.5 lg:gap-2">
            <div className="group relative">
              <Button
                variant="ghost"
                size="sm"
                className="rounded-full text-foreground/80 hover:bg-[#1d4ed8]/5 hover:text-[#1d4ed8]"
                nativeButton={false}
                render={<Link href="/trips" />}
              >
                Adventure Sports
              </Button>
              <div className="invisible absolute left-1/2 top-full z-50 mt-3 w-[min(92vw,640px)] -translate-x-1/2 rounded-[1.25rem] border border-border/70 bg-background/95 p-4 opacity-0 shadow-[0_20px_50px_-25px_rgba(0,0,0,0.35)] transition-all duration-200 group-hover:visible group-hover:opacity-100">
                <div className="grid gap-4 md:grid-cols-3">
                  {sportGroups.map((group) => (
                    <div key={group.heading} className="space-y-2">
                      <p className="text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-muted-foreground">{group.heading}</p>
                      <div className="flex flex-col gap-1.5">
                        {group.items.map((item) => (
                          <Link key={item.label} href={item.href} className="rounded-lg px-2 py-1.5 text-sm text-foreground transition hover:bg-[#1d4ed8]/8 hover:text-[#1d4ed8]">
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
                className="rounded-full text-foreground/80 hover:bg-[#1d4ed8]/5 hover:text-[#1d4ed8]"
                nativeButton={false}
                render={<Link href="/trips?sport=yoga" />}
              >
                Wellness Retreats
              </Button>
              <div className="invisible absolute left-1/2 top-full z-50 mt-3 w-[min(92vw,260px)] -translate-x-1/2 rounded-[1.25rem] border border-border/70 bg-background/95 p-4 opacity-0 shadow-[0_20px_50px_-25px_rgba(0,0,0,0.35)] transition-all duration-200 group-hover:visible group-hover:opacity-100">
                <div className="space-y-2">
                  {wellnessGroups.map((group) => (
                    <div key={group.heading} className="space-y-2">
                      <p className="text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-muted-foreground">{group.heading}</p>
                      <div className="flex flex-col gap-1.5">
                        {group.items.map((item) => (
                          <Link key={item.label} href={item.href} className="rounded-lg px-2 py-1.5 text-sm text-foreground transition hover:bg-[#1d4ed8]/8 hover:text-[#1d4ed8]">
                            {item.label}
                          </Link>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="rounded-full text-foreground/80 hover:bg-[#1d4ed8]/5 hover:text-[#1d4ed8]"
              nativeButton={false}
              render={<Link href="/community" />}
            >
              Community
            </Button>
          </nav>

          <div className="ml-auto flex shrink-0 items-center gap-1.5 lg:gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="rounded-full px-4 py-2.5 text-sm font-medium text-foreground/80 hover:bg-[#1d4ed8]/5 hover:text-[#1d4ed8] sm:px-5"
              nativeButton={false}
              render={<Link href="/login" />}
            >
              Become a Guide
            </Button>
            {session?.user ? (
              <div className="group relative">
                <Link href="/dashboard" className="flex items-center rounded-full ring-1 ring-border/70 transition hover:ring-[#1d4ed8]">
                  <img src={avatarUrl} alt="Profile" className="h-10 w-10 rounded-full object-cover" />
                </Link>
                <div className="invisible absolute right-0 top-full z-10 mt-2 flex min-w-[150px] flex-col rounded-xl border border-border/70 bg-background/95 p-1 opacity-0 shadow-[0_12px_30px_-16px_rgba(0,0,0,0.35)] transition-all duration-200 group-hover:visible group-hover:opacity-100">
                  <Link href="/dashboard" className="rounded-lg px-3 py-2 text-sm font-medium text-foreground transition hover:bg-[#1d4ed8]/8 hover:text-[#1d4ed8]">
                    Profile
                  </Link>
                  <form action={logoutAction}>
                    <button type="submit" className="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm font-medium text-foreground transition hover:bg-[#1d4ed8]/8 hover:text-[#1d4ed8]">
                      Logout
                    </button>
                  </form>
                </div>
              </div>
            ) : (
              <Button
                size="sm"
                className="min-w-[96px] rounded-full px-4 py-2.5 text-sm font-semibold sm:min-w-[112px]"
                nativeButton={false}
                render={<Link href="/login" />}
              >
                Login
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

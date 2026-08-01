import Link from "next/link";

import { auth } from "@/lib/auth";
import { logoutAction } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";

export async function SiteHeader() {
  const session = await auth();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/80 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/90 shadow-[0_8px_25px_-20px_rgba(0,0,0,0.35)]">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-4">
        <Link href="/" className="flex items-center gap-3">
          <img
            src="/radikal-logo.svg"
            alt="Radikal logo"
            className="h-9 w-9 rounded-full object-cover shadow-sm"
          />
          <p className="font-heading text-base font-semibold uppercase tracking-[0.3em] text-foreground">
            Radikal
          </p>
        </Link>
        <nav className="order-3 flex w-full flex-wrap items-center justify-center gap-2 md:order-none md:mx-auto md:w-auto">
          <Button
            variant="ghost"
            size="sm"
            className="rounded-full text-foreground/80 hover:bg-[#1d4ed8]/5 hover:text-[#1d4ed8]"
            nativeButton={false}
            render={<Link href="/trips" />}
          >
            Experiences
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="rounded-full text-foreground/80 hover:bg-[#1d4ed8]/5 hover:text-[#1d4ed8]"
            nativeButton={false}
            render={<Link href="/trips" />}
          >
            Private Trips
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="rounded-full text-foreground/80 hover:bg-[#1d4ed8]/5 hover:text-[#1d4ed8]"
            nativeButton={false}
            render={<Link href="/trips" />}
          >
            Community
          </Button>
        </nav>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="rounded-full text-foreground/80 hover:bg-[#1d4ed8]/5 hover:text-[#1d4ed8]"
            nativeButton={false}
            render={<Link href="/login" />}
          >
            Become a Guide
          </Button>
          {session?.user ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="rounded-full"
                nativeButton={false}
                render={<Link href="/dashboard" />}
              >
                Dashboard
              </Button>
              <form action={logoutAction}>
                <Button variant="outline" size="sm" className="rounded-full" type="submit">
                  Log out
                </Button>
              </form>
            </>
          ) : (
            <Button
              size="sm"
              className="rounded-full"
              nativeButton={false}
              render={<Link href="/login" />}
            >
              Login
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}

import Link from "next/link";

import { auth } from "@/lib/auth";
import { logoutAction } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";

export async function SiteHeader() {
  const session = await auth();

  return (
    <header className="border-b border-border/80 bg-background/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
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
        <div className="hidden flex-1 items-center justify-center md:flex" />
        <nav className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="rounded-full border-[#1d4ed8]/30 bg-white/80 text-[#1d4ed8] hover:bg-[#1d4ed8]/5"
            nativeButton={false}
            render={<Link href="/tours" />}
          >
            Custom Tours
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
        </nav>
      </div>
    </header>
  );
}

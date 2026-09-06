"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Headset, LayoutDashboard, User } from "lucide-react";

import { getAdminBoardHref } from "@/lib/admin-sections";
import { hasPermission, type Role } from "@/lib/access-control";
import { getProfileInitials } from "@/lib/profile-initials";
import { Button } from "@/components/ui/button";
import { CurrencySelector } from "@/components/currency/currency-selector";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { LogoutButton } from "@/components/profile/logout-button";

type HeaderAccountData = { name: string | null; email: string | null; role: Role; image: string | null };

const HeaderAccountContext = createContext<HeaderAccountData | null | undefined>(undefined);

export function HeaderAccountProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<HeaderAccountData | null>();
  const pathname = usePathname();
  const previousPathname = useRef(pathname);

  useEffect(() => {
    const previousPath = previousPathname.current;
    const wasOnAuthPage = previousPath === "/login" || previousPath === "/signup";
    const isOnAuthPage = pathname === "/login" || pathname === "/signup";
    previousPathname.current = pathname;

    // The root header survives client navigations. Its session only changes
    // when a login redirects out of auth; logout already performs a reload.
    // Avoid a no-store request on every ordinary navigation.
    if (isOnAuthPage || (previousPath !== pathname && !wasOnAuthPage)) return;

    void (async () => {
      try {
        const response = await fetch("/api/header-account", { cache: "no-store" });
        if (!response.ok) throw new Error("Unable to load account.");
        setAccount((await response.json()) as HeaderAccountData | null);
      } catch {
        setAccount(null);
      }
    })();
  }, [pathname]);

  return <HeaderAccountContext value={account}>{children}</HeaderAccountContext>;
}

export function HeaderAccount() {
  const account = useContext(HeaderAccountContext);
  const displayName = account?.name ?? account?.email ?? "User";
  const adminBoardHref = getAdminBoardHref(account?.role);

  return <div className="flex max-w-[110px] flex-wrap items-center justify-end gap-1.5 whitespace-nowrap md:max-w-none md:flex-nowrap md:gap-2">
    <div className="order-2 flex basis-full items-center justify-end gap-1 md:order-1 md:basis-auto md:gap-2">
      <ThemeToggle responsive />
      <CurrencySelector responsive />
    </div>
    {account ? <div className="group relative order-1 shrink-0 md:order-2">
      <Link
        href="/profile"
        className="flex h-7 items-center gap-1.5 overflow-hidden rounded-full border border-border/70 bg-background/60 pl-2.5 pr-0 text-xs font-semibold text-foreground/80 transition hover:border-primary/40 hover:text-foreground md:h-10 md:rounded-full md:p-0 md:ring-1 md:ring-border/70 md:hover:ring-primary"
      >
        <span className="md:hidden">Profile</span>
        {account.image ? (
          <span className="mr-px shrink-0 overflow-hidden rounded-full md:mr-0">
            <Image src={account.image} alt="Profile" width={40} height={40} unoptimized className="block h-[26px] w-[26px] object-cover md:h-10 md:w-10" />
          </span>
        ) : <span className="mr-px flex h-[26px] w-[26px] items-center justify-center rounded-full bg-foreground font-heading text-[0.6rem] font-semibold text-background md:mr-0 md:h-10 md:w-10 md:text-sm">{getProfileInitials(displayName)}</span>}
      </Link>
      <div className="invisible absolute right-0 top-full z-10 mt-2 hidden min-w-[220px] flex-col rounded-xl border border-border/70 bg-background/95 p-1.5 opacity-0 shadow-[0_12px_30px_-16px_rgba(0,0,0,0.35)] transition-all duration-200 group-hover:visible group-hover:opacity-100 md:flex">
        <Link href="/profile" className="flex items-center gap-2.5 rounded-lg px-3.5 py-2.5 text-base font-medium text-foreground transition hover:bg-primary/10 hover:text-primary"><User className="h-4 w-4" />Profile</Link>
        {account.role === "GUIDE" ? <Link href="/guide-board/trips" className="flex items-center gap-2.5 rounded-lg px-3.5 py-2.5 text-base font-medium text-foreground transition hover:bg-primary/10 hover:text-primary"><LayoutDashboard className="h-4 w-4" />Guide Board</Link> : null}
        {adminBoardHref ? <Link href={adminBoardHref} className="flex items-center gap-2.5 rounded-lg px-3.5 py-2.5 text-base font-medium text-foreground transition hover:bg-primary/10 hover:text-primary"><LayoutDashboard className="h-4 w-4" />Admin Board</Link> : null}
        {hasPermission(account.role, "support.manage") ? <Link href="/support" className="flex items-center gap-2.5 rounded-lg px-3.5 py-2.5 text-base font-medium text-foreground transition hover:bg-primary/10 hover:text-primary"><Headset className="h-4 w-4" />Support Board</Link> : null}
        <LogoutButton variant="menu" />
      </div>
    </div> : <Button size="sm" className="order-1 min-w-[96px] rounded-full px-4 py-2 text-sm font-semibold md:order-2 md:min-w-[128px] md:px-6 md:text-base lg:min-w-[152px]" nativeButton={false} render={<Link href="/login" />}>Login</Button>}
  </div>;
}

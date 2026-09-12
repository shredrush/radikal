"use client";

import Image from "next/image";
import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Bell, Heart, Headset, LayoutDashboard, Settings2, Ticket, UsersRound } from "lucide-react";

import { getAdminBoardHref } from "@/lib/admin-sections";
import { hasPermission, type Role } from "@/lib/access-control";
import { getProfileInitials } from "@/lib/profile-initials";
import { Button } from "@/components/ui/button";
import { CurrencySelector } from "@/components/currency/currency-selector";
import { ThemeToggle } from "@/components/theme/theme-toggle";

const LazyLogoutButton = dynamic(
  () => import("@/components/profile/logout-button").then((module) => module.LogoutButton),
  { ssr: false },
);

type HeaderAccountData = {
  name: string | null;
  username: string | null;
  email: string | null;
  role: Role;
  image: string | null;
  unreadNotifications: number;
};

const HeaderAccountContext = createContext<HeaderAccountData | null | undefined>(undefined);

export function HeaderAccountProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<HeaderAccountData | null | undefined>(undefined);
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
        // Resolve so a transient failure never strands the header on the
        // loading placeholder; keep an already-loaded account when present.
        setAccount((current) => (current === undefined ? null : current));
      }
    })();
  }, [pathname]);

  return <HeaderAccountContext value={account}>{children}</HeaderAccountContext>;
}

export function HeaderAccount() {
  const account = useContext(HeaderAccountContext);
  const pathname = usePathname();
  // The provider intentionally skips the account request on auth pages, so
  // treat "unknown" there as logged out and show the Login button.
  const isAuthPage = pathname === "/login" || pathname === "/signup";
  const showLoading = account === undefined && !isAuthPage;
  const displayName = account?.name ?? account?.email ?? "User";
  const adminBoardHref = getAdminBoardHref(account?.role);
  const [menuOpen, setMenuOpen] = useState(false);
  const [failedImage, setFailedImage] = useState<string | null>(null);
  const menuTriggerRef = useRef<HTMLAnchorElement>(null);
  const imageFailed = account?.image === failedImage;

  return <div className="flex max-w-[110px] flex-wrap items-center justify-end gap-1.5 whitespace-nowrap md:max-w-none md:flex-nowrap md:gap-2">
    <div className="order-2 flex basis-full items-center justify-end gap-1 md:order-1 md:basis-auto md:gap-2">
      <ThemeToggle responsive />
      <CurrencySelector responsive />
    </div>
    {showLoading ? <span role="status" aria-label="Loading account" className="order-1 size-7 animate-pulse rounded-full bg-muted md:order-2 md:size-10" /> : account ? <div
      className="relative order-1 shrink-0 md:order-2"
      onMouseEnter={() => setMenuOpen(true)}
      onMouseLeave={() => setMenuOpen(false)}
      onFocusCapture={() => setMenuOpen(true)}
      onBlurCapture={(event) => {
        if (!event.relatedTarget || !event.currentTarget.contains(event.relatedTarget as Node)) {
          setMenuOpen(false);
        }
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          setMenuOpen(false);
          menuTriggerRef.current?.focus();
        }
      }}
    >
      <Link
        ref={menuTriggerRef}
        href="/profile"
        aria-controls="account-navigation"
        aria-expanded={menuOpen}
        aria-haspopup="true"
        className="flex h-7 items-center gap-1.5 overflow-hidden rounded-full border border-border/70 bg-background/60 pl-2.5 pr-0 text-xs font-semibold text-foreground/80 transition hover:border-primary/40 hover:text-foreground md:h-10 md:rounded-full md:p-0 md:ring-1 md:ring-border/70 md:hover:ring-primary"
      >
        <span className="md:hidden">Profile</span>
        {account.image && !imageFailed ? (
          <span className="mr-px shrink-0 overflow-hidden rounded-full md:mr-0">
            <Image src={account.image} alt="Profile" width={40} height={40} onError={() => setFailedImage(account.image)} className="block h-[26px] w-[26px] object-cover md:h-10 md:w-10" />
          </span>
        ) : <span className="mr-px flex h-[26px] w-[26px] items-center justify-center rounded-full bg-foreground font-heading text-[0.6rem] font-semibold text-background md:mr-0 md:h-10 md:w-10 md:text-sm">{getProfileInitials(displayName)}</span>}
      </Link>
       {menuOpen ? <div className="absolute right-0 top-full z-10 hidden w-72 pt-2 md:block">
        <nav id="account-navigation" aria-label="Account navigation" className="flex flex-col overflow-hidden rounded-2xl border border-border/70 bg-background/95 shadow-[0_20px_45px_-24px_rgba(0,0,0,0.45)] backdrop-blur">
         <div className="flex items-center gap-3 px-4 py-3.5">
           {account.image && !imageFailed ? (
             <span className="overflow-hidden rounded-full ring-1 ring-border/70">
               <Image src={account.image} alt="Profile" width={40} height={40} onError={() => setFailedImage(account.image)} className="block size-10 object-cover" />
             </span>
           ) : <span className="flex size-10 items-center justify-center rounded-full bg-foreground font-heading text-sm font-semibold text-background">{getProfileInitials(displayName)}</span>}
           <div className="min-w-0">
             <p className="truncate text-sm font-semibold text-foreground">{displayName}</p>
             {account.username ? <p className="truncate text-xs text-muted-foreground">@{account.username}</p> : null}
           </div>
         </div>
         <div className="border-t border-border/70 p-2">
           {adminBoardHref ? <Link href={adminBoardHref} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-foreground transition hover:bg-primary/10 hover:text-primary"><LayoutDashboard className="size-4" />Admin Board</Link> : null}
           {account && hasPermission(account.role, "support.manage") ? <Link href="/support" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-foreground transition hover:bg-primary/10 hover:text-primary"><Headset className="size-4" />Support Board</Link> : null}
           {account.role === "GUIDE" ? <Link href="/guide-board/trips" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-foreground transition hover:bg-primary/10 hover:text-primary"><LayoutDashboard className="size-4" />Guide Board</Link> : null}
           <Link href="/profile?tab=bookings" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-foreground transition hover:bg-primary/10 hover:text-primary"><Ticket className="size-4" />Bookings</Link>
           <Link href="/profile?tab=wishlist" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-foreground transition hover:bg-primary/10 hover:text-primary"><Heart className="size-4" />Wishlist</Link>
           <Link href="/profile?tab=notifications" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-foreground transition hover:bg-primary/10 hover:text-primary"><Bell className="size-4" />Notifications{account.unreadNotifications > 0 ? <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[0.65rem] font-bold leading-none text-white">{account.unreadNotifications > 9 ? "9+" : account.unreadNotifications}</span> : null}</Link>
           <Link href="/profile?tab=settings" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-foreground transition hover:bg-primary/10 hover:text-primary"><Settings2 className="size-4" />Settings</Link>
           <Link href="/profile?tab=support" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-foreground transition hover:bg-primary/10 hover:text-primary"><Headset className="size-4" />Support</Link>
           <Link href="/profile?tab=referrals" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-foreground transition hover:bg-primary/10 hover:text-primary"><UsersRound className="size-4" />Referral</Link>
           <LazyLogoutButton variant="menu" />
         </div>
        </nav>
       </div> : null}
    </div> : <Button size="sm" className="order-1 min-w-[96px] rounded-full px-4 py-2 text-sm font-semibold md:order-2 md:min-w-[128px] md:px-6 md:text-base lg:min-w-[152px]" nativeButton={false} render={<Link href="/login" />}>Login</Button>}
  </div>;
}

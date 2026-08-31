"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Headset, LayoutDashboard, User } from "lucide-react";

import { getAdminBoardHref } from "@/lib/admin-sections";
import { hasPermission, type Role } from "@/lib/access-control";
import { getProfileInitials } from "@/lib/profile-initials";
import { Button } from "@/components/ui/button";
import { CurrencySelector } from "@/components/currency/currency-selector";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { LogoutButton } from "@/components/profile/logout-button";

type HeaderAccountData = { name: string | null; email: string | null; role: Role; image: string | null };

export function HeaderAccount({ variant }: { variant: "mobile" | "desktop" }) {
  const [account, setAccount] = useState<HeaderAccountData | null>();
  const pathname = usePathname();

  // The header lives in the root layout and stays mounted across client-side
  // navigations. Refetch whenever the path changes so the login state updates
  // immediately after logging in or out, instead of waiting for a reload.
  useEffect(() => {
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

  const isMobile = variant === "mobile";
  const displayName = account?.name ?? account?.email ?? "User";
  const adminBoardHref = getAdminBoardHref(account?.role);

  return <>
    <ThemeToggle />
    <CurrencySelector />
    {account ? <div className="group relative">
      <Link href="/profile" className="flex items-center rounded-full ring-1 ring-border/70 transition hover:ring-primary">
        {account.image ? <Image src={account.image} alt="Profile" width={isMobile ? 32 : 40} height={isMobile ? 32 : 40} unoptimized className={isMobile ? "h-8 w-8 rounded-full object-cover" : "h-10 w-10 rounded-full object-cover"} /> : <span className={isMobile ? "flex h-8 w-8 items-center justify-center rounded-full bg-foreground font-heading text-xs font-semibold text-background" : "flex h-10 w-10 items-center justify-center rounded-full bg-foreground font-heading text-sm font-semibold text-background"}>{getProfileInitials(displayName)}</span>}
      </Link>
      {!isMobile ? <div className="invisible absolute right-0 top-full z-10 mt-2 flex min-w-[220px] flex-col rounded-xl border border-border/70 bg-background/95 p-1.5 opacity-0 shadow-[0_12px_30px_-16px_rgba(0,0,0,0.35)] transition-all duration-200 group-hover:visible group-hover:opacity-100">
        <Link href="/profile" className="flex items-center gap-2.5 rounded-lg px-3.5 py-2.5 text-base font-medium text-foreground transition hover:bg-primary/10 hover:text-primary"><User className="h-4 w-4" />Profile</Link>
        {account.role === "GUIDE" ? <Link href="/guide-board/trips" className="flex items-center gap-2.5 rounded-lg px-3.5 py-2.5 text-base font-medium text-foreground transition hover:bg-primary/10 hover:text-primary"><LayoutDashboard className="h-4 w-4" />Guide Board</Link> : null}
        {adminBoardHref ? <Link href={adminBoardHref} className="flex items-center gap-2.5 rounded-lg px-3.5 py-2.5 text-base font-medium text-foreground transition hover:bg-primary/10 hover:text-primary"><LayoutDashboard className="h-4 w-4" />Admin Board</Link> : null}
        {hasPermission(account.role, "support.manage") ? <Link href="/support" className="flex items-center gap-2.5 rounded-lg px-3.5 py-2.5 text-base font-medium text-foreground transition hover:bg-primary/10 hover:text-primary"><Headset className="h-4 w-4" />Support Board</Link> : null}
        <LogoutButton variant="menu" />
      </div> : null}
    </div> : <Button size={isMobile ? "sm" : "lg"} className={isMobile ? "min-w-[96px] rounded-full px-4 py-2 text-sm font-semibold" : "min-w-[128px] rounded-full px-6 text-base font-semibold sm:min-w-[152px]"} nativeButton={false} render={<Link href="/login" />}>Login</Button>}
  </>;
}

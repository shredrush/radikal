"use client";

import Link from "next/link";
import type { MouseEvent, ReactNode } from "react";

export function SiteLogoLink({ className, children }: { className?: string; children: ReactNode }) {
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (window.location.pathname === "/") {
      event.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
      window.history.replaceState({}, "", "/");
      return;
    }

    window.location.assign("/");
  };

  return (
    <Link href="/" className={className} onClick={handleClick}>
      {children}
    </Link>
  );
}

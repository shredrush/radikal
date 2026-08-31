"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export function AuthenticatedLink({
  authenticatedHref,
  unauthenticatedHref,
  className,
  children,
}: {
  authenticatedHref: string;
  unauthenticatedHref: string;
  className: string;
  children: React.ReactNode;
}) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    void (async () => {
      try {
        const response = await fetch("/api/header-account", { cache: "no-store" });
        setIsAuthenticated(response.ok && (await response.json()) !== null);
      } catch {
        setIsAuthenticated(false);
      }
    })();
  }, [pathname]);

  return <Link href={isAuthenticated ? authenticatedHref : unauthenticatedHref} className={className}>{children}</Link>;
}

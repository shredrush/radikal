import Link from "next/link";
import type { ReactNode } from "react";

export function SiteLogoLink({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <Link href="/" className={className}>
      {children}
    </Link>
  );
}

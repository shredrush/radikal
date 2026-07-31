import type { ReactNode } from "react";
import Link from "next/link";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid flex-1 lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-primary p-10 text-primary-foreground lg:flex">
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,color-mix(in_oklch,var(--primary-foreground),transparent_85%),transparent_45%),radial-gradient(circle_at_80%_70%,color-mix(in_oklch,var(--primary-foreground),transparent_90%),transparent_50%)]"
        />
        <Link href="/" className="relative z-10 font-heading text-2xl font-semibold tracking-widest uppercase">
          Radikal
        </Link>
        <div className="relative z-10 flex flex-col gap-4">
          <p className="font-heading text-3xl leading-tight font-semibold tracking-wide">
            Small groups. Offbeat trails. Certified local guides.
          </p>
          <p className="max-w-md text-sm leading-relaxed text-primary-foreground/70">
            Ski, snowboard, bike and trek across Manali, Ladakh, Kashmir and
            Lahaul-Spiti — booked responsibly, guided sustainably.
          </p>
        </div>
      </div>
      <div className="flex flex-1 items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}

import { Eye } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { TripGallery } from "@/components/trips/trip-gallery";
import { ACTIVITY_TYPE_LABELS, TRIP_CATEGORY_LABELS } from "@/lib/trip-metadata";
import { formatDurationDays } from "@/lib/trip-dates";
import { normalizeTripImagePath } from "@/lib/trip-card-image";
import { type TripProposal } from "@/lib/trip-changes";

// Never cache this page: caching and expiry are mutually exclusive.
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Trip Preview",
  robots: { index: false, follow: false },
};

export default async function TripPreviewPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  // Defense in depth: admins only. The random token is the second factor.
  await requirePermission("trips.manage", "/login?callbackUrl=/admin/trips");

  const { token } = await params;
  const preview = await prisma.tripPreview.findUnique({
    where: {
      token,
      // Filter at the query level so expiry is enforced by the database rather
      // than an impure Date.now() call during render.
      expiresAt: { gt: new Date() },
    },
  });

  if (
    !preview ||
    typeof preview.proposed !== "object" ||
    preview.proposed === null
  ) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-6 text-center">
        <Eye className="h-8 w-8 text-orange-500" />
        <h1 className="font-heading text-2xl font-semibold text-foreground">
          This preview link has expired
        </h1>
        <p className="max-w-sm text-sm leading-6 text-muted-foreground">
          Preview links only stay valid for a few minutes. Go back to the form
          and open a fresh preview.
        </p>
      </div>
    );
  }

  const p = preview.proposed as unknown as TripProposal;
  const images = (Array.isArray(p.images) ? p.images : [])
    .map((image) => normalizeTripImagePath(image, p.slug))
    .filter(Boolean);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-12">
      <div className="flex items-center gap-3 rounded-2xl border border-orange-500/40 bg-orange-500/10 px-4 py-3 text-sm text-orange-700 dark:text-orange-400">
        <Eye className="h-4 w-4 shrink-0" />
        <span>
          <strong>Preview</strong> — not live. This link expires in a few
          minutes.
        </span>
      </div>

      <div className="overflow-hidden rounded-[2rem] border border-border/80 bg-background/95 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.25)]">
        <div className="grid items-stretch gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <div className="relative overflow-hidden bg-muted/60">
            <TripGallery
              images={images}
              fallbackImage={`/activities/${p.slug ?? "cover"}/cover.png`}
              alt={p.title}
              compact
            />
          </div>
          <div className="flex flex-col justify-between gap-6 px-8 py-8 sm:px-10">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-border/80 bg-muted px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
                  {ACTIVITY_TYPE_LABELS[p.type] ?? p.type}
                </span>
                {Array.isArray(p.categories) &&
                  p.categories.map((category) => (
                    <span
                      key={category}
                      className="rounded-full border border-border/80 bg-muted px-2.5 py-0.5 text-xs text-muted-foreground"
                    >
                      {TRIP_CATEGORY_LABELS[category] ?? category}
                    </span>
                  ))}
              </div>
              <h1 className="font-heading text-3xl font-semibold tracking-wide sm:text-4xl">
                {p.title}
              </h1>
              <p className="whitespace-pre-line text-base leading-8 text-muted-foreground">
                {p.description}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-border/70 bg-muted/50 p-3">
                <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Price</p>
                <p className="mt-1 text-sm font-medium text-foreground">
                  ₹{Number(p.priceInRupees || 0).toLocaleString("en-IN")}
                </p>
              </div>
              <div className="rounded-xl border border-border/70 bg-muted/50 p-3">
                <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Duration</p>
                <p className="mt-1 text-sm font-medium text-foreground">
                  {formatDurationDays(p.durationDays ?? 1)}
                </p>
              </div>
              <div className="rounded-xl border border-border/70 bg-muted/50 p-3">
                <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Group size</p>
                <p className="mt-1 text-sm font-medium text-foreground">
                  Up to {p.maxGroupSize ?? 8} travellers
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-border/70 bg-muted/50 p-3">
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Pickup</p>
          <p className="mt-1 text-sm font-medium text-foreground">{p.pickup || p.location}</p>
        </div>
        <div className="rounded-xl border border-border/70 bg-muted/50 p-3">
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Drop</p>
          <p className="mt-1 text-sm font-medium text-foreground">{p.drop || p.location}</p>
        </div>
      </div>

      {Array.isArray(p.highlights) && p.highlights.length > 0 ? (
        <div className="rounded-[1.5rem] border border-border/80 bg-background/95 p-6 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.25)]">
          <h2 className="text-lg font-semibold text-foreground">
            Why travellers love this trip
          </h2>
          <ul className="mt-3 space-y-2">
            {p.highlights.map((h) => (
              <li key={h} className="flex items-start gap-2">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-black" />
                <span className="text-sm leading-6 text-muted-foreground">{h}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {Array.isArray(p.inclusions) || Array.isArray(p.exclusions) ? (
        <div className="grid gap-6 rounded-[1.5rem] border border-border/80 bg-background/95 p-6 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.25)] sm:grid-cols-2">
          <div className="space-y-2.5">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-emerald-600 dark:text-emerald-400">Included</p>
            {(Array.isArray(p.inclusions) ? p.inclusions : []).map((item) => (
              <p key={item} className="text-sm leading-6 text-foreground">• {item}</p>
            ))}
          </div>
          <div className="space-y-2.5">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-rose-500 dark:text-rose-400">Not included</p>
            {(Array.isArray(p.exclusions) ? p.exclusions : []).map((item) => (
              <p key={item} className="text-sm leading-6 text-muted-foreground">• {item}</p>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

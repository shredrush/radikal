import Image from "next/image";
import Link from "next/link";
import { ArrowRight, MapPin, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { ACCENT_PILL, CARD_SURFACE } from "@/lib/card-styles";
import { getGuideImage } from "@/lib/guide-images";

export interface GuideCardGuide {
  username: string;
  name: string;
  location: string;
  photo?: string | null;
  photos?: string[] | null;
  certifications: string[];
  bio?: string;
  languages?: string[];
  experienceYears?: number;
}

export function GuideCard({
  guide,
  variant = "home",
}: {
  guide: GuideCardGuide;
  variant?: "home" | "community";
}) {
  if (variant === "home") {
    return (
      <Link href={`/${guide.username}`} className="block">
        <Card className={`flex h-full min-w-0 flex-col overflow-hidden rounded-[0.9rem] py-0 ${CARD_SURFACE} transition duration-200 hover:-translate-y-1`}>
          <CardHeader className="gap-0 p-0 pb-0 px-0">
            <div className="flex flex-col items-center text-center">
              <Image
                src={getGuideImage(guide)}
                alt={guide.name}
                width={400}
                height={320}
                className="h-32 w-full rounded-b-[0.7rem] rounded-t-[0.85rem] object-cover shadow-sm sm:h-36 lg:h-40"
              />
              <div className="w-full px-2 pb-3 pt-2">
                <CardTitle className="text-[clamp(0.82rem,0.95vw,1rem)] leading-4 text-foreground">{guide.name}</CardTitle>
                <p className="mt-0.5 text-[clamp(0.68rem,0.76vw,0.8rem)] text-muted-foreground">{guide.location}</p>
                <div className="mt-2 flex flex-wrap justify-center gap-1.5">
                  {guide.certifications.map((certification) => (
                    <Badge key={certification} className="rounded-full border border-border/70 bg-background/80 px-1.5 py-0.45 text-[clamp(0.62rem,0.62vw,0.72rem)] font-small text-foreground/90">
                      {certification}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </CardHeader>
          <div className="mt-auto flex items-center justify-center gap-1.5 border-t border-border/70 bg-muted/60 px-3 py-2 text-[0.68rem] font-semibold text-muted-foreground transition-colors group-hover:bg-muted group-hover:text-foreground sm:text-xs">
            View public profile
            <ArrowRight className="h-3.5 w-3.5" />
          </div>
        </Card>
      </Link>
    );
  }

  return (
    <Link href={`/${guide.username}`} className="group block">
      <article className={`flex h-full flex-col overflow-hidden rounded-[0.9rem] ${CARD_SURFACE} transition duration-200 hover:-translate-y-1`}>
        <div className="relative h-56 overflow-hidden sm:h-60 xl:h-64">
          <Image
            src={getGuideImage(guide)}
            alt={guide.name}
            fill
            className="object-cover transition duration-500 group-hover:scale-[1.03]"
            sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 20vw"
          />
        </div>

        <div className="space-y-4 p-4">
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-heading text-xl font-semibold text-foreground">{guide.name}</h3>
              <div className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[0.6rem] font-medium text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
                <ShieldCheck className="h-3 w-3" />
                Vetted
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" />
              <span>{guide.location}</span>
            </div>

            {guide.experienceYears != null && (
              <p className="text-xs leading-5 text-muted-foreground">
                <span className="font-heading font-semibold text-orange-700 dark:text-orange-400">{guide.experienceYears}+</span> years experience
              </p>
            )}
          </div>

          <p className="text-sm leading-6 text-muted-foreground">
            {guide.bio && guide.bio.length > 120 ? `${guide.bio.slice(0, 120)}...` : guide.bio}
          </p>

          <div className="flex flex-wrap gap-1.5">
            {guide.certifications.slice(0, 2).map((certification) => (
              <span
                key={certification}
                className={`rounded-full border px-2 py-1 text-[0.65rem] font-medium ${ACCENT_PILL}`}
              >
                {certification}
              </span>
            ))}
          </div>

          <div className="border-t border-border/70 pt-3">
            <p className="mb-2 text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Languages
            </p>
            <div className="flex flex-wrap gap-1.5">
              {guide.languages?.map((language) => (
                <span
                  key={`${guide.username}-${language}`}
                  className="rounded-full bg-emerald-50 px-2 py-1 text-[0.68rem] font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                >
                  {language}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-auto flex items-center justify-center gap-1.5 border-t border-border/70 bg-muted/60 px-3 py-2.5 text-xs font-semibold text-orange-700 transition-colors group-hover:bg-muted group-hover:text-orange-800 dark:text-orange-300 dark:group-hover:text-orange-200">
          View public profile
          <ArrowRight className="h-3.5 w-3.5" />
        </div>
      </article>
    </Link>
  );
}

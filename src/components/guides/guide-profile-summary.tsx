import type { ReactNode } from "react";

import { ShieldCheck } from "lucide-react";

import { GuideSports } from "@/components/guides/guide-sports";
import { ACCENT_PILL } from "@/lib/card-styles";

type GuideProfileSummaryData = {
  id: string;
  name: string;
  bio: string;
  location: string;
  experienceYears: number;
  languages: string[];
  sports: string[];
  certifications: { id: string; title: string }[];
};

export function GuideProfileSummary({
  guide,
  heading,
}: {
  guide: GuideProfileSummaryData;
  heading?: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col justify-start">
      <div className="space-y-3">
        <div>
          {heading ?? (
            <h1 className="break-words font-heading text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              {guide.name}
            </h1>
          )}
          <p className="mt-2 break-words text-sm font-semibold uppercase tracking-[0.25em] text-muted-foreground">
            {guide.location}
          </p>
          <div className="mt-3 inline-flex w-fit items-center gap-2 rounded-full border border-border/70 bg-background px-3 py-1.5 text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-foreground">
            <ShieldCheck className="h-3.5 w-3.5" />
            Vetted guide
          </div>
        </div>

        <p className="break-words text-base leading-7 text-muted-foreground">
          <span className="font-heading text-lg font-semibold text-emerald-700 dark:text-emerald-400">
            {guide.experienceYears}+
          </span>{" "}
          years experience
        </p>
        <p className="break-words text-sm leading-6 text-muted-foreground">{guide.bio}</p>
      </div>

      <div className="mt-6 space-y-5">
        {guide.certifications.length > 0 ? (
          <div>
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.25em] text-muted-foreground">Certifications</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {guide.certifications.map((certification) => (
                <span
                  key={certification.id}
                  className={`max-w-full break-words rounded-full border ${ACCENT_PILL} px-3 py-1.5 text-sm font-medium`}
                >
                  {certification.title}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        <GuideSports sports={guide.sports} />
        <div>
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.25em] text-muted-foreground">Languages</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {guide.languages.map((language) => (
              <span
                key={`${guide.id}-${language}`}
                className="max-w-full break-words rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
              >
                {language}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { ExternalLink } from "lucide-react";

import { Badge } from "@/components/ui/badge";

export type GuideApplicationView = {
  id: string;
  name: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  bio: string;
  location: string;
  experienceYears: number;
  languages: string[];
  phone: string | null;
  photos: string[];
  videos: string[];
  instagramUrl: string | null;
  facebookUrl: string | null;
  youtubeUrl: string | null;
  websiteUrl: string | null;
  user: { id: string; name: string; username: string | null; email: string };
  certifications: Array<{
    id: string;
    title: string;
  }>;
};

export function GuideApplicationDetails({ application }: { application: GuideApplicationView }) {
  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">About</p>
        <p className="mt-2 whitespace-pre-line text-sm leading-6 text-foreground/90">{application.bio}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {application.languages.map((language) => (
          <Badge key={language} variant="secondary" className="rounded-full border border-border/70 bg-background/80 px-2.5 py-1 text-[11px] font-medium text-foreground/80">
            {language}
          </Badge>
        ))}
      </div>

      {application.certifications.length > 0 ? (
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">Certifications</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {application.certifications.map((cert) => (
              <Badge key={cert.id} variant="secondary" className="rounded-full border border-border/70 bg-background/80 px-2.5 py-1 text-[11px] font-medium text-foreground/80">
                {cert.title}
              </Badge>
            ))}
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {[
          ["Instagram", application.instagramUrl],
          ["Facebook", application.facebookUrl],
          ["YouTube", application.youtubeUrl],
          ["Website", application.websiteUrl],
        ]
          .filter(([, url]) => url)
          .map(([label, url]) => (
            <a
              key={label}
              href={url ?? undefined}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-background/80 px-3 py-1 text-[11px] font-medium text-foreground/80 transition hover:text-foreground"
            >
              {label} <ExternalLink className="h-3 w-3" />
            </a>
          ))}
      </div>

      {application.photos.length > 0 ? (
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">Photos</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {application.photos.map((photo, index) => (
              <a key={photo} href={photo} target="_blank" rel="noopener noreferrer" className="text-sm text-primary underline underline-offset-4">
                Photo {index + 1}
              </a>
            ))}
          </div>
        </div>
      ) : null}

      {application.videos.length > 0 ? (
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">Videos</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {application.videos.map((video, index) => (
              <a key={video} href={video} target="_blank" rel="noopener noreferrer" className="text-sm text-primary underline underline-offset-4">
                Video {index + 1}
              </a>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

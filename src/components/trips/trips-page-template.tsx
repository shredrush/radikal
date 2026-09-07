import { FaqSection } from "@/components/trips/faq-section";

export function TripsPageTemplate({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col">
      <section className="mx-auto flex w-full max-w-8xl flex-col gap-4 px-4 pb-10 pt-4 sm:px-6 sm:pb-16 sm:pt-6 lg:px-10">
        <div className="flex flex-col items-center gap-3 text-center">
          <h1 className="font-heading text-3xl font-semibold tracking-wide sm:text-4xl">
            Learn the skills. Live the adventure
          </h1>
          <p className="max-w-2xl text-base leading-7 text-muted-foreground">
            We curate small group trips and education courses for adventure enthusiasts, led by certified experts
          </p>
        </div>

        {children}

        <FaqSection />
      </section>
    </div>
  );
}

export function TripsCatalogSkeleton() {
  return (
    <div className="flex animate-pulse flex-col gap-8" aria-label="Loading trips" role="status">
      <div className="flex flex-col gap-3">
        <div className="mx-auto h-12 w-full max-w-[44.88rem] rounded-full border border-border/70 bg-muted/50" />
        <div className="mx-auto grid w-full max-w-[44.88rem] grid-cols-6 gap-1 px-3 sm:gap-2 sm:px-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="mx-auto flex w-full max-w-16 flex-col items-center gap-1">
              <div className="size-8 rounded-full border border-border/70 bg-muted/50 sm:size-11" />
              <div className="h-3 w-full rounded bg-muted/50" />
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="flex flex-col gap-2">
            <div className="aspect-[25/27] rounded-[0.9rem] border border-border/70 bg-muted/50" />
            <div className="h-5 w-4/5 rounded bg-muted/50" />
            <div className="h-5 w-full rounded bg-muted/50" />
          </div>
        ))}
      </div>
      <span className="sr-only">Loading trips</span>
    </div>
  );
}

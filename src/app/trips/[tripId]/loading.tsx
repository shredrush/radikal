function DetailBlock({ className }: { className?: string }) {
  return <div className={`rounded-[1.5rem] border border-border/80 bg-muted/40 ${className ?? ""}`} />;
}

export default function TripDetailLoading() {
  return (
    <div className="flex flex-1 flex-col" aria-busy="true" aria-label="Loading trip">
      <section className="mx-auto flex w-full max-w-8xl animate-pulse flex-col gap-8 px-4 py-10 sm:px-6 sm:py-16 lg:px-10">
        <div className="h-5 w-28 rounded bg-muted/60" />
        <div className="flex items-start justify-between gap-4">
          <div className="h-10 w-3/5 max-w-xl rounded bg-muted/60" />
          <div className="size-10 rounded-full border border-border/70 bg-muted/60" />
        </div>

        <div className="h-[320px] rounded-[2rem] border border-border/80 bg-muted/60 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.25)] sm:h-[400px] lg:h-[480px]" />

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <DetailBlock className="min-h-[32rem]" />
          <div className="flex flex-col gap-6">
            <DetailBlock className="h-40" />
            <DetailBlock className="h-52" />
            <DetailBlock className="h-36" />
            <DetailBlock className="h-44" />
          </div>
        </div>

        <DetailBlock className="min-h-[26rem]" />
        <DetailBlock className="min-h-[28rem]" />
      </section>
      <span className="sr-only">Loading trip</span>
    </div>
  );
}

export default function ProfileLoading() {
  return (
    <div className="flex flex-1 flex-col">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-10">
        <div className="rounded-[1.5rem] border border-border/80 p-5 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.25)] sm:p-6">
          <div className="flex animate-pulse gap-4">
            <div className="h-44 w-44 rounded-l-[1.5rem] bg-muted sm:h-56 sm:w-56" />
            <div className="flex flex-1 flex-col gap-3 pt-1">
              <div className="h-6 w-48 rounded bg-muted" />
              <div className="h-4 w-64 rounded bg-muted" />
              <div className="mt-4 flex gap-5">
                <div className="h-4 w-24 rounded bg-muted" />
                <div className="h-4 w-24 rounded bg-muted" />
              </div>
            </div>
          </div>
        </div>
        <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
          <aside className="grid animate-pulse grid-cols-2 gap-2 lg:flex lg:flex-col">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-11 rounded-xl border border-border/70 bg-muted/50" />
            ))}
          </aside>
          <div className="flex animate-pulse flex-col gap-6">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="h-20 rounded-[1.5rem] border border-border/80 bg-muted/30" />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

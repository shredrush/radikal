import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Backpack, Check, Compass, Dumbbell, MapPin, ShieldCheck, Timer } from "lucide-react";

import { SportIconChip } from "@/components/trips/sport-icon";
import { TripCard } from "@/components/trips/trip-card";
import type { SportGuide } from "@/lib/sport-guides";
import { getTripCardImage } from "@/lib/trip-card-image";

type SportGuideTrip = React.ComponentProps<typeof TripCard>["trip"] & { id: string };

const COMMUNITY_HERO = "from-orange-50/70 via-background to-emerald-50/70 dark:from-orange-500/10 dark:via-card dark:to-emerald-500/10";
const COMMUNITY_BADGE = "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300";
const COMMUNITY_TILES = [
  "bg-orange-50/80 dark:bg-orange-500/10",
  "bg-blue-50/80 dark:bg-blue-500/10",
  "bg-emerald-50/80 dark:bg-emerald-500/10",
] as const;

function ListCard({ title, items, icon: Icon, className }: { title: string; items: string[]; icon: typeof Backpack; className: string }) {
  return <article className={`rounded-[1.5rem] p-5 sm:p-6 ${className}`}><div className="flex items-center gap-3"><span className="flex size-9 items-center justify-center rounded-xl bg-background/70"><Icon className="size-4" /></span><h3 className="font-heading text-lg font-semibold text-foreground">{title}</h3></div><ul className="mt-5 space-y-3">{items.map((item) => <li key={item} className="flex gap-2 text-sm leading-6 text-foreground/80"><Check className="mt-1 size-3.5 shrink-0" />{item}</li>)}</ul></article>;
}

export function SportGuidePage({ guide, trips }: { guide: SportGuide; trips: SportGuideTrip[] }) {
  const media = trips.map((trip) => ({ src: getTripCardImage(trip), alt: trip.title })).filter((item) => item.src).slice(0, 3);
  const tripQuery = guide.id === "ski" || guide.id === "snowboard" ? "winter" : guide.id;

  return <div className="flex-1"><div className="mx-auto flex w-full max-w-8xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
    <Link href="/trips" className="flex w-fit items-center gap-2 text-sm font-medium text-muted-foreground transition hover:text-foreground"><ArrowLeft className="size-4" />all trips</Link>
    <section className={`overflow-hidden rounded-[2rem] border border-border/70 bg-gradient-to-br shadow-[0_30px_60px_-30px_rgba(15,23,42,0.35)] ${COMMUNITY_HERO}`}>
      <div className="grid gap-7 p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,0.85fr)] lg:items-center lg:gap-12 lg:p-10">
        <div><div className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium ${COMMUNITY_BADGE}`}><Compass className="size-3.5" />Learn before you go</div><div className="mt-5 flex items-center gap-4"><SportIconChip sport={guide.id === "winter" ? "ski" : guide.id} className="size-14 bg-background/70" iconClassName="size-8" /><h1 className="font-heading text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">{guide.label}</h1></div><p className="mt-4 text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">{guide.eyebrow}</p><p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">{guide.summary}</p><Link href={`/trips?sport=${tripQuery}`} className="mt-7 inline-flex items-center gap-2 rounded-full bg-orange-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-orange-800">Explore {guide.label} trips <ArrowRight className="size-4" /></Link></div>
        <div className="grid min-h-56 grid-cols-2 gap-3 sm:min-h-72">{media.length > 0 ? media.map((item, index) => <div key={item.src} className={`relative overflow-hidden rounded-[1.25rem] bg-muted ${index === 0 ? "row-span-2" : ""}`}><Image src={item.src} alt={item.alt} fill priority={index === 0} sizes="(max-width: 1024px) 45vw, 25vw" className="object-cover" /></div>) : <div className="col-span-2 flex flex-col items-center justify-center rounded-[1.5rem] border border-border/70 bg-background/55 p-6 text-center"><SportIconChip sport={guide.id === "winter" ? "ski" : guide.id} /><p className="mt-4 text-sm text-muted-foreground">Your next outdoor skill starts here.</p></div>}</div>
      </div>
    </section>

    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <section className="flex rounded-[2rem] border border-border/70 p-6 shadow-[0_30px_60px_-30px_rgba(15,23,42,0.2)] sm:p-8 lg:h-full lg:flex-col"><div className="lg:min-h-24"><p className="text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-muted-foreground">Choose your direction</p><h2 className="mt-3 font-heading text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">Ways to explore {guide.label.toLowerCase()}</h2></div><div className="mt-6 space-y-3 lg:flex lg:flex-1 lg:flex-col">{guide.types.map((type, index) => <article key={type.title} className={`flex items-start gap-3 rounded-2xl p-4 lg:flex-1 ${COMMUNITY_TILES[index]}`}><span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-background/70 text-xs font-bold text-foreground">{index + 1}</span><div><h3 className="font-heading text-base font-semibold text-foreground">{type.title}</h3><p className="mt-1 text-sm leading-5 text-muted-foreground">{type.description}</p></div></article>)}</div></section>
      <section className="flex rounded-[2rem] border border-border/70 p-6 shadow-[0_30px_60px_-30px_rgba(15,23,42,0.2)] sm:p-8 lg:h-full lg:flex-col"><div className="lg:min-h-24"><p className="text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-muted-foreground">A realistic progression</p><h2 className="mt-3 font-heading text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">How to get started</h2></div><ol className="mt-6 space-y-3 lg:flex lg:flex-1 lg:flex-col">{guide.timeline.filter((_, index) => index !== 2).map((step, index) => <li key={step.phase} className="flex items-start gap-3 rounded-2xl border border-border/70 bg-background p-4 lg:flex-1"><span className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-foreground ${COMMUNITY_TILES[index]}`}>{index + 1}</span><div><p className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{step.phase}</p><h3 className="mt-1 font-heading text-base font-semibold text-foreground">{step.title}</h3><p className="mt-1 text-sm leading-5 text-muted-foreground">{step.description}</p></div></li>)}</ol></section>
    </div>

    <section><div className="max-w-2xl"><p className="text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-muted-foreground">Keep it simple</p><h2 className="mt-3 font-heading text-3xl font-semibold tracking-tight text-foreground">Equipment, without the overwhelm</h2></div><div className="mt-7 grid gap-4 md:grid-cols-3"><ListCard title="Start with or rent" items={guide.startWith} icon={Backpack} className={COMMUNITY_TILES[0]} /><ListCard title="Add when committed" items={guide.addLater} icon={Dumbbell} className={COMMUNITY_TILES[1]} /><ListCard title="Your guide provides" items={guide.guideProvides} icon={ShieldCheck} className={COMMUNITY_TILES[2]} /></div></section>

    <section className="grid gap-4 lg:grid-cols-2"><ListCard title="Practise in your city" items={guide.cityIdeas} icon={MapPin} className={COMMUNITY_TILES[1]} /><ListCard title="Move safely" items={guide.safety} icon={Timer} className={COMMUNITY_TILES[2]} /></section>

    <section className="rounded-[2rem] border border-border/70 p-6 shadow-[0_30px_60px_-30px_rgba(15,23,42,0.2)] sm:p-8 lg:p-10"><div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-muted-foreground">On Radikal</p><h2 className="mt-3 font-heading text-3xl font-semibold tracking-tight text-foreground">Trips to put it into practice</h2></div><Link href={`/trips?sport=${tripQuery}`} className="inline-flex items-center gap-2 text-sm font-semibold text-foreground underline underline-offset-4">View all trips <ArrowRight className="size-4" /></Link></div>{trips.length > 0 ? <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{trips.map((trip) => <TripCard key={trip.id} trip={trip} size="compact" />)}</div> : <p className="mt-7 rounded-2xl border border-dashed border-border/80 bg-muted/30 p-6 text-sm leading-6 text-muted-foreground">New trips are being added. Use this guide to build skills, then check back for your next adventure.</p>}</section>
  </div></div>;
}

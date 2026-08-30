"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

export type FaqItem = {
  question: string;
  answer: string;
};

const DEFAULT_FAQ_ITEMS: FaqItem[] = [
  {
    question: "How do I book a trip?",
    answer:
      "Pick the trip and date that suits you, then hit “Book Your Spot” and follow the checkout flow. You’ll receive a booking summary with our bank details, and once your transfer reference is recorded your spot is reserved while we confirm payment.",
  },
  {
    question: "How do payments work?",
    answer:
      "We settle by bank transfer. After checkout you’ll get our account details; share your transaction reference on your booking and our team verifies it. Your booking is confirmed as soon as the payment is matched.",
  },
  {
    question: "What’s included in the price?",
    answer:
      "Certified guides, permits, and everything listed under “What’s included” on the trip page. Items marked “Not included” — like some meals or personal gear — are arranged by you.",
  },
  {
    question: "Do I need prior experience?",
    answer:
      "It depends on the trip. Courses and trips tagged “Beginner Friendly” are designed for first-timers, while summit expeditions and technical routes assume some background. Each trip page lists its difficulty so you can pick the right one.",
  },
  {
    question: "What fitness level do I need?",
    answer:
      "Most trips need a reasonable base level of fitness. Day hikes and retreats are accessible to almost everyone, while multi-day treks and summit climbs benefit from a few weeks of walking and endurance training beforehand.",
  },
  {
    question: "What’s your cancellation and refund policy?",
    answer:
      "Refunds depend on how far out you cancel. Reach out via support with your booking details and our team will walk you through the options — including moving your spot to another date where possible.",
  },
  {
    question: "Can I book a private or custom trip?",
    answer:
      "Yes. We run private departures for friends, families and corporate groups, and can tailor itineraries to your dates and pace. Use the “Private trip with your crew?” link on any trip page to start a conversation.",
  },
  {
    question: "How big are the groups?",
    answer:
      "We keep groups small on purpose — usually a handful of travellers plus your guide — so you get real time with the terrain, the locals and each other. The exact maximum is shown on each trip page.",
  },
];

function FaqItemRow({
  item,
  index,
  open,
  onToggle,
}: {
  item: FaqItem;
  index: number;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-emerald-50/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/30 dark:hover:bg-emerald-500/5 sm:px-6"
      >
        <span className="flex items-start gap-3">
          <span
            className={cn(
              "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors",
              open
                ? "bg-emerald-600 text-white"
                : "bg-black text-white dark:bg-white dark:text-black",
            )}
          >
            {index + 1}
          </span>
          <span className="text-sm font-medium text-foreground sm:text-base">{item.question}</span>
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
            open && "rotate-180 text-emerald-600",
          )}
        />
      </button>
      <div
        className={cn(
          "grid transition-all duration-200 ease-out",
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="overflow-hidden">
          <p className="px-5 pb-5 pl-14 text-sm leading-7 text-muted-foreground sm:px-6 sm:pl-14">
            {item.answer}
          </p>
        </div>
      </div>
    </li>
  );
}

export function FaqSection({
  items = DEFAULT_FAQ_ITEMS,
  title = "Frequently asked questions",
  subtitle = "Everything you need to know before you go. Still unsure? Reach out via support.",
}: {
  items?: FaqItem[];
  title?: string;
  subtitle?: string;
}) {
  const [openIndex, setOpenIndex] = useState<number>(0);

  return (
    <section className="mt-12">
      <div className="overflow-hidden rounded-[2rem] border border-border/70 bg-background/90 p-6 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.25)] sm:p-8 lg:p-10">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-3">

            <h2 className="font-heading text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              {title}
            </h2>
            <p className="text-sm leading-6 text-muted-foreground">{subtitle}</p>
          </div>

          <ul className="divide-y divide-border/60 rounded-[1.25rem] border border-border/60 bg-background/60">
            {items.map((item, index) => (
              <FaqItemRow
                key={item.question}
                item={item}
                index={index}
                open={openIndex === index}
                onToggle={() => setOpenIndex(openIndex === index ? -1 : index)}
              />
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
      "Certified local guides, permits, and everything listed under “What’s included” on the trip page. Items marked “Not included” — like travel insurance, some meals or personal gear — are arranged by you.",
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

function FaqItemRow({ item, index }: { item: FaqItem; index: number }) {
  const [open, setOpen] = useState(index === 0);

  return (
    <li className={cn("border-t border-border/60", index === 0 && "border-t-0")}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/30 sm:px-6"
      >
        <span className="text-sm font-medium text-foreground sm:text-base">{item.question}</span>
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
          <p className="px-5 pb-5 text-sm leading-7 text-muted-foreground sm:px-6">{item.answer}</p>
        </div>
      </div>
    </li>
  );
}

export function FaqSection({
  items = DEFAULT_FAQ_ITEMS,
  title = "Frequently asked questions",
}: {
  items?: FaqItem[];
  title?: string;
}) {
  return (
    <Card className="overflow-hidden rounded-[1.5rem] border-border/80 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.25)]">
      <CardHeader>
        <CardTitle className="text-2xl">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="divide-y divide-border/60 rounded-[1rem] border border-border/60 bg-background/60">
          {items.map((item, index) => (
            <FaqItemRow key={item.question} item={item} index={index} />
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

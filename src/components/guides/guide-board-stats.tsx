import { Compass, Globe, Ticket } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";

export async function GuideBoardStats({ guideId }: { guideId: string }) {
  const [
    confirmedBookings,
    completedBookings,
    confirmedTrips,
    completedTrips,
    liveTrips,
  ] = await Promise.all([
    prisma.booking.count({
      where: { trip: { guideId }, status: "CONFIRMED" },
    }),
    prisma.booking.count({
      where: { trip: { guideId }, status: "COMPLETED" },
    }),
    prisma.slot.count({
      where: { trip: { guideId }, bookings: { some: { status: "CONFIRMED" } } },
    }),
    prisma.slot.count({
      where: { trip: { guideId }, bookings: { some: { status: "COMPLETED" } } },
    }),
    prisma.trip.count(),
  ]);

  const stats = [
    {
      label: "Confirmed bookings",
      value: confirmedBookings,
      icon: Ticket,
      color: "text-emerald-600 dark:text-emerald-400",
    },
    {
      label: "Confirmed trips",
      value: confirmedTrips,
      icon: Compass,
      color: "text-emerald-600 dark:text-emerald-400",
    },
    {
      label: "Completed bookings",
      value: completedBookings,
      icon: Ticket,
      color: "text-orange-600 dark:text-orange-400",
    },
    {
      label: "Completed trips",
      value: completedTrips,
      icon: Compass,
      color: "text-orange-600 dark:text-orange-400",
    },
  ];

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap justify-end gap-2">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="flex items-center gap-2 rounded-2xl border border-border/70 bg-background/70 px-3 py-2"
            >
              <Icon className={cn("h-4 w-4", stat.color)} />
              <div className="text-left">
                <p className={cn("font-heading text-lg font-semibold leading-none", stat.color)}>
                  {stat.value}
                </p>
                <p className="mt-0.5 text-[0.6rem] font-semibold uppercase tracking-wider text-muted-foreground">
                  {stat.label}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-2 rounded-2xl border border-border/70 bg-background/70 px-3 py-2">
        <Globe className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        <div className="text-left">
          <p className="font-heading text-lg font-semibold leading-none text-blue-600 dark:text-blue-400">
            {liveTrips}
          </p>
          <p className="mt-0.5 text-[0.6rem] font-semibold uppercase tracking-wider text-muted-foreground">
            Live trips on platform
          </p>
        </div>
      </div>
    </div>
  );
}

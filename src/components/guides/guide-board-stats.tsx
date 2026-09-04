import { Compass, Globe, Ticket } from "lucide-react";

import { prisma, safeDb } from "@/lib/prisma";
import { cn } from "@/lib/utils";

type GuideStats = {
  confirmedBookings: number;
  completedBookings: number;
  confirmedTrips: number;
  completedTrips: number;
  liveTrips: number;
};

const emptyStats: GuideStats = {
  confirmedBookings: 0,
  completedBookings: 0,
  confirmedTrips: 0,
  completedTrips: 0,
  liveTrips: 0,
};

export async function GuideBoardStats({ guideId }: { guideId: string }) {
  const stats = await safeDb(
    "guide.board-stats",
    async () => {
      const rows = await prisma.$queryRaw<GuideStats[]>`
        SELECT
          COUNT(*) FILTER (WHERE b.status = 'CONFIRMED' AND b."deletedAt" IS NULL)::int AS "confirmedBookings",
          COUNT(*) FILTER (WHERE b.status = 'COMPLETED' AND b."deletedAt" IS NULL)::int AS "completedBookings",
          COUNT(DISTINCT t.id) FILTER (
            WHERE b.status = 'CONFIRMED' AND b."deletedAt" IS NULL
          )::int AS "confirmedTrips",
          COUNT(DISTINCT t.id) FILTER (
            WHERE b.status = 'COMPLETED' AND b."deletedAt" IS NULL
          )::int AS "completedTrips",
          COUNT(DISTINCT t.id)::int AS "liveTrips"
        FROM "trips" t
        LEFT JOIN "bookings" b ON b."tripId" = t.id
        WHERE t."guideId" = ${guideId} AND t."deletedAt" IS NULL
      `;
      return rows[0] ?? emptyStats;
    },
    emptyStats,
  );

  const { confirmedBookings, completedBookings, confirmedTrips, completedTrips, liveTrips } = stats;

  const statCards = [
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
    {
      label: "Live trips",
      value: liveTrips,
      icon: Globe,
      color: "text-blue-600 dark:text-blue-400",
    },
  ];

  const cardClass =
    "flex min-w-0 items-center gap-2 rounded-xl border border-border/70 bg-background/70 px-2.5 py-2 lg:w-44 lg:px-3";

  return (
    <div className="grid grid-cols-2 gap-2 lg:w-[360px]">
      {statCards.map((stat) => {
        const Icon = stat.icon;
        return (
          <div key={stat.label} className={cardClass}>
            <Icon className={cn("h-4 w-4 shrink-0", stat.color)} />
            <div className="min-w-0 text-left">
              <p className={cn("font-heading text-lg font-semibold leading-none", stat.color)}>{stat.value}</p>
              <p className="mt-0.5 truncate text-[0.6rem] font-semibold uppercase tracking-wider text-muted-foreground">
                {stat.label}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

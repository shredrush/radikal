"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import {
  CalendarDays,
  ChevronDown,
  ClipboardList,
  Clock,
  MapPin,
  Search,
  Users,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { getProfileInitials } from "@/lib/profile-initials";
import { FORM_FIELD_BORDER } from "@/lib/boundary-styles";
import type {
  BookingBoardClient,
  BookingBoardItem,
  BookingStatus,
} from "@/lib/bookings";
import { AdminBookingActions } from "@/components/admin/admin-booking-actions";
import {
  GuideSlotCancelBar,
  GuideSlotCancelButton,
} from "@/components/guides/guide-slot-cancel";

type SlotGroup = {
  slotId: string;
  slotLabel: string;
  slotSort: number;
  totalParticipants: number;
  reserved: number;
  cancellationReason: string | null;
  cancelledByText: string | null;
  cancelledAt: string | null;
  clients: BookingBoardClient[];
};

type TripGroup = {
  tripId: string;
  slug: string;
  title: string;
  location: string;
  image: string;
  durationDays: number;
  slots: SlotGroup[];
};

type BookingSectionKey = BookingStatus | "DELETED";

const SECTIONS: { key: BookingSectionKey; label: string }[] = [
  { key: "PENDING", label: "Pending" },
  { key: "CONFIRMED", label: "Confirmed" },
  { key: "COMPLETED", label: "Completed" },
  { key: "CANCELLED", label: "Cancelled" },
  { key: "DELETED", label: "Deleted" },
];

const STATUS_DOT: Record<BookingSectionKey, string> = {
  CONFIRMED: "bg-emerald-500",
  PENDING: "bg-amber-500",
  COMPLETED: "bg-sky-500",
  CANCELLED: "bg-rose-500",
  DELETED: "bg-zinc-500",
};

function groupByTripAndSlot(items: BookingBoardItem[]): TripGroup[] {
  const tripMap = new Map<string, TripGroup>();

  for (const item of items) {
    let trip = tripMap.get(item.tripId);
    if (!trip) {
      trip = {
        tripId: item.tripId,
        slug: item.slug,
        title: item.title,
        location: item.location,
        image: item.image,
        durationDays: item.durationDays,
        slots: [],
      };
      tripMap.set(item.tripId, trip);
    }

    let slot = trip.slots.find((candidate) => candidate.slotId === item.slotId);
    if (!slot) {
      slot = {
        slotId: item.slotId,
        slotLabel: item.slotLabel,
        slotSort: item.slotSort,
        totalParticipants: 0,
        reserved: item.reserved ?? 0,
        cancellationReason: item.cancellationReason,
        cancelledByText: item.cancelledByText,
        cancelledAt: item.cancelledAt,
        clients: [],
      };
      trip.slots.push(slot);
    } else {
      slot.reserved = Math.max(slot.reserved, item.reserved ?? 0);
      slot.cancellationReason = slot.cancellationReason ?? item.cancellationReason;
      slot.cancelledByText = slot.cancelledByText ?? item.cancelledByText;
      slot.cancelledAt = slot.cancelledAt ?? item.cancelledAt;
    }

    slot.totalParticipants += item.participantCount;
    if (!item.isCancelledSlot) {
      slot.clients.push({
        bookingId: item.bookingId,
        status: item.status,
        name: item.customer.name,
        username: item.customer.username,
        email: item.customer.email,
        image: item.customer.image,
        participantCount: item.participantCount,
        totalPriceRupees: item.totalPriceRupees,
        paymentTransactionId: item.paymentTransactionId,
        bookedAt: item.bookedAt,
        cancelledAt: item.cancelledAt,
        deletedByText: item.deletedByText,
        deletedAt: item.deletedAt,
      });
    }
  }

  return Array.from(tripMap.values())
    .map((trip) => ({
      ...trip,
      slots: trip.slots
        .slice()
        .sort((a, b) => a.slotSort - b.slotSort)
        .map((slot) => ({
          ...slot,
          clients: slot.clients.slice().sort((a, b) => a.name.localeCompare(b.name)),
        })),
    }))
    .sort((a, b) => a.title.localeCompare(b.title));
}

/**
 * Shared bookings board used by the guide board and the admin booking view so
 * both render the same design from the same data shape. `slotCancel` enables
 * the guide's slot-level cancellation flow; `adminActions` places
 * per-booking confirm-payment / cancel buttons on the right of each guest row.
 */
export function BookingsBoard({
  items,
  slotCancel = false,
  adminActions = null,
  hideDeletedSection = false,
}: {
  items: BookingBoardItem[];
  slotCancel?: boolean;
  adminActions?: { canConfirm: boolean; canCancel: boolean } | null;
  hideDeletedSection?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [cancelSlotId, setCancelSlotId] = useState<string | null>(null);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    CONFIRMED: true,
    PENDING: true,
    COMPLETED: false,
    CANCELLED: false,
    DELETED: false,
  });

  const normalizedQuery = query.trim().toLowerCase();

  const sections = useMemo(() => {
    const filtered = normalizedQuery
      ? items.filter((item) => item.title.toLowerCase().includes(normalizedQuery))
      : items;

    return SECTIONS.filter((section) => !(hideDeletedSection && section.key === "DELETED")).map(
      (section) => ({
        ...section,
        trips: groupByTripAndSlot(
          filtered.filter((item) =>
            section.key === "DELETED"
              ? Boolean(item.deletedAt)
              : !item.deletedAt && item.status === section.key,
          ),
        ),
      }),
    );
  }, [items, normalizedQuery, hideDeletedSection]);

  const totalTrips = sections.reduce((sum, section) => sum + section.trips.length, 0);

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-[1.2rem] border border-dashed border-border/80 bg-muted/20 px-6 py-10 text-center">
        <ClipboardList className="h-8 w-8 text-muted-foreground/50" />
        <div>
          <p className="font-medium text-foreground">No bookings yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            When travellers reserve a trip, it will show up here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Filter by trip name"
          className={`flex h-10 w-full rounded-xl border ${FORM_FIELD_BORDER} bg-background/80 pl-9 pr-3 text-sm shadow-sm outline-none transition focus:border-ring focus-visible:ring-2 focus-visible:ring-ring/30`}
        />
      </div>

      {totalTrips === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-[1.2rem] border border-dashed border-border/80 bg-muted/20 px-6 py-10 text-center">
          <ClipboardList className="h-8 w-8 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">
            No bookings match this trip name.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {sections.map((section) => {
            const open = openSections[section.key] ?? true;
            return (
              <section
                key={section.key}
                className="overflow-hidden rounded-[1.25rem] border border-border/70 bg-background/60 dark:bg-muted/10"
              >
                <button
                  type="button"
                  onClick={() =>
                    setOpenSections((prev) => ({
                      ...prev,
                      [section.key]: !open,
                    }))
                  }
                  aria-expanded={open}
                  className="flex w-full items-center justify-between gap-4 border-b border-border/70 bg-muted/20 px-4 py-3 text-left transition-colors hover:bg-muted/40 dark:bg-muted/40"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={cn("h-2.5 w-2.5 rounded-full", STATUS_DOT[section.key])}
                    />
                    <span className="font-heading text-base font-semibold text-foreground">
                      {section.label}
                    </span>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                      {section.trips.reduce(
                        (sum, trip) => sum + trip.slots.length,
                        0,
                      )}
                    </span>
                  </div>
                  <ChevronDown
                    className={cn(
                      "h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200",
                      open && "rotate-180",
                    )}
                  />
                </button>

                {open ? (
                  <div className="p-4">
                    {section.trips.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No {section.label.toLowerCase()} bookings.
                      </p>
                    ) : (
                      <ul className="flex flex-col gap-4">
                        {section.trips.map((trip) => (
                          <li
                            key={trip.tripId}
                            className="overflow-hidden rounded-[1.25rem] border border-border/70 bg-background/70"
                          >
                            <div className="flex items-center gap-4 p-4">
                              <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-lg bg-muted/60">
                                <Image
                                  src={trip.image}
                                  alt={trip.title}
                                  fill
                                  className="object-cover"
                                  sizes="96px"
                                />
                              </div>
                              <div className="min-w-0">
                                <p className="font-heading text-base font-semibold leading-snug text-foreground">
                                  {trip.title}
                                </p>
                                <p className="mt-0.5 flex items-center gap-1 text-sm text-muted-foreground">
                                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                                  <span className="truncate">{trip.location}</span>
                                </p>
                              </div>
                            </div>

                            <ul className="space-y-3 border-t border-border/60 p-4">
                              {trip.slots.map((slot) => (
                                <li
                                  key={slot.slotId}
                                  className="overflow-hidden rounded-xl border border-border/60 bg-muted/10 dark:bg-muted/20"
                                >
                                  <div className="flex flex-wrap items-center justify-between gap-3 bg-muted/30 px-3 py-2 dark:bg-muted/40">
                                    <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-orange-600 dark:text-orange-400">
                                      <CalendarDays className="h-4 w-4 text-orange-500" />
                                      {slot.slotLabel}
                                    </span>
                                    <div className="flex items-center gap-2">
                                      {slot.clients.length === 0 && slot.reserved > 0 ? (
                                        <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-amber-600 dark:text-amber-400">
                                          <Users className="h-3.5 w-3.5 text-amber-500" />
                                          {slot.reserved} {slot.reserved === 1 ? "spot" : "spots"} reserved
                                        </span>
                                      ) : (
                                        <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                                          <Users className="h-3.5 w-3.5 text-emerald-500" />
                                          {slot.totalParticipants}{" "}
                                          {slot.totalParticipants === 1 ? "participant" : "participants"}
                                        </span>
                                      )}
                                      {section.key !== "CANCELLED" &&
                                        section.key !== "COMPLETED" &&
                                        slotCancel ? (
                                          <GuideSlotCancelButton
                                            onOpen={() =>
                                              setCancelSlotId(slot.slotId)
                                            }
                                          />
                                        ) : null}
                                    </div>
                                  </div>

                                  {cancelSlotId === slot.slotId &&
                                    section.key !== "CANCELLED" &&
                                    section.key !== "COMPLETED" &&
                                    slotCancel ? (
                                      <div className="px-3 py-2">
                                        <GuideSlotCancelBar
                                          slotId={slot.slotId}
                                          onClose={() => setCancelSlotId(null)}
                                        />
                                      </div>
                                    ) : null}

                                  {slot.cancellationReason ? (
                                    <div className="border-t border-border/50 bg-rose-500/5 px-3 py-2 text-xs leading-relaxed text-rose-600 dark:text-rose-400">
                                      <span className="font-semibold">
                                        Cancelled
                                        {slot.cancelledByText
                                          ? ` by ${slot.cancelledByText}`
                                          : ""}
                                        {slot.cancelledAt ? ` on ${slot.cancelledAt}` : ""}
                                        :{" "}
                                      </span>
                                      {slot.cancellationReason}
                                    </div>
                                  ) : null}

                                  <ul className="divide-y divide-border/50">
                                    {slot.clients.map((client, index) => (
                                      <li
                                        key={client.bookingId ?? `${slot.slotId}-${index}`}
                                        className="flex flex-wrap items-center gap-3 px-3 py-2"
                                      >
                                        <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full bg-muted/60 ring-1 ring-border/60">
                                          {client.image ? (
                                            <Image
                                              src={client.image}
                                              alt={client.name}
                                              fill
                                              className="object-cover"
                                              sizes="32px"
                                            />
                                          ) : (
                                            <span className="flex h-full w-full items-center justify-center text-xs font-semibold text-muted-foreground">
                                              {getProfileInitials(client.name)}
                                            </span>
                                          )}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                          <p className="truncate text-sm font-medium text-foreground">
                                            {client.name}
                                          </p>
                                          <p className="truncate text-xs text-muted-foreground">
                                            {client.username
                                              ? `@${client.username}`
                                              : client.email}
                                          </p>
                                        </div>
                                        <span className="inline-flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                                          <Clock className="h-3.5 w-3.5" />
                                          {client.bookedAt}
                                        </span>
                                        {section.key === "DELETED" && client.deletedAt ? (
                                          <span className="inline-flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                                            <Clock className="h-3.5 w-3.5" />
                                            Deleted{client.deletedByText ? ` by ${client.deletedByText}` : ""} on {client.deletedAt}
                                          </span>
                                        ) : null}
                                        {section.key === "CANCELLED" && client.cancelledAt ? (
                                          <span className="inline-flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                                            <Clock className="h-3.5 w-3.5" />
                                            Cancelled {client.cancelledAt}
                                          </span>
                                        ) : null}
                                        <span className="shrink-0 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                                          {client.participantCount}{" "}
                                          {client.participantCount === 1 ? "guest" : "guests"}
                                        </span>
                                        {adminActions && client.bookingId ? (
                                          <span className="flex shrink-0 items-center gap-2">
                                            <AdminBookingActions
                                              bookingId={client.bookingId}
                                              status={client.status}
                                              canConfirm={adminActions.canConfirm}
                                              canCancel={adminActions.canCancel}
                                            />
                                          </span>
                                        ) : null}
                                      </li>
                                    ))}
                                  </ul>
                                </li>
                              ))}
                            </ul>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ) : null}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

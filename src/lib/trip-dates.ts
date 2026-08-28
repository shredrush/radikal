// `Intl.DateTimeFormat` construction is comparatively expensive; reuse a single
// module-level formatter instead of allocating one per call (these helpers are
// called once per trip in list views).
const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export function getTripDateRange(startDate: Date | string, durationDays: number) {
  const start = new Date(startDate);
  const end = new Date(start);
  end.setDate(start.getDate() + Math.max(0, durationDays - 1));

  return { startDate: start, endDate: end };
}

export function formatTripDateRange(startDate: Date | string, durationDays: number) {
  const { startDate: start, endDate: end } = getTripDateRange(startDate, durationDays);

  if (durationDays <= 1) {
    return dateFormatter.format(start);
  }

  return `${dateFormatter.format(start)} – ${dateFormatter.format(end)}`;
}

/**
 * A slot is "completed" once its departure date has passed — the trip has
 * started and can no longer be booked. Used to separate upcoming dates from
 * completed ones on the trip page.
 */
export function isSlotCompleted(slotDate: Date | string, now = new Date()): boolean {
  return new Date(slotDate) < now;
}

/**
 * A trip is "completed" once its final day has passed — the whole itinerary
 * (including multi-day trips) is over. Used to mark past bookings as completed
 * on the profile page.
 */
export function isTripCompleted(
  startDate: Date | string,
  durationDays: number,
  now = new Date(),
): boolean {
  const { endDate } = getTripDateRange(startDate, durationDays);
  return endDate < now;
}

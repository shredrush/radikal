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

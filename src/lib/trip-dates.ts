export function getTripDateRange(startDate: Date | string, durationDays: number) {
  const start = new Date(startDate);
  const end = new Date(start);
  end.setDate(start.getDate() + Math.max(0, durationDays - 1));

  return { startDate: start, endDate: end };
}

export function formatTripDateRange(startDate: Date | string, durationDays: number) {
  const { startDate: start, endDate: end } = getTripDateRange(startDate, durationDays);

  const formatter = new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  if (durationDays <= 1) {
    return formatter.format(start);
  }

  return `${formatter.format(start)} – ${formatter.format(end)}`;
}

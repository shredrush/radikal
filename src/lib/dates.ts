/**
 * Start of today at midnight IST (UTC+5:30) as an absolute Date. Slot dates are
 * stored at 12:00 UTC of their calendar day; comparing against IST midnight
 * keeps the "today or future" rule aligned with the user's timezone.
 */
export function startOfTodayIST(): Date {
  const now = new Date();
  // Shift the current instant into IST, read its calendar date, then build the
  // UTC Date corresponding to that date's 00:00 IST.
  const istOffsetMs = 5.5 * 60 * 60 * 1000;
  const istNow = new Date(now.getTime() + istOffsetMs);
  return new Date(
    Date.UTC(
      istNow.getUTCFullYear(),
      istNow.getUTCMonth(),
      istNow.getUTCDate(),
    ) - istOffsetMs,
  );
}

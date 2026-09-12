/**
 * Shared presentation helpers for activity-log entries.
 *
 * Kept free of server-only imports so both the admin user log and the guide
 * board log can render the same action badges from one source of truth.
 */

export const ADMIN_USER_ACTIVITY_PAGE_SIZE = 10;

export function activityBadgeClass(action: string) {
  if (
    action.startsWith("LOGIN") ||
    action === "ACCOUNT_CREATED" ||
    action.startsWith("PASSWORD") ||
    action === "USERNAME_CHANGED" ||
    action === "EMAIL_CHANGED" ||
    action === "PHONE_CHANGED"
  ) {
    return "border-blue-500/40 bg-blue-500/10 text-blue-600";
  }
  if (action.startsWith("BOOKING") || action.startsWith("PAYMENT")) {
    return "border-emerald-500/40 bg-emerald-500/10 text-emerald-600";
  }
  if (action.startsWith("GUIDE")) {
    return "border-violet-500/40 bg-violet-500/10 text-violet-600";
  }
  if (action.startsWith("SUPPORT")) {
    return "border-amber-500/40 bg-amber-500/10 text-amber-600";
  }
  if (action.startsWith("USER_ROLE") || action.startsWith("USER_PROFILE")) {
    return "border-destructive/40 bg-destructive/10 text-destructive";
  }
  if (action.startsWith("SLOT")) {
    return "border-orange-500/40 bg-orange-500/10 text-orange-600";
  }
  if (action.startsWith("TRIP_CHANGE")) {
    return "border-blue-500/40 bg-blue-500/10 text-blue-600";
  }
  if (action === "TRIP_DELETED") {
    return "border-destructive/40 bg-destructive/10 text-destructive";
  }
  return "border-border/70 bg-background/80 text-muted-foreground";
}

export function formatActivityAction(action: string) {
  return action.toLowerCase().replace(/_/g, " ");
}

import { ACTIVITY_TYPE_LABELS } from "@/lib/trip-metadata";
import { formatShortDate } from "@/lib/format";

export function sportLabel(value: string) {
  return ACTIVITY_TYPE_LABELS[value] ?? value;
}

export const CUSTOM_TRIP_GROUP_LABELS: Record<string, string> = {
  PRIVATE: "Private group",
  CORPORATE: "Corporate",
};

export const CUSTOM_TRIP_STATUS_LABELS: Record<string, string> = {
  NEW: "New",
  IN_REVIEW: "In review",
  QUOTED: "Quoted",
  CONFIRMED: "Confirmed",
  CANCELLED: "Cancelled",
};

export const CUSTOM_TRIP_STATUS_STYLES: Record<string, string> = {
  NEW: "border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-400",
  IN_REVIEW: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  QUOTED: "border-violet-500/40 bg-violet-500/10 text-violet-700 dark:text-violet-400",
  CONFIRMED: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  CANCELLED: "border-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-rose-400",
};

export type CustomTripMessageView = {
  id: string;
  body: string;
  isMine: boolean;
  createdAt: string;
};

export type CustomTripRequestListItem = {
  id: string;
  status: string;
  groupType: string;
  sports: string[];
  location: string;
  startDate: string;
  endDate: string;
  participantCount: number;
  budgetRupees: number | null;
  requirements: string | null;
  createdAt: string;
  updatedAt: string;
  customer: {
    name: string;
    username: string | null;
    email: string;
  };
  lastMessageSenderId: string | null;
  lastMessageBody: string | null;
};

export type CustomTripRequestDetail = CustomTripRequestListItem & {
  messages: CustomTripMessageView[];
};

export function formatCustomTripDateRange(startDate: string | Date, endDate: string | Date) {
  const start = formatShortDate(startDate);
  const end = formatShortDate(endDate);

  if (start === end) {
    return start;
  }

  return `${start} – ${end}`;
}

/**
 * Convert Prisma custom trip messages into a serializable shape that can be
 * passed from a server component to a client component (Date objects don't
 * survive the RSC boundary).
 */
export function toCustomTripMessageViews(
  messages: Array<{ id: string; body: string; senderId: string; createdAt: Date }>,
  currentUserId: string,
): CustomTripMessageView[] {
  return messages.map((message) => ({
    id: message.id,
    body: message.body,
    isMine: message.senderId === currentUserId,
    createdAt: message.createdAt.toISOString(),
  }));
}

/**
 * Convert a Prisma CustomTripRequest (with its customer + latest message) into
 * a serializable shape for the support dashboard and profile lists.
 */
export function toCustomTripRequestListItem(request: {
  id: string;
  status: string;
  groupType: string;
  sports: string[];
  location: string;
  startDate: Date;
  endDate: Date;
  participantCount: number;
  budgetRupees: number | null;
  requirements: string | null;
  createdAt: Date;
  updatedAt: Date;
  user: { id: string; name: string | null; email: string; username: string | null };
  chat: { messages: Array<{ senderId: string; body: string }> } | null;
}): CustomTripRequestListItem {
  const lastMessage = request.chat?.messages[0];

  return {
    id: request.id,
    status: request.status,
    groupType: request.groupType,
    sports: request.sports,
    location: request.location,
    startDate: request.startDate.toISOString(),
    endDate: request.endDate.toISOString(),
    participantCount: request.participantCount,
    budgetRupees: request.budgetRupees,
    requirements: request.requirements,
    createdAt: request.createdAt.toISOString(),
    updatedAt: request.updatedAt.toISOString(),
    customer: {
      name: request.user.name || request.user.email,
      username: request.user.username,
      email: request.user.email,
    },
    lastMessageSenderId: lastMessage?.senderId ?? null,
    lastMessageBody: lastMessage?.body ?? null,
  };
}

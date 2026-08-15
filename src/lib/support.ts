import { formatTripDateRange } from "@/lib/trip-dates";

export type SupportMessageView = {
  id: string;
  body: string;
  isMine: boolean;
  createdAt: string;
};

export type SupportBookingListItem = {
  id: string;
  status: "PENDING" | "CONFIRMED" | "CANCELLED";
  title: string;
  location: string;
  travellerName: string;
  travellerEmail: string;
  dateRange: string;
  participantCount: number;
  totalPriceRupees: number;
  cancelledByName: string | null;
  cancelledByRole: string | null;
  bookedAt: string;
};

/**
 * Convert a Prisma booking (with its traveller, trip, slot and canceller) into
 * a serializable shape for the support dashboard's bookings view.
 */
export function toSupportBookingListItem(booking: {
  id: string;
  status: "PENDING" | "CONFIRMED" | "CANCELLED";
  totalPriceRupees: number;
  participantCount: number;
  createdAt: Date;
  cancelledByRole: string | null;
  activity: { title: string; location: string; durationDays: number };
  slot: { date: Date };
  user: { name: string | null; email: string };
  cancelledBy: { name: string | null } | null;
}): SupportBookingListItem {
  return {
    id: booking.id,
    status: booking.status,
    title: booking.activity.title,
    location: booking.activity.location,
    travellerName: booking.user.name || booking.user.email,
    travellerEmail: booking.user.email,
    dateRange: formatTripDateRange(booking.slot.date, booking.activity.durationDays),
    participantCount: booking.participantCount,
    totalPriceRupees: booking.totalPriceRupees,
    cancelledByName: booking.cancelledBy?.name ?? null,
    cancelledByRole: booking.cancelledByRole ?? null,
    bookedAt: booking.createdAt.toISOString(),
  };
}

/**
 * Convert Prisma support messages into a serializable shape that can be passed
 * from a server component to a client component (Date objects don't survive
 * the RSC boundary).
 */
export function toSupportMessageViews(
  messages: Array<{ id: string; body: string; senderId: string; createdAt: Date }>,
  currentUserId: string,
): SupportMessageView[] {
  return messages.map((message) => ({
    id: message.id,
    body: message.body,
    isMine: message.senderId === currentUserId,
    createdAt: message.createdAt.toISOString(),
  }));
}

export function formatSupportMessageTime(iso: string) {
  const date = new Date(iso);
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export type SupportChatListItem = {
  id: string;
  status: "OPEN" | "CLOSED";
  updatedAt: string;
  userId: string;
  userName: string;
  userEmail: string;
  lastMessageSenderId: string | null;
  lastMessageBody: string | null;
};

/**
 * Convert a Prisma SupportChat (with its user + latest message) into a
 * serializable shape for the support dashboard. Dates are serialized to ISO
 * strings because they don't survive the RSC boundary.
 */
export function toSupportChatListItem(chat: {
  id: string;
  status: "OPEN" | "CLOSED";
  updatedAt: Date;
  user: { id: string; name: string | null; email: string };
  messages: Array<{ senderId: string; body: string }>;
}): SupportChatListItem {
  const lastMessage = chat.messages[0];
  return {
    id: chat.id,
    status: chat.status,
    updatedAt: chat.updatedAt.toISOString(),
    userId: chat.user.id,
    userName: chat.user.name || chat.user.email,
    userEmail: chat.user.email,
    lastMessageSenderId: lastMessage?.senderId ?? null,
    lastMessageBody: lastMessage?.body ?? null,
  };
}

/**
 * Count support-agent replies the customer has not read yet. A message counts
 * as unread when it was sent by someone other than the customer after the
 * customer last viewed the thread.
 */
export function countUnreadSupportMessages(
  chat: {
    createdAt: Date;
    customerLastReadAt: Date | null;
    messages: Array<{ senderId: string; createdAt: Date }>;
  },
  currentUserId: string,
): number {
  const lastReadAt = chat.customerLastReadAt ?? chat.createdAt;
  return chat.messages.filter(
    (message) => message.senderId !== currentUserId && message.createdAt > lastReadAt,
  ).length;
}

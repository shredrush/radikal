import { formatTripDateRange } from "@/lib/trip-dates";
import { getTripCardImage } from "@/lib/trip-card-image";

export type SupportMessageView = {
  id: string;
  body: string;
  isMine: boolean;
  createdAt: string;
};

export type SupportBookingListItem = {
  id: string;
  status: "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED";
  tripSlug: string;
  title: string;
  location: string;
  image: string;
  dateRange: string;
  participantCount: number;
  totalPriceRupees: number;
  paymentTransactionId: string | null;
  bookedAt: string;
  cancelledByName: string | null;
  cancelledByRole: string | null;
  cancellationReason: string | null;
  customer: {
    name: string;
    username: string | null;
    email: string;
  };
};

/**
 * Convert a Prisma booking (with its traveller, trip, slot and canceller) into
 * a serializable shape for the support board's bookings view.
 */
export function toSupportBookingListItem(booking: {
  id: string;
  status: "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED";
  totalPriceRupees: number;
  participantCount: number;
  paymentTransactionId: string | null;
  createdAt: Date;
  cancelledByRole: string | null;
  cancellationReason: string | null;
  trip: {
    slug: string;
    title: string;
    location: string;
    durationDays: number;
    description: string;
    categories: string[];
    images?: string[];
    type?: string;
  };
  slot: { date: Date };
  user: { name: string | null; email: string; username: string | null };
  cancelledBy: { name: string | null } | null;
}): SupportBookingListItem {
  // The status is read straight from the DB: past CONFIRMED bookings are
  // persisted as COMPLETED by lib/booking-completion.ts before the list is read.
  return {
    id: booking.id,
    status: booking.status,
    tripSlug: booking.trip.slug,
    title: booking.trip.title,
    location: booking.trip.location,
    image: getTripCardImage(booking.trip),
    dateRange: formatTripDateRange(booking.slot.date, booking.trip.durationDays),
    participantCount: booking.participantCount,
    totalPriceRupees: booking.totalPriceRupees,
    paymentTransactionId: booking.paymentTransactionId,
    bookedAt: booking.createdAt.toISOString(),
    cancelledByName: booking.cancelledBy?.name ?? null,
    cancelledByRole: booking.cancelledByRole ?? null,
    cancellationReason: booking.cancellationReason ?? null,
    customer: {
      name: booking.user.name || booking.user.email,
      username: booking.user.username,
      email: booking.user.email,
    },
  };
}

function roleLabel(role: string | null) {
  switch (role) {
    case "GUIDE":
      return "guide";
    case "ADMIN":
    case "ADMAX":
      return "admin";
    case "SUPPORT":
      return "support";
    case "FINANCE":
      return "finance";
    case "CONTENT":
      return "content";
    case "USER":
      return "traveller";
    default:
      return null;
  }
}

export function formatCancelledBy(
  name: string | null,
  role: string | null,
): string | null {
  if (!name) return null;
  const roleText = roleLabel(role);
  return roleText ? `${name} (${roleText})` : name;
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
 * serializable shape for the support board. Dates are serialized to ISO
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

export type SupportMessageView = {
  id: string;
  body: string;
  isMine: boolean;
  createdAt: string;
};

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
  deletedAt: string | null;
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
  deletedAt: Date | null;
  user: { id: string; name: string | null; email: string };
  messages: Array<{ senderId: string; body: string }>;
}): SupportChatListItem {
  const lastMessage = chat.messages[0];
  return {
    id: chat.id,
    status: chat.status,
    updatedAt: chat.updatedAt.toISOString(),
    deletedAt: chat.deletedAt ? chat.deletedAt.toISOString() : null,
    userId: chat.user.id,
    userName: chat.user.name || chat.user.email,
    userEmail: chat.user.email,
    lastMessageSenderId: lastMessage?.senderId ?? null,
    lastMessageBody: lastMessage?.body ?? null,
  };
}

/**
 * True when a support chat is awaiting an agent reply: the thread is OPEN and
 * the latest message was written by the customer. Single source of truth for
 * the "awaiting reply" badge and the SQL count on the support board.
 */
export function isAwaitingReply(chat: {
  status: "OPEN" | "CLOSED";
  userId: string;
  lastMessageSenderId: string | null;
}): boolean {
  return (
    chat.status === "OPEN" &&
    chat.lastMessageSenderId != null &&
    chat.lastMessageSenderId === chat.userId
  );
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

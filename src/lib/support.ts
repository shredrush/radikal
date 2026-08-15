export type SupportMessageView = {
  id: string;
  body: string;
  isMine: boolean;
  createdAt: string;
};

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

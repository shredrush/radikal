import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/authz";
import { SupportWidgetClient } from "@/components/support/support-widget-client";

/**
 * Floating support launcher rendered on every page. It reads the current
 * session and the customer's existing support thread (if any) so the chat
 * panel reflects the correct open/closed state and unread badge.
 */
export async function SupportWidget() {
  const session = await auth();

  if (!session?.user) {
    return <SupportWidgetClient isAuthenticated={false} messages={[]} status="OPEN" unreadCount={0} />;
  }

  const isSupportAgent = hasPermission(session.user.role, "support.manage");

  let status: "OPEN" | "CLOSED" = "OPEN";
  let unreadCount = 0;
  let hasActiveChat = false;

  if (!isSupportAgent) {
    // Lightweight read: only the status + last-read timestamp are needed to
    // render the launcher badge. The full message thread is loaded lazily by
    // the chat panel only when the customer opens it (see /api/support/messages),
    // so we avoid pulling every support message on every page render.
    const supportChat = await prisma.supportChat.findUnique({
      where: { userId: session.user.id },
      select: { id: true, status: true, createdAt: true, customerLastReadAt: true },
    });

    if (supportChat) {
      hasActiveChat = true;
      status = supportChat.status;
      const lastReadAt = supportChat.customerLastReadAt ?? supportChat.createdAt;
      unreadCount = await prisma.supportMessage.count({
        where: {
          chatId: supportChat.id,
          senderId: { not: session.user.id },
          createdAt: { gt: lastReadAt },
        },
      });
    }
  }

  return (
    <SupportWidgetClient
      isAuthenticated
      isSupportAgent={isSupportAgent}
      hasActiveChat={hasActiveChat}
      messages={[]}
      status={status}
      unreadCount={unreadCount}
    />
  );
}

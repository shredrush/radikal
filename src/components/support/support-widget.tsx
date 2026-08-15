import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isSupportAgent as isSupportAgentRole } from "@/lib/authz";
import {
  countUnreadSupportMessages,
  toSupportMessageViews,
  type SupportMessageView,
} from "@/lib/support";
import { SupportWidgetClient } from "@/components/support/support-widget-client";

/**
 * Floating support launcher rendered on every page. It reads the current
 * session and the customer's existing support thread (if any) so the chat
 * panel opens pre-populated and reflects the correct open/closed state.
 */
export async function SupportWidget() {
  const session = await auth();

  if (!session?.user) {
    return <SupportWidgetClient isAuthenticated={false} messages={[]} status="OPEN" unreadCount={0} />;
  }

  const isSupportAgent = isSupportAgentRole(session.user.role);

  let messages: SupportMessageView[] = [];
  let status: "OPEN" | "CLOSED" = "OPEN";
  let unreadCount = 0;

  if (!isSupportAgent) {
    const supportChat = await prisma.supportChat.findUnique({
      where: { userId: session.user.id },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });

    if (supportChat) {
      messages = toSupportMessageViews(supportChat.messages, session.user.id);
      status = supportChat.status;
      unreadCount = countUnreadSupportMessages(supportChat, session.user.id);
    }
  }

  return (
    <SupportWidgetClient
      isAuthenticated
      isSupportAgent={isSupportAgent}
      messages={messages}
      status={status}
      unreadCount={unreadCount}
    />
  );
}

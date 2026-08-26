import { prisma } from "@/lib/prisma";
import { hasPermission, requirePermission } from "@/lib/authz";
import { getSupportBookings } from "@/lib/support-bookings";
import {
  toSupportChatListItem,
  toSupportMessageViews,
} from "@/lib/support";
import {
  toCustomTripMessageViews,
  toCustomTripRequestListItem,
  type CustomTripRequestDetail,
} from "@/lib/custom-trips";
import {
  SupportDashboard,
  type SupportDashboardSelectedChat,
} from "@/components/support/support-dashboard";

export const dynamic = "force-dynamic";

export default async function SupportDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ chat?: string; tab?: string; request?: string }>;
}) {
  const session = await requirePermission("support.manage", "/login?callbackUrl=/support");

  const { chat: chatId, tab, request: requestId } = await searchParams;

  const chats = await prisma.supportChat.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      user: { select: { id: true, name: true, email: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  const bookings = await getSupportBookings();

  const customRequests = await prisma.customTripRequest.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      user: { select: { id: true, name: true, email: true, username: true } },
      chat: { include: { messages: { orderBy: { createdAt: "desc" }, take: 1 } } },
    },
  });

  const selectedChat = chatId
    ? await prisma.supportChat.findUnique({
        where: { id: chatId },
        include: {
          user: { select: { id: true, name: true, email: true } },
          messages: { orderBy: { createdAt: "asc" } },
        },
      })
    : null;

  const selectedChatData: SupportDashboardSelectedChat | null = selectedChat
    ? {
        id: selectedChat.id,
        status: selectedChat.status,
        customerName: selectedChat.user.name || selectedChat.user.email,
        customerEmail: selectedChat.user.email,
        messages: toSupportMessageViews(selectedChat.messages, session.user.id),
      }
    : null;

  const selectedCustomRequest = requestId
    ? await prisma.customTripRequest.findUnique({
        where: { id: requestId },
        include: {
          user: { select: { id: true, name: true, email: true, username: true } },
          chat: { include: { messages: { orderBy: { createdAt: "asc" } } } },
        },
      })
    : null;

  const selectedCustomRequestData: CustomTripRequestDetail | null = selectedCustomRequest
    ? {
        ...toCustomTripRequestListItem(selectedCustomRequest),
        messages: selectedCustomRequest.chat
          ? toCustomTripMessageViews(selectedCustomRequest.chat.messages, session.user.id)
          : [],
      }
    : null;

  return (
    <SupportDashboard
      initialChats={chats.map(toSupportChatListItem)}
      initialBookings={bookings}
      initialCustomRequests={customRequests.map(toCustomTripRequestListItem)}
      chatId={chatId}
      tab={
        tab === "bookings" ? "bookings" : tab === "custom" ? "custom" : "conversations"
      }
      selectedChat={selectedChatData}
      selectedCustomRequestId={requestId}
      selectedCustomRequest={selectedCustomRequestData}
      canConfirmBookings={hasPermission(session.user.role, "bookings.confirm")}
      canCancelBookings={hasPermission(session.user.role, "bookings.cancel")}
    />
  );
}

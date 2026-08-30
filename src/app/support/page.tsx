import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import {
  fetchBookingsWithDetails,
  type BookingBoardItem,
} from "@/lib/bookings";
import {
  isAwaitingReply,
  toSupportChatListItem,
  toSupportMessageViews,
  type SupportChatListItem,
} from "@/lib/support";
import {
  toCustomTripMessageViews,
  toCustomTripRequestListItem,
  type CustomTripRequestDetail,
  type CustomTripRequestListItem,
} from "@/lib/custom-trips";
import {
  SupportBoard,
  type SupportBoardSelectedChat,
  type SupportBoardTab,
} from "@/components/support/support-board";

export const dynamic = "force-dynamic";
const MAX_SUPPORT_LIST_ITEMS = 100;
const MAX_SELECTED_MESSAGES = 100;

async function loadChats(): Promise<SupportChatListItem[]> {
  const rows = await prisma.supportChat.findMany({
    where: { deletedAt: null },
    orderBy: { updatedAt: "desc" },
    take: MAX_SUPPORT_LIST_ITEMS,
    include: {
      user: { select: { id: true, name: true, email: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  return rows.map(toSupportChatListItem);
}

async function loadResolvedChats(): Promise<SupportChatListItem[]> {
  const rows = await prisma.supportChat.findMany({
    where: { deletedAt: { not: null } },
    orderBy: { deletedAt: "desc" },
    take: MAX_SUPPORT_LIST_ITEMS,
    include: {
      user: { select: { id: true, name: true, email: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  return rows.map(toSupportChatListItem);
}

/**
 * Cheap stand-in for the full chat list when the support agent is not on the
 * conversations tab. Counts OPEN chats whose latest message was authored by
 * the customer (i.e. awaiting an agent reply) without loading every thread.
 * Bounded by the number of open chats — each one uses the per-chat index to
 * find its latest message instead of scanning the whole message table.
 */
async function countOpenChatsAwaitingReply(): Promise<number> {
  const rows = await prisma.$queryRaw<Array<{ count: number }>>`
    SELECT COUNT(*)::int AS "count"
    FROM support_chats sc
    WHERE sc."status" = 'OPEN'
      AND sc."deletedAt" IS NULL
      AND (SELECT sm."senderId"
           FROM support_messages sm
           WHERE sm."chatId" = sc.id
           ORDER BY sm."createdAt" DESC
           LIMIT 1) = sc."userId"
  `;
  return rows[0]?.count ?? 0;
}

async function loadCustomRequests(): Promise<CustomTripRequestListItem[]> {
  const rows = await prisma.customTripRequest.findMany({
    where: { deletedAt: null },
    orderBy: { updatedAt: "desc" },
    take: MAX_SUPPORT_LIST_ITEMS,
    include: {
      user: { select: { id: true, name: true, email: true, username: true } },
      chat: { include: { messages: { orderBy: { createdAt: "desc" }, take: 1 } } },
    },
  });
  return rows.map(toCustomTripRequestListItem);
}

async function loadDeletedCustomRequests(): Promise<CustomTripRequestListItem[]> {
  const rows = await prisma.customTripRequest.findMany({
    where: { deletedAt: { not: null } },
    orderBy: { deletedAt: "desc" },
    take: MAX_SUPPORT_LIST_ITEMS,
    include: {
      user: { select: { id: true, name: true, email: true, username: true } },
      chat: { include: { messages: { orderBy: { createdAt: "desc" }, take: 1 } } },
    },
  });
  return rows.map(toCustomTripRequestListItem);
}

export default async function SupportBoardPage({
  searchParams,
}: {
  searchParams: Promise<{ chat?: string; tab?: string; request?: string }>;
}) {
  const session = await requirePermission("support.manage", "/login?callbackUrl=/support");

  const { chat: chatId, tab: tabParam, request: requestId } = await searchParams;
  const tab: SupportBoardTab =
    tabParam === "bookings" ? "bookings" : tabParam === "custom" ? "custom" : "conversations";

  // Only load the dataset the active tab renders. The conversations tab is the
  // default landing, and it previously paid for the platform-wide bookings
  // query, the global past-booking completion sweep, and every custom trip
  // request on every visit. Inactive tabs now contribute a single cheap count
  // (indexed by status) for their tab badge instead.
  const [chats, awaitingReplyCount, resolvedChats, bookings, pendingBookingsCount, customRequests, deletedCustomRequests, newCustomRequestsCount, selectedChat, selectedCustomRequest] =
    await Promise.all([
      tab === "conversations"
        ? loadChats()
        : Promise.resolve([] as SupportChatListItem[]),
      tab === "conversations"
        ? Promise.resolve(0)
        : countOpenChatsAwaitingReply(),
      tab === "conversations"
        ? loadResolvedChats()
        : Promise.resolve([] as SupportChatListItem[]),
      tab === "bookings"
        ? fetchBookingsWithDetails(
            {},
            { completePast: true, includeBookingIds: true, includePaymentDetails: true },
          )
        : Promise.resolve([] as BookingBoardItem[]),
      tab === "bookings"
        ? Promise.resolve(0)
        : prisma.booking.count({ where: { status: "PENDING", deletedAt: null, trip: { deletedAt: null } } }),
      tab === "custom"
        ? loadCustomRequests()
        : Promise.resolve([] as CustomTripRequestListItem[]),
      tab === "custom"
        ? loadDeletedCustomRequests()
        : Promise.resolve([] as CustomTripRequestListItem[]),
      tab === "custom"
        ? Promise.resolve(0)
        : prisma.customTripRequest.count({ where: { status: "NEW", deletedAt: null } }),
      chatId && tab === "conversations"
        ? prisma.supportChat.findUnique({
            where: { id: chatId },
            include: {
              user: { select: { id: true, name: true, email: true } },
              messages: { orderBy: { createdAt: "desc" }, take: MAX_SELECTED_MESSAGES },
            },
          })
        : Promise.resolve(null),
      requestId && tab === "custom"
        ? prisma.customTripRequest.findUnique({
            where: { id: requestId },
            include: {
              user: { select: { id: true, name: true, email: true, username: true } },
              chat: { include: { messages: { orderBy: { createdAt: "desc" }, take: MAX_SELECTED_MESSAGES } } },
            },
          })
        : Promise.resolve(null),
    ]);

  const selectedChatData: SupportBoardSelectedChat | null = selectedChat
    ? {
        id: selectedChat.id,
        status: selectedChat.status,
        customerName: selectedChat.user.name || selectedChat.user.email,
        customerEmail: selectedChat.user.email,
        deletedAt: selectedChat.deletedAt ? selectedChat.deletedAt.toISOString() : null,
        messages: toSupportMessageViews(selectedChat.messages.slice().reverse(), session.user.id),
      }
    : null;

  const selectedCustomRequestData: CustomTripRequestDetail | null = selectedCustomRequest
    ? {
        ...toCustomTripRequestListItem(selectedCustomRequest),
        messages: selectedCustomRequest.chat
          ? toCustomTripMessageViews(selectedCustomRequest.chat.messages.slice().reverse(), session.user.id)
          : [],
      }
    : null;

  return (
    <SupportBoard
      initialChats={chats}
      initialResolvedChats={resolvedChats}
      pendingConversationsCount={
        tab === "conversations"
          ? chats.filter(isAwaitingReply).length
          : awaitingReplyCount
      }
      initialBookings={bookings}
      pendingBookingsCount={
        tab === "bookings"
          ? bookings.filter((booking) => booking.status === "PENDING").length
          : pendingBookingsCount
      }
      initialCustomRequests={customRequests}
      deletedCustomRequests={deletedCustomRequests}
      newCustomRequestsCount={
        tab === "custom"
          ? customRequests.filter((request) => request.status === "NEW").length
          : newCustomRequestsCount
      }
      chatId={chatId}
      tab={tab}
      selectedChat={selectedChatData}
      selectedCustomRequestId={requestId}
      selectedCustomRequest={selectedCustomRequestData}
    />
  );
}

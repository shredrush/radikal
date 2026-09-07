import { loadDb, prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import {
  fetchBookingsWithDetails,
  type BookingBoardItem,
} from "@/lib/bookings";
import {
  isAwaitingReply,
  toSupportChatBoardListItem,
  toSupportMessageViews,
  type SupportChatBoardListItem,
} from "@/lib/support";
import {
  toCustomTripMessageViews,
  toCustomTripRequestBoardListItem,
  toCustomTripRequestListItem,
  type CustomTripRequestBoardListItem,
  type CustomTripRequestDetail,
} from "@/lib/custom-trips";
import {
  SupportBoard,
  type SupportBoardSelectedChat,
  type SupportBoardTab,
} from "@/components/support/support-board";
import { ACTIVITY_TYPE_OPTIONS } from "@/lib/trip-metadata";

export const dynamic = "force-dynamic";
const MAX_SUPPORT_LIST_ITEMS = 25;
const MAX_SELECTED_MESSAGES = 100;

async function loadChats(): Promise<{ chats: SupportChatBoardListItem[]; nextCursor: string | null }> {
  return loadDb("support.chats", async () => {
    const rows = await prisma.supportChat.findMany({
      where: { deletedAt: null, status: "OPEN" },
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      take: MAX_SUPPORT_LIST_ITEMS + 1,
      select: {
        id: true,
        status: true,
        updatedAt: true,
        deletedAt: true,
        user: { select: { id: true, name: true, email: true } },
        messages: {
          select: { senderId: true, body: true },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });
    const page = rows.slice(0, MAX_SUPPORT_LIST_ITEMS);
    return {
      chats: page.map(toSupportChatBoardListItem),
      nextCursor: rows.length > MAX_SUPPORT_LIST_ITEMS ? page.at(-1)?.id ?? null : null,
    };
  });
}

async function loadConversationSectionCounts() {
  return loadDb("support.conversation-section-counts", async () => {
    const [closed, resolved] = await Promise.all([
      prisma.supportChat.count({ where: { deletedAt: null, status: "CLOSED" } }),
      prisma.supportChat.count({ where: { deletedAt: { not: null } } }),
    ]);
    return { closed, resolved };
  });
}

/**
 * Cheap stand-in for the full chat list when the support agent is not on the
 * conversations tab. Counts OPEN chats whose latest message was authored by
 * the customer (i.e. awaiting an agent reply) without loading every thread.
 * Bounded by the number of open chats — each one uses the per-chat index to
 * find its latest message instead of scanning the whole message table.
 */
async function countOpenChatsAwaitingReply(): Promise<number> {
  return loadDb("support.awaiting-reply-count", async () => {
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
  });
}

async function loadCustomRequests(): Promise<{
  requests: CustomTripRequestBoardListItem[];
  nextCursor: string | null;
}> {
  return loadDb("support.custom-requests", async () => {
    const rows = await prisma.customTripRequest.findMany({
      where: { deletedAt: null, status: { notIn: ["CONFIRMED", "CANCELLED"] } },
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      take: MAX_SUPPORT_LIST_ITEMS + 1,
      select: {
        id: true,
        status: true,
        groupType: true,
        startDate: true,
        endDate: true,
        updatedAt: true,
        deletedAt: true,
        user: { select: { name: true, email: true } },
        chat: {
          select: {
            messages: {
              select: { senderId: true, body: true },
              orderBy: { createdAt: "desc" },
              take: 1,
            },
          },
        },
      },
    });
    const page = rows.slice(0, MAX_SUPPORT_LIST_ITEMS);
    return {
      requests: page.map(toCustomTripRequestBoardListItem),
      nextCursor: rows.length > MAX_SUPPORT_LIST_ITEMS ? page.at(-1)?.id ?? null : null,
    };
  });
}

async function loadCustomSectionCounts() {
  return loadDb("support.custom-section-counts", async () => {
    const [confirmed, cancelled, deleted] = await Promise.all([
      prisma.customTripRequest.count({ where: { deletedAt: null, status: "CONFIRMED" } }),
      prisma.customTripRequest.count({ where: { deletedAt: null, status: "CANCELLED" } }),
      prisma.customTripRequest.count({ where: { deletedAt: { not: null } } }),
    ]);
    return { confirmed, cancelled, deleted };
  });
}

export default async function SupportBoardPage({
  searchParams,
}: {
  searchParams: Promise<{
    chat?: string;
    tab?: string;
    request?: string;
    type?: string;
    guide?: string;
  }>;
}) {
  const session = await requirePermission("support.manage", "/login?callbackUrl=/support");

  const { chat: chatId, tab: tabParam, request: requestId, type, guide } = await searchParams;
  const tab: SupportBoardTab =
    tabParam === "bookings" ? "bookings" : tabParam === "custom" ? "custom" : "conversations";
  const selectedType =
    ACTIVITY_TYPE_OPTIONS.find((option) => option.value === type)?.value ?? "";
  const selectedGuideId = typeof guide === "string" ? guide : "";
  const bookingGuides =
    tab === "bookings"
      ? await loadDb(
          "support.bookings.guide-filter",
          () =>
            prisma.guide.findMany({
              where: { deletedAt: null },
              orderBy: { name: "asc" },
              select: { id: true, name: true },
            }),
        )
      : [];
  const activeGuideId = bookingGuides.some((item) => item.id === selectedGuideId)
    ? selectedGuideId
    : "";

  // Only load the dataset the active tab renders. The conversations tab is the
  // default landing, and it previously paid for the platform-wide bookings
  // query, the global past-booking completion sweep, and every custom trip
  // request on every visit. Inactive tabs now contribute a single cheap count
  // (indexed by status) for their tab badge instead.
  const [chats, awaitingReplyCount, conversationSectionCounts, bookings, pendingBookingsCount, customRequests, customSectionCounts, newCustomRequestsCount, selectedChat, selectedCustomRequest] =
    await Promise.all([
      tab === "conversations"
        ? loadChats()
        : Promise.resolve({ chats: [], nextCursor: null }),
      tab === "conversations"
        ? Promise.resolve(0)
        : countOpenChatsAwaitingReply(),
      tab === "conversations"
        ? loadConversationSectionCounts()
        : Promise.resolve({ closed: 0, resolved: 0 }),
      tab === "bookings"
        ? loadDb(
            "support.bookings",
            () =>
              fetchBookingsWithDetails(
                {
                  trip: {
                    ...(activeGuideId ? { guideId: activeGuideId } : {}),
                    ...(selectedType ? { type: selectedType } : {}),
                  },
                },
                { includeBookingIds: true },
              ),
          )
        : Promise.resolve([] as BookingBoardItem[]),
      tab === "bookings"
        ? Promise.resolve(0)
        : loadDb(
            "support.pending-bookings-count",
            () => prisma.booking.count({ where: { status: "PENDING", deletedAt: null, trip: { deletedAt: null } } }),
          ),
      tab === "custom"
        ? loadCustomRequests()
        : Promise.resolve({ requests: [], nextCursor: null }),
      tab === "custom"
        ? loadCustomSectionCounts()
        : Promise.resolve({ confirmed: 0, cancelled: 0, deleted: 0 }),
      tab === "custom"
        ? Promise.resolve(0)
        : loadDb(
            "support.new-custom-requests-count",
            () => prisma.customTripRequest.count({ where: { status: "NEW", deletedAt: null } }),
          ),
      chatId && tab === "conversations"
        ? loadDb(
            "support.selected-chat",
            () =>
              prisma.supportChat.findUnique({
                where: { id: chatId },
                include: {
                  user: { select: { id: true, name: true, email: true } },
                  messages: { orderBy: { createdAt: "desc" }, take: MAX_SELECTED_MESSAGES },
                },
              }),
          )
        : Promise.resolve(null),
      requestId && tab === "custom"
        ? loadDb(
            "support.selected-custom-request",
            () =>
              prisma.customTripRequest.findUnique({
                where: { id: requestId },
                include: {
                  user: { select: { id: true, name: true, email: true, username: true } },
                  chat: { include: { messages: { orderBy: { createdAt: "desc" }, take: MAX_SELECTED_MESSAGES } } },
                },
              }),
          )
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
      initialChats={chats.chats}
      initialChatsNextCursor={chats.nextCursor}
      initialClosedChats={[]}
      closedChatsCount={conversationSectionCounts.closed}
      initialResolvedChats={[]}
      resolvedChatsCount={conversationSectionCounts.resolved}
      pendingConversationsCount={
        tab === "conversations"
          ? chats.chats.filter(isAwaitingReply).length
          : awaitingReplyCount
      }
      initialBookings={bookings}
      bookingGuides={bookingGuides}
      selectedBookingGuideId={activeGuideId}
      selectedBookingType={selectedType}
      pendingBookingsCount={
        tab === "bookings"
          ? bookings.filter((booking) => booking.status === "PENDING").length
          : pendingBookingsCount
      }
      initialCustomRequests={customRequests.requests}
      initialNextCursor={customRequests.nextCursor}
      confirmedCustomRequests={[]}
      confirmedCustomRequestsCount={customSectionCounts.confirmed}
      cancelledCustomRequests={[]}
      cancelledCustomRequestsCount={customSectionCounts.cancelled}
      deletedCustomRequests={[]}
      deletedCustomRequestsCount={customSectionCounts.deleted}
      newCustomRequestsCount={
        tab === "custom"
          ? customRequests.requests.filter((request) => request.status === "NEW").length
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

import { prisma } from "@/lib/prisma";
import { requireSupport } from "@/lib/authz";
import { getSupportBookings } from "@/lib/support-bookings";
import {
  toSupportChatListItem,
  toSupportMessageViews,
} from "@/lib/support";
import {
  SupportDashboard,
  type SupportDashboardSelectedChat,
} from "@/components/support/support-dashboard";

export const dynamic = "force-dynamic";

export default async function SupportDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ chat?: string; tab?: string }>;
}) {
  const session = await requireSupport("/login?callbackUrl=/support");

  const { chat: chatId, tab } = await searchParams;

  const chats = await prisma.supportChat.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      user: { select: { id: true, name: true, email: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  const bookings = await getSupportBookings();

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

  return (
    <SupportDashboard
      initialChats={chats.map(toSupportChatListItem)}
      initialBookings={bookings}
      chatId={chatId}
      tab={tab === "bookings" ? "bookings" : "conversations"}
      selectedChat={selectedChatData}
    />
  );
}

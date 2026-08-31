import { redirect } from "next/navigation";
import { requireGuide } from "@/lib/guide-board";

export const dynamic = "force-dynamic";

export default async function GuideBoardProfilePage() {
  const { guide } = await requireGuide();
  redirect(guide.user.username ? `/${guide.user.username}` : "/profile");
}

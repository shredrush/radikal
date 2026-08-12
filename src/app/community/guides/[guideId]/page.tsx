import { redirect } from "next/navigation";

export async function generateMetadata() {
  return {
    title: "Guide | Radikal",
  };
}

export default async function LegacyGuidePage({ params }: { params: Promise<{ guideId: string }> }) {
  const { guideId } = await params;
  redirect(`/${guideId}`);
}

const GUIDE_IMAGE_MAP: Record<string, string> = {
  tenzin: "https://images.unsplash.com/photo-1601224748193-d24f166b5c77?auto=format&fit=crop&w=1200&q=80",
  tashi: "https://images.unsplash.com/photo-1599405653894-8a595f692abf?auto=format&fit=crop&w=1200&q=80",
  meera: "https://images.unsplash.com/photo-1661892526325-813afd121a4e?auto=format&fit=crop&w=1200&q=80",
  nawang: "https://images.unsplash.com/photo-1447452001602-7090c7ab2db3?auto=format&fit=crop&w=1200&q=80",
  pema: "https://images.unsplash.com/photo-1548789997-82da68437ad8?auto=format&fit=crop&w=1200&q=80",
};

const DEFAULT_GUIDE_IMAGE = "https://images.unsplash.com/photo-1527631746610-bca00a040d60?auto=format&fit=crop&w=1200&q=80";

export function getGuideImage(guide: {
  username?: string | null;
  photo?: string | null;
  photos?: string[] | null;
}) {
  return guide.photos?.[0] ?? guide.photo ?? (guide.username ? GUIDE_IMAGE_MAP[guide.username] : undefined) ?? DEFAULT_GUIDE_IMAGE;
}
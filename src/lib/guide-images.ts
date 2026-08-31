const DEFAULT_GUIDE_IMAGE = "/avatars/fox.svg";

export function getGuideImage(guide: {
  username?: string | null;
  photo?: string | null;
  photos?: string[] | null;
}) {
  return guide.photos?.[0] ?? guide.photo ?? DEFAULT_GUIDE_IMAGE;
}

const DEFAULT_GUIDE_IMAGE = "/avatars/fox.svg";

export function getGuideImage(guide: {
  username?: string | null;
  photo?: string | null;
  photos?: string[] | null;
  tripImage?: string | null;
}) {
  const profileImage = guide.photos?.find(Boolean) ?? guide.photo;
  return profileImage || guide.tripImage || DEFAULT_GUIDE_IMAGE;
}

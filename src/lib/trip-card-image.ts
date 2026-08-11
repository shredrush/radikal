export interface TripCardImageActivity {
  title: string;
  description: string;
  categories: string[];
  images?: string[];
  type?: string;
  slug?: string;
}

export function normalizeTripImagePath(image: string, slug?: string) {
  const trimmed = image?.trim();

  if (!trimmed) {
    return slug ? `/activities/${slug}/cover.jpg` : "";
  }

  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith("data:")) {
    return trimmed;
  }

  const withoutLeadingSlash = trimmed.replace(/^\/+/, "");

  if (withoutLeadingSlash.startsWith("activities/")) {
    const remainder = withoutLeadingSlash.replace(/^activities\//i, "");

    if (!remainder || remainder === ".") {
      return slug ? `/activities/${slug}/cover.jpg` : "/activities/cover.jpg";
    }

    if (!remainder.includes("/") && !remainder.startsWith(`${slug}/`) && !remainder.startsWith(`${slug}.`)) {
      return slug ? `/activities/${slug}/${remainder}` : `/${withoutLeadingSlash}`;
    }

    return `/${withoutLeadingSlash}`;
  }

  if (withoutLeadingSlash.startsWith("activites/")) {
    const remainder = withoutLeadingSlash.replace(/^activites\//i, "");

    if (!remainder || remainder === ".") {
      return slug ? `/activities/${slug}/cover.jpg` : "/activities/cover.jpg";
    }

    return slug ? `/activities/${slug}/${remainder}` : `/activities/${remainder}`;
  }

  if (!slug) {
    return `/${withoutLeadingSlash}`;
  }

  return `/activities/${slug}/${withoutLeadingSlash || "cover.jpg"}`;
}

export function getTripCardImage(activity: TripCardImageActivity) {
  const primaryImage = activity.images
    ?.map((image) => normalizeTripImagePath(image, activity.slug))
    .find((image) => Boolean(image?.trim()));

  if (primaryImage) {
    return primaryImage;
  }

  if (activity.slug) {
    return `/activities/${activity.slug}/cover.jpg`;
  }

  return "";
}

export function getTripCardImagePosition(activity: TripCardImageActivity) {
  if (activity.slug === "lahaul-spiti-cycle") {
    return "center 35%";
  }

  return "center";
}

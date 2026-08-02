export interface TripCardImageActivity {
  title: string;
  description: string;
  categories: string[];
}

export function getTripCardImage(activity: TripCardImageActivity) {
  const source = `${activity.title} ${activity.description}`.toLowerCase();

  if (source.includes("ski") || source.includes("skiing") ) {
    return "https://plus.unsplash.com/premium_photo-1661810196131-7beb71439ce2?auto=format&fit=crop&w=900&q=80";
  }

  if (source.includes("snowboard") || source.includes("snowboarding") ) {
    return "https://images.unsplash.com/photo-1677856217164-30c485b73087?auto=format&fit=crop&w=900&q=80";
  }

  if (source.includes("bike") || source.includes("cycling")) {
    return "https://images.unsplash.com/photo-1511994298241-608e28f14fde?auto=format&fit=crop&w=900&q=80";
  }

  if (source.includes("trek") || source.includes("hike") || source.includes("trail")) {
    return "https://images.unsplash.com/photo-1600807497639-3b5d8e74a232?auto=format&fit=crop&w=900&q=80";
  }

  if (source.includes("climb") || source.includes("summit") || source.includes("expedition")) {
    return "https://plus.unsplash.com/premium_photo-1733230683072-3d99267bc9fd?auto=format&fit=crop&w=900&q=80";
  }

  if (source.includes("rock") || source.includes("ice")) {
    return "https://images.unsplash.com/photo-1516483638261-f4dbaf036963?auto=format&fit=crop&w=900&q=80";
  }

  if (source.includes("yoga")) {
    return "https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=900&q=80";
  }

  if (source.includes("meditation")) {
    return "https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=900&q=80";
  }

  if (activity.categories.includes("WOMEN_ONLY")) {
    return "https://images.unsplash.com/photo-1517824806704-9040b037703b?auto=format&fit=crop&w=900&q=80";
  }

  return "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=900&q=80";
}

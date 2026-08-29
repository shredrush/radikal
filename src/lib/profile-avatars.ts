export const PROFILE_AVATARS = [
  { key: "fox", label: "Fox", src: "/avatars/fox.svg" },
  { key: "bear", label: "Bear", src: "/avatars/bear.svg" },
  { key: "eagle", label: "Eagle", src: "/avatars/eagle.svg" },
  { key: "wolf", label: "Wolf", src: "/avatars/wolf.svg" },
  { key: "panda", label: "Panda", src: "/avatars/panda.svg" },
  { key: "goat", label: "Goat", src: "/avatars/goat.svg" },
  { key: "penguin", label: "Penguin", src: "/avatars/penguin.svg" },
  { key: "owl", label: "Owl", src: "/avatars/owl.svg" },
] as const;

export function profileAvatarBySrc(src: string | null | undefined) {
  return PROFILE_AVATARS.find((avatar) => avatar.src === src);
}
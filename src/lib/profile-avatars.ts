export const PROFILE_AVATARS = [
  { key: "fox", label: "Fox", src: "/avatars/fox.svg" },
  { key: "bear", label: "Bear", src: "/avatars/bear.svg" },
  { key: "owl", label: "Owl", src: "/avatars/owl.svg" },
  { key: "wolf", label: "Wolf", src: "/avatars/wolf.svg" },
  { key: "panda", label: "Panda", src: "/avatars/panda.svg" },
  { key: "tiger", label: "Tiger", src: "/avatars/tiger.svg" },
  { key: "penguin", label: "Penguin", src: "/avatars/penguin.svg" },
  { key: "koala", label: "Koala", src: "/avatars/koala.svg" },
] as const;

export function profileAvatarBySrc(src: string | null | undefined) {
  return PROFILE_AVATARS.find((avatar) => avatar.src === src);
}
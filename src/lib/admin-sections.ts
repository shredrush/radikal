import { hasPermission, type Permission, type Role } from "@/lib/access-control";

/**
 * Single source of truth for the admin board's section navigation. The admin
 * board header and the staff shortcuts on the profile page both render from
 * this list so their order, labels, hrefs and permission gating stay in sync.
 */
export const ADMIN_SECTIONS = [
  { key: "trip-changes", href: "/admin/trip-changes", label: "Trip changes", permission: "trips.manage" },
  { key: "trips", href: "/admin/trips", label: "Manage trips", permission: "trips.manage" },
  { key: "bookings", href: "/admin/bookings", label: "Manage bookings", permission: "bookings.read" },
  { key: "guides", href: "/admin/guides", label: "Manage guides", permission: "guides.manage" },
  { key: "applications", href: "/admin/guide-applications", label: "Guide Applications", permission: "guideApplications.manage" },
  { key: "users", href: "/admin/users", label: "Manage users", permission: "users.manage" },
] as const satisfies ReadonlyArray<{
  key: string;
  href: string;
  label: string;
  permission: Permission;
}>;

export type AdminSection = (typeof ADMIN_SECTIONS)[number]["key"];

/**
 * Default landing page for the admin board. Bookings is the day-to-day board,
 * so it wins whenever the role can read bookings; otherwise fall back to the
 * first accessible section. Returns undefined when the role has no sections.
 */
export function getAdminBoardHref(role: Role | undefined): string | undefined {
  const sections = ADMIN_SECTIONS.filter((section) =>
    hasPermission(role, section.permission),
  );
  return sections.find((section) => section.key === "bookings")?.href ?? sections[0]?.href;
}

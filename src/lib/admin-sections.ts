import type { Permission } from "@/lib/authz";

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

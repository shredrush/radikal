export const ROLES = [
  "USER",
  "GUIDE",
  "SUPPORT",
  "FINANCE",
  "CONTENT",
  "ADMIN",
  "ADMAX",
] as const;

export type Role = (typeof ROLES)[number];

export const PERMISSIONS = [
  "users.manage",
  "bookings.read",
  "bookings.confirm",
  "bookings.cancel",
  "trips.manage",
  "guides.manage",
  "guideApplications.manage",
  "support.manage",
  "system.debug",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export const ROLE_PERMISSIONS: Record<Role, ReadonlySet<Permission>> = {
  USER: new Set<Permission>(),
  GUIDE: new Set<Permission>(),
  SUPPORT: new Set<Permission>(["bookings.read", "bookings.confirm", "bookings.cancel", "support.manage"]),
  FINANCE: new Set<Permission>(["bookings.read", "bookings.confirm"]),
  CONTENT: new Set<Permission>(["trips.manage", "guides.manage"]),
  ADMIN: new Set<Permission>([
    "bookings.read",
    "bookings.confirm",
    "bookings.cancel",
    "trips.manage",
    "guides.manage",
    "guideApplications.manage",
    "support.manage",
  ]),
  ADMAX: new Set<Permission>(PERMISSIONS),
};

export function hasPermission(role: Role | undefined, permission: Permission): boolean {
  return role ? (ROLE_PERMISSIONS[role]?.has(permission) ?? false) : false;
}

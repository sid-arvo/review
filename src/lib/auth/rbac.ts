import type { UserRole } from "@prisma/client";

export const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: "Admin",
  PRODUCT_MANAGER: "Product Manager",
  UX_RESEARCHER: "UX Researcher",
  GROWTH_MANAGER: "Growth Manager",
  LEADERSHIP: "Leadership",
  VIEWER: "Viewer",
};

export type Permission =
  | "view:dashboard"
  | "view:admin"
  | "view:cron"
  | "manage:users"
  | "manage:settings"
  | "manage:feature-requests"
  | "export:reports"
  | "use:chat";

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  ADMIN: [
    "view:dashboard",
    "view:admin",
    "view:cron",
    "manage:users",
    "manage:settings",
    "manage:feature-requests",
    "export:reports",
    "use:chat",
  ],
  PRODUCT_MANAGER: ["view:dashboard", "manage:feature-requests", "export:reports", "use:chat"],
  UX_RESEARCHER: ["view:dashboard", "export:reports", "use:chat"],
  GROWTH_MANAGER: ["view:dashboard", "export:reports", "use:chat"],
  LEADERSHIP: ["view:dashboard", "export:reports", "use:chat"],
  VIEWER: ["view:dashboard", "use:chat"],
};

export function can(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function requireRole(role: UserRole, permission: Permission) {
  if (!can(role, permission)) {
    throw new Error(`Role ${role} lacks permission ${permission}`);
  }
}

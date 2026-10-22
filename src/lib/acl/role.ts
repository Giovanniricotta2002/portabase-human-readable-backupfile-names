export const SYSTEM_ROLES = ["superadmin", "admin", "user", "pending"] as const;
export type SystemRole = (typeof SYSTEM_ROLES)[number];
export const isSystemRole = (role: unknown): role is SystemRole =>
    SYSTEM_ROLES.includes(role as SystemRole);
export type OrganizationRole = "owner" | "admin" | "member";

export const USER_ROLES = ["school_admin", "staff", "member"] as const;

export type UserRole = (typeof USER_ROLES)[number];
export type AccessDecision = "allow" | "login" | "onboarding" | "denied";

const STAFF_ROLES: readonly UserRole[] = ["school_admin", "staff"];

export function isUserRole(value: unknown): value is UserRole {
  return USER_ROLES.includes(value as UserRole);
}

export function getRequiredRoles(pathname: string): readonly UserRole[] {
  if (pathname === "/dashboard/my-claims" || pathname.startsWith("/dashboard/my-claims/")) {
    return ["member"];
  }

  if (pathname === "/dashboard/admin" || pathname.startsWith("/dashboard/admin/")) {
    return ["school_admin"];
  }

  if (
    pathname === "/dashboard/items/new" ||
    pathname.startsWith("/dashboard/items/new/") ||
    pathname === "/dashboard/claims" ||
    pathname.startsWith("/dashboard/claims/")
  ) {
    return STAFF_ROLES;
  }

  return USER_ROLES;
}

export function getAccessDecision({
  pathname,
  isAuthenticated,
  hasProfile,
  role,
}: {
  pathname: string;
  isAuthenticated: boolean;
  hasProfile: boolean;
  role: UserRole | null;
}): AccessDecision {
  if (!isAuthenticated) return "login";
  if (!hasProfile || !role) return "onboarding";

  return getRequiredRoles(pathname).includes(role) ? "allow" : "denied";
}

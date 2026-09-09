import { cache } from "react";
import { redirect } from "next/navigation";
import {
  getAccessDecision,
  isUserRole,
  type UserRole,
} from "@/lib/auth/access";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export type AuthenticatedProfile = {
  id: string;
  fullName: string;
  schoolId: string;
  schoolName: string;
  role: UserRole;
};

export type AuthState =
  | { status: "unauthenticated" }
  | { status: "missing_profile"; userId: string }
  | { status: "authenticated"; userId: string; profile: AuthenticatedProfile };

type ProfileRow = {
  id: unknown;
  full_name: unknown;
  school_id: unknown;
  role: unknown;
  schools: { name?: unknown } | { name?: unknown }[] | null;
};

export const getAuthState = cache(async (): Promise<AuthState> => {
  if (!isSupabaseConfigured()) return { status: "unauthenticated" };

  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (claimsError || typeof userId !== "string") {
    return { status: "unauthenticated" };
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, school_id, role, schools(name)")
    .eq("id", userId)
    .maybeSingle();

  const row = data as ProfileRow | null;
  const school = Array.isArray(row?.schools) ? row.schools[0] : row?.schools;

  if (
    error ||
    !row ||
    typeof row.id !== "string" ||
    typeof row.full_name !== "string" ||
    !row.full_name.trim() ||
    typeof row.school_id !== "string" ||
    !isUserRole(row.role) ||
    !school ||
    typeof school.name !== "string" ||
    !school.name.trim()
  ) {
    return { status: "missing_profile", userId };
  }

  return {
    status: "authenticated",
    userId,
    profile: {
      id: row.id,
      fullName: row.full_name.trim(),
      schoolId: row.school_id,
      schoolName: school.name.trim(),
      role: row.role,
    },
  };
});

export async function requireProfile() {
  const state = await getAuthState();

  if (state.status === "unauthenticated") redirect("/login");
  if (state.status === "missing_profile") redirect("/onboarding");

  return state.profile;
}

export async function requireRouteAccess(pathname: string) {
  const state = await getAuthState();
  const decision = getAccessDecision({
    pathname,
    isAuthenticated: state.status !== "unauthenticated",
    hasProfile: state.status === "authenticated",
    role: state.status === "authenticated" ? state.profile.role : null,
  });

  if (decision === "login") redirect("/login");
  if (decision === "onboarding") redirect("/onboarding");
  if (decision === "denied") redirect("/dashboard?access=denied");

  return (state as Extract<AuthState, { status: "authenticated" }>).profile;
}

import type { ReactNode } from "react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { requireProfile } from "@/lib/auth/server";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const profile = await requireProfile();

  return <DashboardShell profile={profile}>{children}</DashboardShell>;
}

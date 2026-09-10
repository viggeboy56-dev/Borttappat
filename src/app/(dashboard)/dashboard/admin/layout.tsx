import type { ReactNode } from "react";
import { AdminTabs } from "@/components/admin/admin-tabs";
import { requireRouteAccess } from "@/lib/auth/server";
export default async function AdminLayout({ children }: { children: ReactNode }) { await requireRouteAccess("/dashboard/admin"); return <><AdminTabs />{children}</>; }

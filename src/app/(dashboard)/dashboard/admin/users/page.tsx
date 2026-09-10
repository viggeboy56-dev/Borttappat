import type { Metadata } from "next";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { requireRouteAccess } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Användare" };
type UserRow = { id: string; full_name: string; email: string; role: "school_admin" | "staff" | "member"; created_at: string };

export default async function UsersPage() {
  await requireRouteAccess("/dashboard/admin/users");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("list_school_users");
  const users = (data ?? []) as UserRow[];
  return <><PageHeader title="Användare" description="Skrivskyddad översikt. Borttappat sköter personalens onboarding och behörigheter." />{error ? <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">Användarna kunde inte hämtas.</p> : users.length === 0 ? <EmptyState title="Inga användare" description="Skolans användare visas här när de har aktiverat sina konton." /> : <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white"><ul className="divide-y divide-zinc-100">{users.map((user) => <li key={user.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><p className="font-semibold text-zinc-950">{user.full_name}</p><p className="truncate text-sm text-zinc-500">{user.email}</p><p className="mt-1 text-xs text-zinc-400">Anslöt {new Intl.DateTimeFormat("sv-SE", { dateStyle: "medium" }).format(new Date(user.created_at))}</p></div><span className="text-sm font-medium text-zinc-600">{user.role === "school_admin" ? "Skoladministratör" : user.role === "staff" ? "Personal" : "Medlem"}</span></li>)}</ul></div>}</>;
}

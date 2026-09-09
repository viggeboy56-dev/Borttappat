import Link from "next/link";
import type { ReactNode } from "react";
import { Brand } from "@/components/brand";
import { Navigation } from "@/components/layout/navigation";
import type { AuthenticatedProfile } from "@/lib/auth/server";

const roleLabels = {
  school_admin: "Skoladministratör",
  staff: "Personal",
  member: "Medlem",
} as const;

export function DashboardShell({ children, profile }: { children: ReactNode; profile: AuthenticatedProfile }) {
  const canManageItems = profile.role === "school_admin" || profile.role === "staff";

  return (
    <div className="min-h-screen bg-[#f7f7f5] md:grid md:grid-cols-[248px_1fr]">
      <aside className="hidden border-r border-zinc-200 bg-white px-4 py-6 md:sticky md:top-0 md:flex md:h-screen md:flex-col">
        <div className="px-2"><Brand /></div>
        <div className="mt-8"><Navigation role={profile.role} /></div>
        <div className="mt-auto rounded-xl border border-zinc-200 bg-zinc-50 p-3">
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Skola</p>
          <p className="mt-1 truncate text-sm font-semibold text-zinc-900">{profile.schoolName}</p>
          <p className="mt-0.5 truncate text-xs text-zinc-500">{profile.fullName} · {roleLabels[profile.role]}</p>
          <form action="/auth/signout" method="post" className="mt-3 border-t border-zinc-200 pt-3">
            <button className="text-xs font-semibold text-zinc-600 hover:text-zinc-950 focus-visible:outline-2 focus-visible:outline-emerald-700">Logga ut</button>
          </form>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="border-b border-zinc-200 bg-white md:hidden">
          <div className="flex h-16 items-center justify-between px-4">
            <Brand />
            {canManageItems ? <Link href="/dashboard/items/new" className="rounded-lg bg-emerald-800 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-900 focus-visible:outline-2 focus-visible:outline-emerald-700">Lägg till</Link> : null}
          </div>
          <div className="px-2 pb-2"><Navigation role={profile.role} /></div>
        </header>

        <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10">{children}</main>
      </div>
    </div>
  );
}

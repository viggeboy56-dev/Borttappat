import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { requireRouteAccess } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Administration" };

export default async function AdminPage() {
  const profile = await requireRouteAccess("/dashboard/admin");
  const supabase = await createClient();
  const [{ data: school }, { data: users, error: usersError }, { data: pendingInvitations, error: invitationsError }] = await Promise.all([
    supabase.from("schools").select("name, slug").eq("id", profile.schoolId).single(),
    supabase.rpc("list_school_users"),
    supabase.rpc("count_pending_invitations"),
  ]);
  const userRows = (users ?? []) as { role: string }[];

  return (
    <>
      <PageHeader title="Skolöversikt" description="Se skolans användare och onboardingstatus. Borttappat hanterar nya personal­konton." />
      <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm shadow-zinc-200/30">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Skola</p>
        <h2 className="mt-1 text-xl font-semibold text-zinc-950">{school?.name ?? profile.schoolName}</h2>
        {school?.slug ? <p className="mt-1 text-sm text-zinc-500">Skol-id: {school.slug}</p> : null}
      </section>
      {usersError || invitationsError ? <p role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">Översikten kunde inte hämtas fullständigt.</p> : null}
      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Administratörer", userRows.filter((user) => user.role === "school_admin").length],
          ["Personal", userRows.filter((user) => user.role === "staff").length],
          ["Medlemmar", userRows.filter((user) => user.role === "member").length],
          ["Väntande inbjudningar", Number(pendingInvitations ?? 0)],
        ].map(([label, value]) => <article key={label} className="rounded-xl border border-zinc-200 bg-white p-5"><p className="text-sm text-zinc-600">{label}</p><p className="mt-2 text-3xl font-bold text-zinc-950">{value}</p></article>)}
      </div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <Link href="/dashboard/admin/users" className="rounded-xl border border-zinc-200 bg-white p-5 hover:border-emerald-300"><h2 className="font-semibold text-zinc-950">Användare</h2><p className="mt-1 text-sm leading-6 text-zinc-600">Se vilka som är anslutna till skolan.</p></Link>
        <Link href="/dashboard/admin/invitations" className="rounded-xl border border-zinc-200 bg-white p-5 hover:border-emerald-300"><h2 className="font-semibold text-zinc-950">Onboardingstatus</h2><p className="mt-1 text-sm leading-6 text-zinc-600">Se personalinbjudningar som Borttappat hanterar.</p></Link>
      </div>
    </>
  );
}

import type { Metadata } from "next";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { requireRouteAccess } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Inbjudningar" };
type Invitation = { id: string; full_name: string; email: string; created_at: string; expires_at: string; accepted_at: string | null; cancelled_at: string | null };

export default async function InvitationsPage() {
  await requireRouteAccess("/dashboard/admin/invitations");
  const supabase = await createClient();
  const { data, error } = await supabase.from("invitations").select("id, full_name, email, created_at, expires_at, accepted_at, cancelled_at").order("created_at", { ascending: false });
  const invitations=(data??[]) as Invitation[];
  return <><PageHeader title="Inbjudningar" description="Skrivskyddad översikt. Borttappat skapar och skickar personalens individuella inbjudningar." />{error ? <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">Inbjudningarna kunde inte hämtas.</p> : invitations.length===0?<EmptyState title="Inga inbjudningar" description="Kontakta Borttappat när skolan vill lägga till personal."/>:<ul className="divide-y divide-zinc-100 overflow-hidden rounded-xl border border-zinc-200 bg-white">{invitations.map((invite)=>{const status=invite.accepted_at?"Accepterad":invite.cancelled_at?"Avbruten":"Väntar";return <li key={invite.id} className="p-4"><p className="font-semibold">{invite.full_name}</p><p className="text-sm text-zinc-500">{invite.email}</p><p className="mt-1 text-xs font-semibold uppercase text-zinc-500">{status}</p><p className="mt-1 text-xs text-zinc-400">Gäller till {new Intl.DateTimeFormat("sv-SE",{dateStyle:"medium"}).format(new Date(invite.expires_at))}</p></li>})}</ul>}</>;
}

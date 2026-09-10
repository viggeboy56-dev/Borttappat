import type { Metadata } from "next";
import { Brand } from "@/components/brand";
import { InviteAcceptance } from "@/components/admin/invite-acceptance";
import { getAuthState } from "@/lib/auth/server";
import { hashInvitationToken } from "@/lib/admin/token";
import { isInvitationToken } from "@/lib/admin/validation";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Inbjudan" };
type Details = { email: string; full_name: string; role: "school_admin" | "staff" | "member"; school_name: string; expires_at: string; status: "pending" | "accepted" | "cancelled" | "expired" };

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  let details: Details | null = null;
  if (isInvitationToken(token)) {
    const supabase = await createClient();
    const { data } = await supabase.rpc("get_invitation_details", { invitation_token_hash: hashInvitationToken(token) });
    details = ((data ?? [])[0] ?? null) as Details | null;
  }
  const state = await getAuthState();
  const pendingDetails = details?.status === "pending" ? details : null;
  const unavailableTitle = details?.status === "expired" ? "Inbjudan har gått ut" : details?.status === "cancelled" ? "Inbjudan har avbrutits" : details?.status === "accepted" ? "Inbjudan har redan använts" : "Inbjudningslänken är ogiltig";
  return <main className="flex min-h-screen items-center justify-center bg-[#f7f7f5] px-5 py-10"><section className="w-full max-w-lg rounded-xl border border-zinc-200 bg-white p-6 shadow-sm shadow-zinc-200/30 sm:p-8"><Brand href="/" />{!pendingDetails ? <div className="mt-10"><p className="text-sm font-semibold text-amber-800">Inbjudan kan inte användas</p><h1 className="mt-2 text-2xl font-bold text-zinc-950">{unavailableTitle}</h1><p className="mt-3 text-sm leading-6 text-zinc-600">Kontakta Borttappat för en ny inbjudan.</p></div> : state.status === "authenticated" ? <div className="mt-10"><p className="text-sm font-semibold text-amber-800">Du har redan en skolprofil</p><h1 className="mt-2 text-2xl font-bold text-zinc-950">Kontot är redan kopplat till {state.profile.schoolName}</h1><p className="mt-3 text-sm leading-6 text-zinc-600">Ett konto kan bara tillhöra en skola. Logga ut och använd rätt konto om inbjudan är avsedd för någon annan.</p><form action="/auth/signout" method="post" className="mt-6"><button className="min-h-11 rounded-lg border border-zinc-300 px-4 text-sm font-semibold">Logga ut</button></form></div> : <><div className="mt-10"><p className="text-sm font-semibold text-emerald-800">Inbjudan till {pendingDetails.school_name}</p><h1 className="mt-2 text-2xl font-bold text-zinc-950">Välkommen {pendingDetails.full_name}!</h1><p className="mt-3 text-sm leading-6 text-zinc-600">Inbjudan gäller <strong>{pendingDetails.email}</strong> och går ut {new Intl.DateTimeFormat("sv-SE", { dateStyle: "long" }).format(new Date(pendingDetails.expires_at))}.</p></div><InviteAcceptance token={token} email={pendingDetails.email} fullName={pendingDetails.full_name} schoolName={pendingDetails.school_name} role={pendingDetails.role} signedIn={state.status === "missing_profile"} /></>}</section></main>;
}

import type { Metadata } from "next";
import Link from "next/link";
import { ReturnItemButton } from "@/components/claims/return-item-button";
import { ReviewActions } from "@/components/claims/review-actions";
import { ItemImage } from "@/components/items/item-image";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { requireRouteAccess } from "@/lib/auth/server";
import { formatClaimDate, getClaimStatusLabel } from "@/lib/claims/format";
import { createSignedImageMap } from "@/lib/items/images";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Anspråk" };

type ClaimRow = {
  id: string;
  message: string;
  status: string;
  created_at: string;
  item: { id: string; title: string; image_path: string | null; status: string } | null;
  claimant: { full_name: string } | null;
};

export default async function ClaimsPage({ searchParams }: { searchParams: Promise<{ item?: string }> }) {
  await requireRouteAccess("/dashboard/claims");
  const { item } = await searchParams;
  const supabase = await createClient();
  let query = supabase.from("claims").select("id, message, status, created_at, item:items!inner(id, title, image_path, status), claimant:profiles!claims_user_id_fkey(full_name)").order("created_at", { ascending: false });
  if (item && /^[0-9a-f-]{36}$/i.test(item)) query = query.eq("item_id", item);
  const { data, error } = await query;
  const claims = ((data ?? []) as unknown as ClaimRow[]).sort((a, b) => Number(b.status === "pending") - Number(a.status === "pending"));
  const signedImages = error ? new Map<string, string>() : await createSignedImageMap(supabase, claims.map((claim) => claim.item?.image_path ?? null));

  return (
    <>
      <PageHeader title="Anspråk" description="Granska elevernas och vårdnadshavarnas uppgifter innan ett föremål lämnas ut." />
      {item ? <div className="mb-5 flex items-center gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm"><span className="text-zinc-600">Visar anspråk för valt föremål.</span><Link href="/dashboard/claims" className="font-semibold text-emerald-800">Visa alla</Link></div> : null}
      {error ? <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">Anspråken kunde inte hämtas just nu.</p> : claims.length === 0 ? <EmptyState title="Inga anspråk att visa" description="När en medlem anmäler att ett föremål är deras visas det här." /> : <div className="space-y-4">{claims.map((claim) => claim.item ? <article key={claim.id} className="grid overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm shadow-zinc-200/30 md:grid-cols-[180px_1fr]"><div className="relative aspect-[4/3] border-b border-zinc-100 bg-zinc-100 md:aspect-auto md:border-b-0 md:border-r"><ItemImage url={claim.item.image_path ? signedImages.get(claim.item.image_path) ?? null : null} alt={claim.item.title} /></div><div className="p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-semibold text-zinc-950">{claim.item.title}</h2><p className="mt-1 text-sm text-zinc-500">{claim.claimant?.full_name ?? "Okänd medlem"} · {formatClaimDate(claim.created_at)}</p></div><span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">{getClaimStatusLabel(claim.status)}</span></div><div className="mt-4 rounded-lg bg-zinc-50 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Medlemmens beskrivning</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-700">{claim.message}</p></div><div className="mt-4 flex flex-wrap items-end justify-between gap-4"><Link href={`/dashboard/items/${claim.item.id}`} className="inline-flex min-h-10 items-center text-sm font-semibold text-emerald-800 hover:text-emerald-950">Öppna föremålet →</Link>{claim.status === "pending" ? <ReviewActions claimId={claim.id} /> : claim.status === "approved" && claim.item.status === "claimed" ? <ReturnItemButton itemId={claim.item.id} /> : null}</div></div></article> : null)}</div>}
    </>
  );
}

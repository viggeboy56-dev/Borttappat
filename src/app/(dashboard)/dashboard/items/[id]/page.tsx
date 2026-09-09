import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ClaimForm } from "@/components/claims/claim-form";
import { ReturnItemButton } from "@/components/claims/return-item-button";
import { ItemImage } from "@/components/items/item-image";
import { requireRouteAccess } from "@/lib/auth/server";
import { getClaimStatusLabel } from "@/lib/claims/format";
import { formatFoundDate, getStatusLabel } from "@/lib/items/format";
import { createSignedImageMap } from "@/lib/items/images";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Fynddetaljer" };

type ItemDetail = { id: string; title: string; description: string | null; category: string; found_location: string | null; found_date: string | null; image_path: string | null; status: string };
type OwnClaim = { id: string; status: string; message: string };

export default async function ItemDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const profile = await requireRouteAccess("/dashboard/items");
  const { id } = await params;
  const supabase = await createClient();
  const { data, error } = await supabase.from("items").select("id, title, description, category, found_location, found_date, image_path, status").eq("id", id).maybeSingle();
  if (error || !data) notFound();

  const item = data as ItemDetail;
  const signedImages = await createSignedImageMap(supabase, [item.image_path]);
  const imageUrl = item.image_path ? signedImages.get(item.image_path) ?? null : null;
  const canManage = profile.role === "staff" || profile.role === "school_admin";
  let ownClaim: OwnClaim | null = null;
  let pendingCount = 0;

  if (profile.role === "member") {
    const { data: claim } = await supabase.from("claims").select("id, status, message").eq("item_id", id).order("created_at", { ascending: false }).limit(1).maybeSingle();
    ownClaim = claim as OwnClaim | null;
  } else {
    const { count } = await supabase.from("claims").select("id", { count: "exact", head: true }).eq("item_id", id).eq("status", "pending");
    pendingCount = count ?? 0;
  }

  return (
    <>
      <Link href="/dashboard/items" className="mb-5 inline-flex min-h-10 items-center text-sm font-medium text-zinc-600 hover:text-zinc-950">← Tillbaka till hittegods</Link>
      <article className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm shadow-zinc-200/30 lg:grid lg:grid-cols-2">
        <div className="relative aspect-[4/3] min-h-64 overflow-hidden bg-zinc-100 lg:aspect-auto lg:min-h-[520px]"><ItemImage url={imageUrl} alt={item.title} priority /></div>
        <div className="p-5 sm:p-8 lg:p-10">
          <div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">{getStatusLabel(item.status)}</span><span className="text-sm text-zinc-500">{item.category}</span></div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-zinc-950 sm:text-3xl">{item.title}</h1>
          <dl className="mt-7 grid gap-5 border-y border-zinc-100 py-6 sm:grid-cols-2">
            <div><dt className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Hittad</dt><dd className="mt-1.5 text-sm font-medium text-zinc-900">{item.found_location ?? "Plats saknas"}</dd></div>
            <div><dt className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Datum</dt><dd className="mt-1.5 text-sm font-medium text-zinc-900">{formatFoundDate(item.found_date, true)}</dd></div>
            <div><dt className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Kategori</dt><dd className="mt-1.5 text-sm font-medium text-zinc-900">{item.category}</dd></div>
            <div><dt className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Status</dt><dd className="mt-1.5 text-sm font-medium text-zinc-900">{getStatusLabel(item.status)}</dd></div>
          </dl>
          <section className="mt-6"><h2 className="font-semibold text-zinc-950">Beskrivning</h2><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-600">{item.description || "Ingen ytterligare beskrivning har angetts."}</p></section>

          {profile.role === "member" ? <section className="mt-8">
            {ownClaim ? <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4"><p className="font-semibold text-zinc-900">Ditt anspråk: {getClaimStatusLabel(ownClaim.status)}</p><p className="mt-2 text-sm leading-6 text-zinc-600">{ownClaim.message}</p>{item.status === "returned" ? <p className="mt-3 text-sm font-semibold text-emerald-800">Föremålet är utlämnat.</p> : null}{ownClaim.status === "rejected" && item.status === "available" ? <div className="mt-4"><ClaimForm itemId={item.id} /></div> : null}</div> : item.status === "available" ? <ClaimForm itemId={item.id} /> : <p className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700">Föremålet är inte längre tillgängligt för anspråk.</p>}
          </section> : null}

          {canManage ? <section className="mt-8 rounded-lg border border-zinc-200 bg-zinc-50 p-4"><p className="font-semibold text-zinc-900">Anspråk på föremålet</p><p className="mt-1 text-sm text-zinc-600">{pendingCount === 1 ? "1 anspråk väntar på granskning." : `${pendingCount} anspråk väntar på granskning.`}</p><div className="mt-4 flex flex-wrap gap-3"><Link href={`/dashboard/claims?item=${item.id}`} className="inline-flex min-h-10 items-center rounded-lg border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-800 hover:bg-zinc-100">Visa anspråk</Link>{item.status === "claimed" ? <ReturnItemButton itemId={item.id} /> : null}</div></section> : null}
        </div>
      </article>
    </>
  );
}

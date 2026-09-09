import type { Metadata } from "next";
import Link from "next/link";
import { ItemImage } from "@/components/items/item-image";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { requireRouteAccess } from "@/lib/auth/server";
import { formatClaimDate, getClaimStatusLabel } from "@/lib/claims/format";
import { getStatusLabel } from "@/lib/items/format";
import { createSignedImageMap } from "@/lib/items/images";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Mina anspråk" };

type ClaimRow = { id: string; message: string; status: string; created_at: string; item: { id: string; title: string; image_path: string | null; status: string } | null };

export default async function MyClaimsPage() {
  await requireRouteAccess("/dashboard/my-claims");
  const supabase = await createClient();
  const { data, error } = await supabase.from("claims").select("id, message, status, created_at, item:items(id, title, image_path, status)").order("created_at", { ascending: false });
  const claims = (data ?? []) as unknown as ClaimRow[];
  const signedImages = error ? new Map<string, string>() : await createSignedImageMap(supabase, claims.map((claim) => claim.item?.image_path ?? null));

  return (
    <>
      <PageHeader title="Mina anspråk" description="Följ de föremål som du har anmält som dina." />
      {error ? <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">Dina anspråk kunde inte hämtas just nu.</p> : claims.length === 0 ? <EmptyState title="Du har inga anspråk ännu" description="Öppna ett tillgängligt föremål i hittegodskatalogen och välj ”Det här är mitt” om du känner igen det." action={{ href: "/dashboard/items", label: "Visa hittegods" }} /> : <div className="space-y-4">{claims.map((claim) => claim.item ? <article key={claim.id} className="grid overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm shadow-zinc-200/30 sm:grid-cols-[180px_1fr]"><div className="relative aspect-[4/3] bg-zinc-100 sm:aspect-auto"><ItemImage url={claim.item.image_path ? signedImages.get(claim.item.image_path) ?? null : null} alt={claim.item.title} /></div><div className="p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-semibold text-zinc-950">{claim.item.title}</h2><p className="mt-1 text-sm text-zinc-500">Skickat {formatClaimDate(claim.created_at)}</p></div><span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">{getClaimStatusLabel(claim.status)}</span></div><p className="mt-4 text-sm leading-6 text-zinc-600">{claim.message}</p><p className="mt-3 text-sm font-medium text-zinc-700">Föremål: {getStatusLabel(claim.item.status)}</p><Link href={`/dashboard/items/${claim.item.id}`} className="mt-4 inline-flex min-h-10 items-center text-sm font-semibold text-emerald-800 hover:text-emerald-950">Öppna föremålet →</Link></div></article> : null)}</div>}
    </>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { ItemCard, type CatalogueItem } from "@/components/items/item-card";
import { PageHeader } from "@/components/ui/page-header";
import { requireProfile } from "@/lib/auth/server";
import { createSignedImageMap } from "@/lib/items/images";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Översikt" };

const roleLabels = { school_admin: "Skoladministratör", staff: "Personal", member: "Medlem" } as const;

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ access?: string }> }) {
  const [profile, params] = await Promise.all([requireProfile(), searchParams]);
  const canManageItems = profile.role === "school_admin" || profile.role === "staff";
  const supabase = await createClient();
  let recentQuery = supabase.from("items").select("id, title, category, found_location, found_date, image_path, status").order("found_date", { ascending: false, nullsFirst: false }).order("created_at", { ascending: false }).limit(3);
  if (profile.role === "member") recentQuery = recentQuery.eq("status", "available");
  const { data } = await recentQuery;
  const recentItems = (data ?? []) as CatalogueItem[];
  const signedImages = await createSignedImageMap(supabase, recentItems.map((item) => item.image_path));
  const { count: claimCount } = await supabase.from("claims").select("id", { count: "exact", head: true }).eq("status", "pending");
  const action = canManageItems ? <Link href="/dashboard/items/new" className="inline-flex min-h-10 items-center justify-center rounded-lg bg-emerald-800 px-4 text-sm font-semibold text-white hover:bg-emerald-900 focus-visible:outline-2 focus-visible:outline-emerald-700">+ Registrera fynd</Link> : undefined;

  return (
    <>
      <PageHeader eyebrow={profile.schoolName} title={`Hej, ${profile.fullName}`} description={`${roleLabels[profile.role]} på ${profile.schoolName}.`} action={action} />
      {params.access === "denied" ? <p role="alert" className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">Du har inte behörighet till den sidan.</p> : null}
      <Link href={profile.role === "member" ? "/dashboard/my-claims" : "/dashboard/claims"} className="mb-7 flex items-center justify-between rounded-xl border border-zinc-200 bg-white p-5 shadow-sm shadow-zinc-200/30 hover:border-zinc-300"><div><p className="text-sm font-medium text-zinc-500">{profile.role === "member" ? "Mina väntande anspråk" : "Anspråk att granska"}</p><p className="mt-1 text-2xl font-bold text-zinc-950">{claimCount ?? 0}</p></div><span className="text-sm font-semibold text-emerald-800">Visa anspråk →</span></Link>
      <section>
        <div className="mb-4 flex items-center justify-between gap-4"><h2 className="text-lg font-semibold text-zinc-950">Senast hittat</h2><Link href="/dashboard/items" className="text-sm font-semibold text-emerald-800 hover:text-emerald-950">Visa allt hittegods →</Link></div>
        {recentItems.length > 0 ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{recentItems.map((item) => <ItemCard key={item.id} item={item} imageUrl={item.image_path ? signedImages.get(item.image_path) ?? null : null} />)}</div>
        ) : (
          <div className="rounded-xl border border-dashed border-zinc-300 bg-white px-5 py-10 text-center"><p className="font-semibold text-zinc-900">Inga fynd har registrerats ännu.</p><p className="mt-1 text-sm text-zinc-600">{canManageItems ? "Registrera skolans första fynd för att komma igång." : "När något hittas på skolan visas det här."}</p>{canManageItems ? <Link href="/dashboard/items/new" className="mt-5 inline-flex min-h-11 items-center rounded-lg bg-emerald-800 px-5 text-sm font-semibold text-white">Registrera första fyndet</Link> : null}</div>
        )}
      </section>
    </>
  );
}

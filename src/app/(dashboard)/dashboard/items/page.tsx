import type { Metadata } from "next";
import Link from "next/link";
import { ItemCard, type CatalogueItem } from "@/components/items/item-card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { requireRouteAccess } from "@/lib/auth/server";
import { ITEM_CATEGORIES, ITEM_STATUSES, ITEM_STATUS_LABELS, isItemCategory, isItemStatus } from "@/lib/items/constants";
import { createSignedImageMap } from "@/lib/items/images";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Hittegods" };

type ItemSearchParams = { q?: string; category?: string; status?: string };

export default async function ItemsPage({ searchParams }: { searchParams: Promise<ItemSearchParams> }) {
  const [profile, params] = await Promise.all([requireRouteAccess("/dashboard/items"), searchParams]);
  const canManageItems = profile.role === "school_admin" || profile.role === "staff";
  const search = params.q?.trim().slice(0, 100) ?? "";
  const category = isItemCategory(params.category) ? params.category : "";
  const status = canManageItems && isItemStatus(params.status) ? params.status : "";
  const supabase = await createClient();

  let query = supabase
    .from("items")
    .select("id, title, category, found_location, found_date, image_path, status")
    .order("found_date", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (profile.role === "member") query = query.eq("status", "available");
  if (search) query = query.ilike("title", `%${search.replaceAll("%", "\\%").replaceAll("_", "\\_")}%`);
  if (category) query = query.eq("category", category);
  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  const items = (data ?? []) as CatalogueItem[];
  const signedImages = error ? new Map<string, string>() : await createSignedImageMap(supabase, items.map((item) => item.image_path));
  const action = canManageItems ? <Link href="/dashboard/items/new" className="inline-flex min-h-10 items-center justify-center rounded-lg bg-emerald-800 px-4 text-sm font-semibold text-white hover:bg-emerald-900 focus-visible:outline-2 focus-visible:outline-emerald-700">+ Registrera fynd</Link> : undefined;

  return (
    <>
      <PageHeader title="Hittegods" description="Sök bland saker som hittats på skolan." action={action} />
      <form method="get" className="mb-7 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm shadow-zinc-200/30">
        <div className={`grid gap-3 ${canManageItems ? "md:grid-cols-[1fr_190px_180px_auto]" : "sm:grid-cols-[1fr_200px_auto]"}`}>
          <label className="block text-sm font-medium text-zinc-700"><span className="sr-only">Sök bland hittegods</span><input name="q" defaultValue={search} placeholder="Sök bland hittegods" className="h-11 w-full rounded-lg border border-zinc-300 px-3.5 text-base focus:border-emerald-700 focus:outline-2 focus:outline-emerald-700/20" /></label>
          <label className="block"><span className="sr-only">Kategori</span><select name="category" defaultValue={category} className="h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 text-base focus:border-emerald-700 focus:outline-2 focus:outline-emerald-700/20"><option value="">Alla kategorier</option>{ITEM_CATEGORIES.map((value) => <option key={value}>{value}</option>)}</select></label>
          {canManageItems ? <label className="block"><span className="sr-only">Status</span><select name="status" defaultValue={status} className="h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 text-base focus:border-emerald-700 focus:outline-2 focus:outline-emerald-700/20"><option value="">Alla statusar</option>{ITEM_STATUSES.map((value) => <option key={value} value={value}>{ITEM_STATUS_LABELS[value]}</option>)}</select></label> : null}
          <button type="submit" className="min-h-11 rounded-lg bg-zinc-900 px-5 text-sm font-semibold text-white hover:bg-zinc-800 focus-visible:outline-2 focus-visible:outline-emerald-700">Sök</button>
        </div>
        {search || category || status ? <Link href="/dashboard/items" className="mt-3 inline-flex py-1 text-sm font-semibold text-emerald-800 hover:text-emerald-950">Rensa filter</Link> : null}
      </form>

      {error ? (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">Katalogen kunde inte hämtas just nu. Försök igen om en stund.</div>
      ) : items.length === 0 ? (
        <EmptyState title={search || category || status ? "Inga fynd matchar din sökning" : "Inga fynd har registrerats ännu"} description={canManageItems ? "Registrera skolans första fynd så visas det här." : "När något hittas på skolan visas det här."} action={canManageItems && !search && !category && !status ? { href: "/dashboard/items/new", label: "Registrera skolans första fynd" } : undefined} />
      ) : (
        <section aria-label="Hittade föremål">
          <p className="mb-4 text-sm text-zinc-500">{items.length} fynd</p>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => <ItemCard key={item.id} item={item} imageUrl={item.image_path ? signedImages.get(item.image_path) ?? null : null} />)}
          </div>
        </section>
      )}
    </>
  );
}

import Link from "next/link";
import { ItemImage } from "@/components/items/item-image";
import { formatFoundDate, getStatusLabel } from "@/lib/items/format";

export type CatalogueItem = {
  id: string;
  title: string;
  category: string;
  found_location: string | null;
  found_date: string | null;
  image_path: string | null;
  status: string;
};

export function ItemCard({ item, imageUrl }: { item: CatalogueItem; imageUrl: string | null }) {
  return (
    <Link href={`/dashboard/items/${item.id}`} className="group overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm shadow-zinc-200/40 transition-colors hover:border-zinc-300 focus-visible:outline-2 focus-visible:outline-emerald-700">
      <div className="relative aspect-[4/3] overflow-hidden border-b border-zinc-100">
        <ItemImage url={imageUrl} alt={item.title} />
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate font-semibold text-zinc-950 group-hover:text-emerald-900">{item.title}</h2>
            <p className="mt-1 text-sm text-zinc-500">{item.category}</p>
          </div>
          <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800">{getStatusLabel(item.status)}</span>
        </div>
        <div className="mt-4 space-y-1 text-sm text-zinc-600">
          <p className="truncate">Hittad {item.found_location ? `i ${item.found_location}` : "på skolan"}</p>
          <p>Hittad {formatFoundDate(item.found_date)}</p>
        </div>
      </div>
    </Link>
  );
}

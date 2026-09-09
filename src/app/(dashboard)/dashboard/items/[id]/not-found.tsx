import Link from "next/link";

export default function ItemNotFound() {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white px-5 py-14 text-center">
      <h1 className="text-xl font-semibold text-zinc-950">Fyndet kunde inte visas</h1>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-600">Fyndet finns inte eller så har du inte behörighet att se det.</p>
      <Link href="/dashboard/items" className="mt-5 inline-flex min-h-11 items-center rounded-lg bg-emerald-800 px-5 text-sm font-semibold text-white">Till hittegodset</Link>
    </div>
  );
}

export default function ItemsLoading() {
  return (
    <div aria-live="polite" aria-busy="true">
      <div className="h-8 w-44 animate-pulse rounded bg-zinc-200" />
      <div className="mt-3 h-5 w-72 max-w-full animate-pulse rounded bg-zinc-200" />
      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((item) => <div key={item} className="overflow-hidden rounded-xl border border-zinc-200 bg-white"><div className="aspect-[4/3] animate-pulse bg-zinc-200"/><div className="space-y-3 p-4"><div className="h-5 w-2/3 animate-pulse rounded bg-zinc-200"/><div className="h-4 w-1/2 animate-pulse rounded bg-zinc-100"/></div></div>)}
      </div>
      <span className="sr-only">Laddar hittegods…</span>
    </div>
  );
}

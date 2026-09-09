"use client";

export default function ItemsError({ reset }: { reset: () => void }) {
  return (
    <div className="rounded-xl border border-red-200 bg-white p-6 text-center">
      <h1 className="font-semibold text-zinc-950">Katalogen kunde inte visas</h1>
      <p className="mt-2 text-sm text-zinc-600">Ett tillfälligt fel uppstod. Försök igen.</p>
      <button onClick={reset} className="mt-5 min-h-11 rounded-lg bg-zinc-900 px-5 text-sm font-semibold text-white">Försök igen</button>
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ReturnItemButton({ itemId }: { itemId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function markReturned() {
    if (!window.confirm("Bekräfta att föremålet har lämnats ut till den godkända ägaren.")) return;
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/items/${itemId}/return`, { method: "POST" });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) return setError(result.error ?? "Utlämningen kunde inte sparas.");
      router.refresh();
    } catch {
      setError("Anslutningen misslyckades. Försök igen.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <button type="button" disabled={pending} onClick={markReturned} className="min-h-10 rounded-lg bg-zinc-900 px-4 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-60">{pending ? "Sparar…" : "Markera som utlämnat"}</button>
      {error ? <p role="alert" className="mt-2 text-sm text-red-800">{error}</p> : null}
    </div>
  );
}

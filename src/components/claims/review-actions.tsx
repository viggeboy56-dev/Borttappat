"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ReviewActions({ claimId }: { claimId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function review(decision: "approved" | "rejected") {
    const label = decision === "approved" ? "godkänna" : "avslå";
    if (!window.confirm(`Är du säker på att du vill ${label} anspråket?`)) return;

    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/claims/${claimId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) return setError(result.error ?? "Beslutet kunde inte sparas.");
      router.refresh();
    } catch {
      setError("Anslutningen misslyckades. Försök igen.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={pending} onClick={() => review("approved")} className="min-h-10 rounded-lg bg-emerald-800 px-4 text-sm font-semibold text-white hover:bg-emerald-900 disabled:opacity-60">Godkänn</button>
        <button type="button" disabled={pending} onClick={() => review("rejected")} className="min-h-10 rounded-lg border border-red-200 bg-white px-4 text-sm font-semibold text-red-800 hover:bg-red-50 disabled:opacity-60">Avslå</button>
      </div>
      {error ? <p role="alert" className="mt-2 text-sm text-red-800">{error}</p> : null}
    </div>
  );
}

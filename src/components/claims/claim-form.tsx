"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { validateClaimMessage } from "@/lib/claims/constants";

export function ClaimForm({ itemId }: { itemId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const formData = new FormData(event.currentTarget);
    const message = formData.get("message");
    const validationError = validateClaimMessage(message);
    if (validationError) return setError(validationError);

    setPending(true);
    try {
      const response = await fetch("/api/claims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, message }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) return setError(result.error ?? "Anspråket kunde inte skickas.");

      setSuccess(true);
      router.refresh();
    } catch {
      setError("Anslutningen misslyckades. Försök igen.");
    } finally {
      setPending(false);
    }
  }

  if (success) {
    return <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-4"><p className="font-semibold text-emerald-950">Anspråket är skickat</p><p className="mt-1 text-sm text-emerald-900">Skolans personal granskar din beskrivning.</p></div>;
  }

  if (!open) {
    return <button type="button" onClick={() => setOpen(true)} className="inline-flex min-h-11 items-center justify-center rounded-lg bg-emerald-800 px-5 text-sm font-semibold text-white hover:bg-emerald-900 focus-visible:outline-2 focus-visible:outline-emerald-700">Det här är mitt</button>;
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-4">
      <h2 className="font-semibold text-zinc-950">Berätta hur du känner igen föremålet</h2>
      <p className="mt-1 text-sm leading-6 text-zinc-600">Skriv något som personalen kan använda för att kontrollera att det är ditt, till exempel ett kännetecken som inte syns på bilden.</p>
      <label htmlFor="claim-message" className="mt-4 block text-sm font-semibold text-zinc-900">Din beskrivning</label>
      <textarea id="claim-message" name="message" required maxLength={2000} rows={4} disabled={pending} className="mt-2 block w-full resize-y rounded-lg border border-zinc-300 bg-white px-3.5 py-3 text-base focus:border-emerald-700 focus:outline-2 focus:outline-emerald-700/20" />
      {error ? <p role="alert" className="mt-3 text-sm font-medium text-red-800">{error}</p> : null}
      <div className="mt-4 flex flex-wrap gap-3">
        <button type="submit" disabled={pending} className="min-h-11 rounded-lg bg-emerald-800 px-5 text-sm font-semibold text-white hover:bg-emerald-900 disabled:cursor-wait disabled:opacity-70">{pending ? "Skickar…" : "Skicka anspråk"}</button>
        <button type="button" disabled={pending} onClick={() => setOpen(false)} className="min-h-11 rounded-lg border border-zinc-300 bg-white px-5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50">Avbryt</button>
      </div>
    </form>
  );
}

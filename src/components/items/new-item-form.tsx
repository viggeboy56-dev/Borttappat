"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { ITEM_CATEGORIES } from "@/lib/items/constants";
import { validateItemImage } from "@/lib/items/validation";

function today() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.valueOf() - offset).toISOString().slice(0, 10);
}

export function NewItemForm() {
  const router = useRouter();
  const [image, setImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const imageError = validateItemImage(image);
    if (imageError) {
      setError(imageError);
      return;
    }

    setPending(true);
    setProgress("Laddar upp bilden och publicerar fyndet…");
    const formData = new FormData(event.currentTarget);

    try {
      const response = await fetch("/api/items", { method: "POST", body: formData });
      const result = (await response.json()) as { id?: string; error?: string };

      if (!response.ok || !result.id) {
        setError(result.error ?? "Fyndet kunde inte publiceras. Försök igen.");
        return;
      }

      setProgress("Publicerat! Öppnar fyndet…");
      router.push(`/dashboard/items/${result.id}`);
      router.refresh();
    } catch {
      setError("Anslutningen misslyckades. Kontrollera nätverket och försök igen.");
    } finally {
      setPending(false);
      setProgress(null);
    }
  }

  const fieldClass = "mt-2 block min-h-12 w-full rounded-lg border border-zinc-300 bg-white px-3.5 text-base text-zinc-950 placeholder:text-zinc-400 focus:border-emerald-700 focus:outline-2 focus:outline-emerald-700/20";

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl rounded-xl border border-zinc-200 bg-white p-5 shadow-sm shadow-zinc-200/30 sm:p-7">
      <div className="space-y-6">
        <div>
          <label htmlFor="image" className="text-sm font-semibold text-zinc-900">Bild <span className="text-red-700">*</span></label>
          <label htmlFor="image" className="mt-2 flex min-h-44 cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-dashed border-zinc-300 bg-zinc-50 text-center hover:border-emerald-700 hover:bg-emerald-50/30">
            {previewUrl ? (
              // A local object URL cannot be handled by next/image.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewUrl} alt="Förhandsvisning" className="max-h-72 w-full object-contain" />
            ) : (
              <span className="px-5 py-8">
                <svg className="mx-auto size-9 text-emerald-800" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M4 7h3l1.5-2h7L17 7h3a1 1 0 0 1 1 1v11H3V8a1 1 0 0 1 1-1Z"/><circle cx="12" cy="13" r="3.5"/></svg>
                <span className="mt-3 block font-semibold text-zinc-900">Ta en bild eller välj från enheten</span>
                <span className="mt-1 block text-sm text-zinc-500">JPEG, PNG eller WebP · högst 5 MB</span>
              </span>
            )}
          </label>
          <input id="image" name="image" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" required className="sr-only" onChange={(event) => {
            const selectedImage = event.target.files?.[0] ?? null;
            setImage(selectedImage);
            setPreviewUrl(selectedImage ? URL.createObjectURL(selectedImage) : null);
          }} />
          {image ? <p className="mt-2 text-sm text-zinc-600">Vald bild: {image.name}</p> : null}
        </div>

        <label className="block text-sm font-semibold text-zinc-900">Rubrik <span className="text-red-700">*</span><input name="title" required maxLength={200} placeholder="Svart Nike-hoodie" className={fieldClass} /></label>

        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block text-sm font-semibold text-zinc-900">Kategori <span className="text-red-700">*</span><select name="category" required defaultValue="" className={fieldClass}><option value="" disabled>Välj kategori</option>{ITEM_CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select></label>
          <label className="block text-sm font-semibold text-zinc-900">Hittad plats <span className="text-red-700">*</span><input name="foundLocation" required maxLength={200} placeholder="Omklädningsrum 2" className={fieldClass} /></label>
        </div>

        <label className="block text-sm font-semibold text-zinc-900">Hittad datum <span className="text-red-700">*</span><input name="foundDate" type="date" required defaultValue={today()} className={fieldClass} /></label>
        <label className="block text-sm font-semibold text-zinc-900">Beskrivning <span className="font-normal text-zinc-500">(valfritt)</span><textarea name="description" rows={4} maxLength={2000} placeholder="Storlek M, vit logga på bröstet" className={`${fieldClass} resize-y py-3`} /></label>
      </div>

      {error ? <p role="alert" className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p> : null}
      {progress ? <p role="status" className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">{progress}</p> : null}

      <button type="submit" disabled={pending} className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-lg bg-emerald-800 px-5 text-base font-semibold text-white hover:bg-emerald-900 focus-visible:outline-2 focus-visible:outline-emerald-700 disabled:cursor-wait disabled:bg-emerald-700/70 sm:w-auto">
        {pending ? "Publicerar…" : "Publicera fynd"}
      </button>
    </form>
  );
}

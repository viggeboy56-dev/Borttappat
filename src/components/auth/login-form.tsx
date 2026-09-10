"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export function LoginForm({ configured }: { configured: boolean }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!configured) {
      setError("Supabase är inte konfigurerat för webbappen ännu.");
      return;
    }

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    if (!email || !password) {
      setError("Fyll i både e-postadress och lösenord.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const result = await response.json() as { error?: string };

      if (!response.ok) {
        setError(result.error ?? "Det gick inte att logga in. Kontrollera uppgifterna och försök igen.");
        return;
      }

      router.replace("/dashboard");
      router.refresh();
    } catch {
      setError("Ett oväntat fel uppstod. Försök igen.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
      <label className="block text-sm font-medium text-zinc-800">
        E-postadress
        <input
          type="email"
          name="email"
          autoComplete="email"
          placeholder="namn@skola.se"
          required
          disabled={loading || !configured}
          className="mt-2 block h-11 w-full rounded-lg border border-zinc-300 bg-white px-3.5 text-zinc-950 placeholder:text-zinc-400 disabled:cursor-not-allowed disabled:bg-zinc-100 focus:border-emerald-700 focus:outline-2 focus:outline-emerald-100"
        />
      </label>
      <label className="block text-sm font-medium text-zinc-800">
        Lösenord
        <input
          type="password"
          name="password"
          autoComplete="current-password"
          placeholder="Ditt lösenord"
          required
          disabled={loading || !configured}
          className="mt-2 block h-11 w-full rounded-lg border border-zinc-300 bg-white px-3.5 text-zinc-950 placeholder:text-zinc-400 disabled:cursor-not-allowed disabled:bg-zinc-100 focus:border-emerald-700 focus:outline-2 focus:outline-emerald-100"
        />
      </label>

      {error ? (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={loading || !configured}
        className="h-11 w-full rounded-lg bg-emerald-800 px-4 text-sm font-semibold text-white hover:bg-emerald-900 disabled:cursor-not-allowed disabled:bg-zinc-400 focus-visible:outline-2 focus-visible:outline-emerald-700"
      >
        {loading ? "Loggar in…" : "Logga in"}
      </button>
    </form>
  );
}

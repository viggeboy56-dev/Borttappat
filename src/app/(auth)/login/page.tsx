import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Brand } from "@/components/brand";
import { LoginForm } from "@/components/auth/login-form";
import { getAuthState } from "@/lib/auth/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const metadata: Metadata = { title: "Logga in" };

export default async function LoginPage() {
  const configured = isSupabaseConfigured();

  if (configured) {
    const state = await getAuthState();
    if (state.status !== "unauthenticated") redirect("/dashboard");
  }

  return (
    <main className="grid min-h-screen bg-white lg:grid-cols-[1fr_0.9fr]">
      <section className="flex items-center justify-center px-5 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <Brand href="/login" />
          <div className="mt-12">
            <p className="text-sm font-semibold text-emerald-800">Välkommen tillbaka</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-950">Logga in till din skola</h1>
            <p className="mt-3 text-sm leading-6 text-zinc-600">Hantera upphittade saker och hjälp dem att hitta hem igen.</p>
          </div>

          <LoginForm configured={configured} />

          {!configured ? (
            <p className="mt-5 text-sm leading-6 text-amber-800">
              Lägg till Supabase-variablerna i <code>.env.local</code> för att aktivera inloggningen.
            </p>
          ) : null}
        </div>
      </section>

      <aside className="hidden bg-emerald-950 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <p className="text-sm font-medium text-emerald-200">Digitalt hittegods för skolor</p>
        <blockquote className="max-w-lg">
          <p className="text-3xl font-medium leading-tight tracking-tight">Färre överfulla lådor. Fler saker tillbaka hos rätt person.</p>
          <footer className="mt-6 text-sm text-emerald-200">En enkel och trygg överblick för hela skolan.</footer>
        </blockquote>
      </aside>
    </main>
  );
}

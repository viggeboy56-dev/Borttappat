import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Brand } from "@/components/brand";
import { getAuthState } from "@/lib/auth/server";

export const metadata: Metadata = { title: "Kontot behöver kopplas" };

export default async function OnboardingPage() {
  const state = await getAuthState();

  if (state.status === "unauthenticated") redirect("/login");
  if (state.status === "authenticated") redirect("/dashboard");

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f7f5] px-5 py-10">
      <section className="w-full max-w-lg rounded-xl border border-zinc-200 bg-white p-6 shadow-sm shadow-zinc-200/30 sm:p-8">
        <Brand href="/onboarding" />
        <p className="mt-10 text-sm font-semibold text-amber-800">Kontot är inte färdigkonfigurerat</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-zinc-950">Din användare saknar en giltig skolprofil</h1>
        <p className="mt-3 text-sm leading-6 text-zinc-600">
          Du är inloggad, men kontot har ännu inte kopplats till en skola och roll. Ingen skoldata har gjorts tillgänglig. Kontakta skolans administratör.
        </p>
        <form action="/auth/signout" method="post" className="mt-7">
          <button className="rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-800 hover:bg-zinc-50 focus-visible:outline-2 focus-visible:outline-emerald-700">
            Logga ut
          </button>
        </form>
      </section>
    </main>
  );
}

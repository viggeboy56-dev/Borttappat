"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function InviteAcceptance({ token, email, fullName, schoolName, role, signedIn }: { token: string; email: string; fullName: string; schoolName: string; role: "staff" | "member" | "school_admin"; signedIn: boolean }) {
  const router = useRouter();
  const [mode, setMode] = useState<"signup" | "signin">("signup");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function accept() {
    const response = await fetch("/api/invitations/accept", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) });
    const result = (await response.json()) as { error?: string };
    if (!response.ok) throw new Error(result.error ?? "Inbjudan kunde inte accepteras.");
    router.replace("/dashboard");
    router.refresh();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setError(""); setNotice("");
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    try {
      const supabase = createClient();
      if (mode === "signin") {
        const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
        if (authError) throw authError;
        await accept();
      } else {
        const confirmationUrl = new URL("/auth/confirm", window.location.origin);
        confirmationUrl.searchParams.set("next", window.location.pathname);
        const { data, error: authError } = await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName }, emailRedirectTo: confirmationUrl.toString() } });
        if (authError) throw authError;
        if (!data.session) { setNotice("Kontrollera din e-post och öppna bekräftelselänken. Gå sedan tillbaka till den här inbjudan."); return; }
        await accept();
      }
    } catch (caught) {
      const message = caught instanceof Error ? caught.message.toLowerCase() : "";
      if (message.includes("invalid login")) setError("Fel lösenord för kontot.");
      else if (message.includes("already registered")) setError("Det finns redan ett konto. Välj Logga in i stället.");
      else if (message.includes("email") && message.includes("match")) setError("Du måste vara inloggad med e-postadressen i inbjudan.");
      else setError("Inbjudan kunde inte accepteras. Kontrollera uppgifterna och försök igen.");
    } finally { setLoading(false); }
  }

  if (signedIn) return <div className="mt-7"><button disabled={loading} onClick={() => { setLoading(true); setError(""); void accept().catch(() => setError("Inbjudan kunde inte accepteras. Kontrollera att du är inloggad med rätt e-postadress.")).finally(() => setLoading(false)); }} className="min-h-11 w-full rounded-lg bg-emerald-800 px-4 text-sm font-semibold text-white disabled:opacity-60">{loading ? "Kopplar kontot…" : "Acceptera inbjudan"}</button>{error ? <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p> : null}</div>;

  return <div className="mt-7"><div className="grid grid-cols-2 rounded-lg bg-zinc-100 p-1"><button onClick={() => setMode("signup")} className={`min-h-10 rounded-md text-sm font-semibold ${mode === "signup" ? "bg-white shadow-sm" : "text-zinc-600"}`}>Skapa konto</button><button onClick={() => setMode("signin")} className={`min-h-10 rounded-md text-sm font-semibold ${mode === "signin" ? "bg-white shadow-sm" : "text-zinc-600"}`}>Logga in</button></div><form onSubmit={handleSubmit} className="mt-5 space-y-4"><label className="block text-sm font-medium text-zinc-800">Namn<input value={fullName} readOnly className="mt-1 block min-h-11 w-full rounded-lg border border-zinc-200 bg-zinc-100 px-3 text-zinc-600" /></label><label className="block text-sm font-medium text-zinc-800">E-post<input value={email} readOnly className="mt-1 block min-h-11 w-full rounded-lg border border-zinc-200 bg-zinc-100 px-3 text-zinc-600" /></label><label className="block text-sm font-medium text-zinc-800">Lösenord<input name="password" type="password" required minLength={8} className="mt-1 block min-h-11 w-full rounded-lg border border-zinc-300 px-3" autoComplete={mode === "signup" ? "new-password" : "current-password"} /></label>{error ? <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p> : null}{notice ? <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900">{notice}</p> : null}<button disabled={loading} className="min-h-11 w-full rounded-lg bg-emerald-800 px-4 text-sm font-semibold text-white disabled:opacity-60">{loading ? "Arbetar…" : mode === "signup" ? "Skapa konto och gå med" : "Logga in och gå med"}</button></form><p className="mt-4 text-xs leading-5 text-zinc-500">Kontot kopplas till {schoolName} som {role === "school_admin" ? "administratör" : role === "staff" ? "personal" : "medlem"}. Namn, skola och roll kommer från inbjudan.</p></div>;
}

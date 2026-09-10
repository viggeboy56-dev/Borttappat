"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function MemberOnboardingControl({schoolId,schoolSlug,enabled,rotatedAt}:{schoolId:string;schoolSlug:string;enabled:boolean;rotatedAt:string|null}){
  const router=useRouter();
  const [busy,setBusy]=useState(false),[error,setError]=useState(""),[newCode,setNewCode]=useState(""),[copied,setCopied]=useState<"link"|"code"|null>(null);
  const joinPath=`/join/${schoolSlug}`;
  async function act(action:"enable"|"rotate"|"disable"){
    setBusy(true);setError("");setNewCode("");
    const response=await fetch(`/api/operator/schools/${schoolId}/member-onboarding`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action})});
    const result=await response.json() as {code?:string|null;error?:string};setBusy(false);
    if(!response.ok){setError(result.error??"Inställningen kunde inte ändras.");return;}
    if(result.code)setNewCode(result.code);
    router.refresh();
  }
  async function copy(value:string,kind:"link"|"code"){await navigator.clipboard.writeText(value);setCopied(kind)}
  return <section className="mb-7 rounded-xl border border-zinc-200 bg-white p-5">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-semibold">Medlemsanslutning</h2><p className="mt-1 text-sm text-zinc-600">Skolan delar en medlemslänk och skolkod med föräldrar och elever.</p></div><span className={`rounded-full px-3 py-1 text-xs font-semibold ${enabled?"bg-emerald-100 text-emerald-900":"bg-zinc-100 text-zinc-600"}`}>{enabled?"Aktiv":"Inaktiverad"}</span></div>
    <div className="mt-4 rounded-lg bg-zinc-50 p-4"><p className="text-xs font-semibold uppercase text-zinc-500">Medlemslänk</p><p className="mt-1 break-all text-sm text-zinc-800">{joinPath}</p><button type="button" onClick={()=>void copy(`${window.location.origin}${joinPath}`,"link")} className="mt-2 min-h-10 rounded-lg border border-zinc-300 px-3 text-sm font-semibold">{copied==="link"?"Kopierad":"Kopiera länk"}</button></div>
    {newCode?<div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4"><p className="font-semibold text-emerald-950">Ny skolkod</p><p className="mt-1 font-mono text-lg tracking-wider text-emerald-950">{newCode}</p><p className="mt-1 text-xs text-emerald-800">Koden visas bara nu. Kopiera den innan du lämnar sidan.</p><button type="button" onClick={()=>void copy(newCode,"code")} className="mt-2 min-h-10 rounded-lg border border-emerald-700 px-3 text-sm font-semibold text-emerald-900">{copied==="code"?"Kopierad":"Kopiera kod"}</button></div>:null}
    {rotatedAt&&!newCode?<p className="mt-3 text-xs text-zinc-500">Koden finns lagrad som hash och kan inte visas. Senast bytt {new Intl.DateTimeFormat("sv-SE",{dateStyle:"medium"}).format(new Date(rotatedAt))}.</p>:null}
    <div className="mt-4 flex flex-wrap gap-2">{enabled?<><button type="button" disabled={busy} onClick={()=>void act("rotate")} className="min-h-11 rounded-lg bg-emerald-800 px-4 text-sm font-semibold text-white disabled:opacity-60">{busy?"Arbetar…":"Byt kod"}</button><button type="button" disabled={busy} onClick={()=>void act("disable")} className="min-h-11 rounded-lg border border-zinc-300 px-4 text-sm font-semibold disabled:opacity-60">Inaktivera</button></>:<button type="button" disabled={busy} onClick={()=>void act("enable")} className="min-h-11 rounded-lg bg-emerald-800 px-4 text-sm font-semibold text-white disabled:opacity-60">{busy?"Aktiverar…":"Aktivera och skapa kod"}</button>}</div>
    {error?<p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>:null}
  </section>;
}

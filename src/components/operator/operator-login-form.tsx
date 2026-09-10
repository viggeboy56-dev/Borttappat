"use client";
import { useState,type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function OperatorLoginForm(){
  const router=useRouter(); const [loading,setLoading]=useState(false); const [error,setError]=useState("");
  async function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();setLoading(true);setError("");const form=new FormData(event.currentTarget);const {error:authError}=await createClient().auth.signInWithPassword({email:String(form.get("email")??"").trim(),password:String(form.get("password")??"")});setLoading(false);if(authError){setError("Inloggningen misslyckades.");return;}router.replace("/operator/schools");router.refresh();}
  return <form onSubmit={submit} className="mt-7 space-y-4"><label className="block text-sm font-medium">E-post<input name="email" type="email" required autoComplete="email" className="mt-1 block min-h-11 w-full rounded-lg border border-zinc-300 px-3" /></label><label className="block text-sm font-medium">Lösenord<input name="password" type="password" required autoComplete="current-password" className="mt-1 block min-h-11 w-full rounded-lg border border-zinc-300 px-3" /></label>{error?<p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>:null}<button disabled={loading} className="min-h-11 w-full rounded-lg bg-emerald-800 px-4 text-sm font-semibold text-white disabled:opacity-60">{loading?"Loggar in…":"Logga in som operatör"}</button></form>;
}
